import { Service } from '@n8n/di';
import {
	cleanRunData,
	DirectedGraph,
	filterDisabledNodes,
	findStartNodes,
	findSubgraph,
	findTriggerForPartialExecution,
	handleCycles,
} from 'n8n-core';
import type {
	IConnections,
	IDestinationNode,
	INode,
	INodeExecutionData,
	IPinData,
	IRunData,
	ITaskData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { isTriggerNodeType, UserError, Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

/** A node the run does not execute, because the caller already holds its outputs. */
export interface SeededNode {
	nodeId: string;
	/** The loop pass the outputs belong to: 0 outside a loop. */
	iteration: number;
	outputs: INodeExecutionData[][];
}

/**
 * What a manual run sends to the data plane beyond a plain run from the
 * trigger: the workflow trimmed to the nodes the run needs, the node the graph
 * is rooted at, that node's outputs, and the nodes recorded as done at start.
 */
export interface ManualRunPlan {
	workflow: IWorkflowBase;
	triggerName: string;
	triggerOutputs: INodeExecutionData[][];
	seeded: SeededNode[];
}

/** v1's payload for a manual run with no trigger data: one slot, one empty item. */
const DEFAULT_MAIN_OUTPUT: INodeExecutionData[][] = [[{ json: {} }]];

/** The node that heads a loop engine v2 can run; the converter maps it to the batch step. */
const SPLIT_IN_BATCHES_TYPE = 'n8n-nodes-base.splitInBatches';
/** The output slot a Split In Batches node fills on every pass but its last. */
const LOOP_SLOT = 1;

/** v1 uses `null` for a slot it has no data for; an empty slot says the same to the engine. */
const withoutNullSlots = (main: Array<INodeExecutionData[] | null>): INodeExecutionData[][] =>
	main.map((slot) => slot ?? []);

/**
 * Plans a manual run for engine v2 with v1's partial-execution utilities.
 *
 * v1 answers three questions before a partial run: which node the run is
 * rooted at, which nodes lie between it and the destination, and which of
 * those already have usable outputs. Engine v2 needs the same three answers,
 * as a trimmed graph plus the steps it records as completed at start. The
 * utilities are reused as they are, so the answers match v1's.
 */
@Service()
export class EngineV2ManualRunPlanner {
	constructor(private readonly nodeTypes: NodeTypes) {}

	/** Whether the run needs more than a plain run from the trigger. */
	applies(data: IWorkflowExecutionDataProcess): boolean {
		if (data.executionMode !== 'manual') return false;
		if (data.runData !== undefined || data.destinationNode !== undefined) return true;

		// The trigger's own pinned data is its payload, so only other nodes count.
		const triggerName = data.triggerToStartFrom?.name;
		return Object.keys(data.pinData ?? {}).some((name) => name !== triggerName);
	}

	plan(data: IWorkflowExecutionDataProcess): ManualRunPlan {
		const workflow = this.toWorkflow(data);
		const pinData = data.pinData ?? {};
		const destination = this.resolveDestination(workflow, data.destinationNode);
		const root = this.resolveRoot(workflow, data, destination);

		// Disabled nodes go first, so a disabled node never cuts the subgraph short.
		let graph = filterDisabledNodes(DirectedGraph.fromWorkflow(workflow));
		if (destination) graph = findSubgraph({ graph, destination, trigger: root });

		const runData = destination
			? this.reusableRunData(graph, root, destination, data, pinData)
			: {};

		// After the start nodes are known: the destination decides what runs again,
		// but an exclusive run wants its parents run, not the destination itself.
		if (destination && data.destinationNode?.mode === 'exclusive') {
			graph.removeNode(destination);
		}

		const candidates = graph.getChildren(root);
		const loops = loopsIn(graph).filter((loop) => [...loop].every((node) => candidates.has(node)));
		const inLoop = new Set(loops.flatMap((loop) => [...loop]));

		const seeded: SeededNode[] = [];
		for (const node of candidates) {
			if (inLoop.has(node)) continue;
			const outputs = this.outputsOf(node, runData, pinData);
			if (outputs) seeded.push({ nodeId: node.id, iteration: 0, outputs });
		}
		for (const loop of loops) seeded.push(...this.loopSeeds(loop, runData, pinData));

		return {
			workflow: {
				...data.workflowData,
				// In the workflow's own order: the graph's order follows its traversal.
				nodes: data.workflowData.nodes.filter((node) => graph.hasNode(node.name)),
				connections: toConnections(graph),
			},
			triggerName: root.name,
			triggerOutputs: this.triggerOutputs(root, data, runData, pinData),
			seeded,
		};
	}

	private toWorkflow(data: IWorkflowExecutionDataProcess): Workflow {
		const { workflowData } = data;
		return new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			pinData: data.pinData,
			settings: workflowData.settings,
		});
	}

	private resolveDestination(
		workflow: Workflow,
		destinationNode: IDestinationNode | undefined,
	): INode | undefined {
		if (!destinationNode) return undefined;

		const destination = workflow.getNode(destinationNode.nodeName);
		if (!destination) {
			throw new UserError(`Could not find a node with the name ${destinationNode.nodeName}`);
		}
		if (destination.disabled) throw new UserError('Cannot execute a disabled node');
		return destination;
	}

	/**
	 * v1's choice: the trigger the caller named, else a parent trigger of the
	 * destination, else the nearest parent with run data (whose outputs then
	 * stand in for the trigger payload), else the workflow's sole trigger.
	 */
	private resolveRoot(
		workflow: Workflow,
		data: IWorkflowExecutionDataProcess,
		destination: INode | undefined,
	): INode {
		if (data.triggerToStartFrom) {
			const named = workflow.getNode(data.triggerToStartFrom.name);
			if (!named) throw new UserError(`Unknown trigger ${data.triggerToStartFrom.name}`);
			return named;
		}

		if (destination) {
			const trigger = findTriggerForPartialExecution(
				workflow,
				destination.name,
				data.runData ?? {},
			);
			if (trigger) return trigger;

			for (const name of workflow.getParentNodes(destination.name)) {
				const parent = workflow.getNode(name);
				if (parent && !parent.disabled && data.runData?.[name]) return parent;
			}

			throw new UserError("Connect a trigger and make sure it's enabled to run this node");
		}

		const triggers = Object.values(workflow.nodes).filter(
			(node) => node.disabled !== true && isTriggerNodeType(node.type),
		);
		if (triggers.length !== 1) throw new UserError('Select the trigger to start from');
		return triggers[0];
	}

	/** The run data v1 would not produce again: everything before the start nodes. */
	private reusableRunData(
		graph: DirectedGraph,
		root: INode,
		destination: INode,
		data: IWorkflowExecutionDataProcess,
		pinData: IPinData,
	): IRunData {
		if (data.runData === undefined) return {};

		const dirtyNodes = graph.getNodesByNames(data.dirtyNodeNames ?? []);
		let runData = cleanRunData(data.runData, graph, dirtyNodes);
		let startNodes = findStartNodes({ graph, trigger: root, destination, runData, pinData });
		startNodes = handleCycles(graph, startNodes, root);
		runData = cleanRunData(runData, graph, startNodes);

		return runData;
	}

	/** Pinned data wins over run data, as in v1's `recreateNodeExecutionStack`. */
	private outputsOf(
		node: INode,
		runData: IRunData,
		pinData: IPinData,
	): INodeExecutionData[][] | undefined {
		const pinned = pinData[node.name];
		const outputs = pinned
			? [withPairedItems(pinned)]
			: this.lastRunOutputs(node, runData[node.name]);
		if (!outputs) return undefined;

		assertNoBinaryData(node, outputs);
		return outputs;
	}

	private lastRunOutputs(
		node: INode,
		runs: ITaskData[] | undefined,
	): INodeExecutionData[][] | undefined {
		if (!runs?.length) return undefined;

		// Outside a loop a node has one pass, so a second run has no step to go to.
		if (runs.length > 1) {
			throw new UserError(
				`Node "${node.name}" ran more than once outside a loop, so engine v2 cannot reuse its results. Run the workflow from the trigger instead.`,
			);
		}

		const main = runs[0].data?.main;
		return main ? withoutNullSlots(main) : undefined;
	}

	/**
	 * Every pass of a loop the caller holds complete results for, or nothing
	 * when the loop has not run. v1 keeps a member's passes as its runs in
	 * order, so run i is pass i. The batch node runs once more than the body:
	 * its last run fires the done slot instead of the loop slot.
	 *
	 * The engine records a loop whole or not at all, so anything short of that
	 * is refused here with the node named: a pinned member, which v1 would pin
	 * on every pass; a loop that did not finish; and a member that skipped a
	 * pass, which v1's run data cannot place.
	 */
	private loopSeeds(loop: Set<INode>, runData: IRunData, pinData: IPinData): SeededNode[] {
		const members = [...loop];
		const pinned = members.find((node) => pinData[node.name]);
		if (pinned) {
			throw new UserError(
				`Node "${pinned.name}" has pinned data inside a loop, which engine v2 cannot use yet. Unpin it, or run the workflow from the trigger instead.`,
			);
		}
		if (!members.some((node) => runData[node.name]?.length)) return [];

		const batch = members.find((node) => node.type === SPLIT_IN_BATCHES_TYPE);
		const batchRuns = batch ? (runData[batch.name] ?? []) : [];
		if (!batch || batchRuns.length === 0) {
			throw new UserError(
				`The loop at "${members[0].name}" has incomplete results, and engine v2 can only reuse a loop that finished. Run the workflow from the trigger instead.`,
			);
		}

		const passes = batchRuns.length - 1;
		const fillsLoopSlot = (run: ITaskData) => Boolean(run.data?.main[LOOP_SLOT]?.length);
		if (batchRuns.some((run, index) => fillsLoopSlot(run) !== index < passes)) {
			throw new UserError(
				`The loop at "${batch.name}" did not finish, and engine v2 can only reuse a loop that finished. Run the workflow from the trigger instead.`,
			);
		}

		const seeds = batchRuns.map((run, iteration) => this.loopSeed(batch, iteration, run));
		for (const member of members) {
			if (member === batch) continue;
			const runs = runData[member.name] ?? [];
			if (runs.length !== passes) {
				throw new UserError(
					`Node "${member.name}" ran ${runs.length} times in the loop at "${batch.name}", which ran ${passes} passes, so engine v2 cannot reuse the loop's results. Run the workflow from the trigger instead.`,
				);
			}
			seeds.push(...runs.map((run, iteration) => this.loopSeed(member, iteration, run)));
		}
		return seeds;
	}

	private loopSeed(node: INode, iteration: number, run: ITaskData): SeededNode {
		const outputs = run.data?.main ? withoutNullSlots(run.data.main) : [];
		assertNoBinaryData(node, outputs);
		return { nodeId: node.id, iteration, outputs };
	}

	/**
	 * A payload the trigger just produced wins; else its pin, its run data, or
	 * v1's default. The fired payload's files are moved under the new run; the
	 * other two are reused like a seeded node's outputs, with the same limit.
	 */
	private triggerOutputs(
		root: INode,
		data: IWorkflowExecutionDataProcess,
		runData: IRunData,
		pinData: IPinData,
	): INodeExecutionData[][] {
		const fired = data.triggerToStartFrom?.data?.data?.main;
		if (fired) return withoutNullSlots(fired);

		const pinned = pinData[root.name];
		const main = runData[root.name]?.at(-1)?.data?.main;
		const outputs = pinned ? [pinned] : main ? withoutNullSlots(main) : DEFAULT_MAIN_OUTPUT;

		assertNoBinaryData(root, outputs);
		return outputs;
	}
}

