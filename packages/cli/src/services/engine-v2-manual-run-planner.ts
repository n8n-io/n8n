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

		const onCycle = nodesOnCycles(graph);
		const seeded: SeededNode[] = [];
		for (const node of graph.getChildren(root)) {
			const outputs = this.outputsOf(node, runData, pinData);
			if (!outputs) continue;

			// A seeded step holds one pass, and a loop member runs once per pass.
			// TODO(CAT-4875): seed every iteration.
			if (onCycle.has(node)) {
				throw new UserError(
					`Node "${node.name}" is inside a loop, and engine v2 cannot reuse the results of a loop yet. Run the workflow from the trigger instead.`,
				);
			}
			seeded.push({ nodeId: node.id, outputs });
		}

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

		// One seeded step carries one pass. TODO(CAT-4875): seed every iteration.
		if (runs.length > 1) {
			throw new UserError(
				`Node "${node.name}" ran more than once, and engine v2 cannot reuse the results of a loop yet. Run the workflow from the trigger instead.`,
			);
		}

		const main = runs[0].data?.main;
		return main ? withoutNullSlots(main) : undefined;
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

/** Nodes on a cycle: in a component of more than one node, or connected to themselves. */
function nodesOnCycles(graph: DirectedGraph): Set<INode> {
	const onCycle = new Set<INode>();
	for (const component of graph.getStronglyConnectedComponents()) {
		if (component.size > 1) for (const node of component) onCycle.add(node);
	}
	for (const connection of graph.getConnections()) {
		if (connection.from === connection.to) onCycle.add(connection.from);
	}
	return onCycle;
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