/**
 * The files belong to the execution that wrote them, which the data plane
 * deletes with that execution. TODO(CAT-4876): move them under the new run.
 */
function assertNoBinaryData(node: INode, outputs: INodeExecutionData[][]): void {
	if (outputs.some((slot) => slot.some((item) => item.binary !== undefined))) {
		throw new UserError(
			`The results of "${node.name}" contain binary data, which engine v2 cannot reuse yet. Run the workflow from the trigger instead.`,
		);
	}
}

/**
 * Pinned data carries no lineage, and the node never runs to be given one. v1
 * pairs its items with the inputs of the same index after the pinned "run";
 * the same pairing is set here, since the step is recorded without running.
 */
function withPairedItems(items: INodeExecutionData[]): INodeExecutionData[] {
	return items.map((item, index) =>
		item.pairedItem === undefined ? { ...item, pairedItem: { item: index } } : item,
	);
}

/** Each cycle as its node set: a component of more than one node, or a node connected to itself. */
function loopsIn(graph: DirectedGraph): Array<Set<INode>> {
	const loops = graph.getStronglyConnectedComponents().filter((component) => component.size > 1);
	const inLoop = new Set(loops.flatMap((loop) => [...loop]));
	for (const connection of graph.getConnections()) {
		if (connection.from === connection.to && !inLoop.has(connection.from)) {
			loops.push(new Set([connection.from]));
		}
	}
	return loops;
}

function toConnections(graph: DirectedGraph): IConnections {
	const connections: IConnections = {};
	for (const connection of graph.getConnections()) {
		const byType = (connections[connection.from.name] ??= {});
		const slots = (byType[connection.type] ??= []);
		while (slots.length <= connection.outputIndex) slots.push([]);
		(slots[connection.outputIndex] ??= []).push({
			node: connection.to.name,
			type: connection.type,
			index: connection.inputIndex,
		});
	}
	return connections;
}
