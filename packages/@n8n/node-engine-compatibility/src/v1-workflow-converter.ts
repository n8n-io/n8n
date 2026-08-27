import { isBatchStepConfig } from '@n8n/engine';
import type { BatchStepConfig, GraphEdge, GraphNode, WorkflowGraph } from '@n8n/engine';
import type { INode, INodeConnections, IWorkflowBase } from 'n8n-workflow';

import {
	DEFAULT_BATCH_SIZE,
	MAIN_CONNECTION_TYPE,
	MANUAL_TRIGGER_TYPE,
	MERGE_TYPE,
	SPLIT_IN_BATCHES_TYPE,
	SPLIT_IN_BATCHES_TYPE_VERSION,
} from './constants';
import {
	UnsupportedConnectionTypeError,
	UnsupportedCycleError,
	UnsupportedLoopEntryError,
	UnsupportedTriggerError,
	UnsupportedWorkflowError,
} from './errors';
import { isRecord } from './guards';
import type { V1NodeStepConfig } from './types';

/**
 * Common v1 trigger types that don't end in "Trigger". Non-exhaustive: combined
 * with the name heuristic below, it exists to reject unsupported triggers with a
 * clear message. A trigger we fail to recognise falls through to `v1-node` and
 * fails later with a less specific "node has no execute method" error.
 */
const KNOWN_TRIGGER_TYPES = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.cron']);

/**
 * Converts a v1 workflow (node-based JSON) into the Engine 2.0 `WorkflowGraph`.
 *
 * A pure, deterministic topology translation: it maps nodes and connections to
 * graph nodes and edges and never executes anything. Supported surface is kept
 * deliberately small (see the converter tests); unsupported constructs are
 * rejected with a clear error rather than silently mistranslated.
 *
 * Branching is purely structural, so an edge records which output slot feeds
 * which input slot, nothing more. Branches leaving the same node are
 * unordered, so the engine may run them in parallel. This deliberately
 * **diverges from v1**, which runs them one after another in connection order.
 * If branch B must run after branch A, that needs a connection from A to B.
 * We do not invent connections to force v1 order. If it is ever needed, the
 * engine can be made to support running branches one at a time.
 *
 * Disabled nodes never appear in the graph: every edge into their input
 * slot 0 is joined to every edge leaving them, so A -> disabled -> B becomes
 * A -> B, keeping A's `outputIndex` and B's `inputIndex`. Input slot 0 is
 * the only one joined because v1 passes nothing else through. On the way out
 * we keep edges from every output slot, deliberately **diverging from v1**,
 * where the pass-through data leaves on output 0 only.
 *
 * The only cycle allowed is a Split In Batches loop: items leave the batch
 * node, traverse the body, and return on an edge marked `isBackEdge`. We can
 * only tell which edge is the return when the sole way into a loop, at every
 * nesting level, is through its batch node. Hence cycles with no batch node,
 * loops entered mid-body, and loops with more than one candidate entry are
 * all rejected.
 */
export class V1WorkflowConverter {
	convert(workflow: IWorkflowBase): WorkflowGraph {
		const liveNodes = workflow.nodes.filter((node) => node.disabled !== true);
		const disabledNodeIds = workflow.nodes
			.filter((node) => node.disabled === true)
			.map((node) => node.id);

		const nodes = liveNodes.map((node) => this.toGraphNode(node));

		let edges = this.toEdges(workflow);
		edges = this.spliceOutDisabledNodes(edges, disabledNodeIds);
		edges = this.dedupeEdges(edges);
		this.markBackEdges(nodes, edges);

		return { nodes, edges };
	}

	private toGraphNode(node: INode): GraphNode {
		if (node.type === MANUAL_TRIGGER_TYPE) {
			return { id: node.id, name: node.name, type: 'trigger' };
		}

		if (this.isTriggerNode(node)) {
			throw new UnsupportedTriggerError(node.name, node.type);
		}

		if (node.onError === 'continueErrorOutput') {
			throw new UnsupportedWorkflowError(
				`Node "${node.name}" uses onError=continueErrorOutput, which is not supported yet.`,
			);
		}

		if (node.type === MERGE_TYPE) this.assertSupportedMergeMode(node);

		if (node.type === SPLIT_IN_BATCHES_TYPE) {
			return { id: node.id, name: node.name, type: 'batch', config: toBatchConfig(node) };
		}

		const config: V1NodeStepConfig = {
			nodeType: node.type,
			typeVersion: node.typeVersion,
			parameters: node.parameters,
			continueOnFail: node.continueOnFail === true || node.onError === 'continueRegularOutput',
		};

		return { id: node.id, name: node.name, type: 'v1-node', config };
	}

	/**
	 * chooseBranch waits for data on every input, but the engine runs a node
	 * once any input is live. An expression-valued mode could resolve to
	 * chooseBranch at run time (`noDataExpression` only binds the UI), so it
	 * is rejected too, except on Merge v1, which predates chooseBranch.
	 */
	private assertSupportedMergeMode(node: INode): void {
		const mode = node.parameters.mode;
		if (mode === 'chooseBranch') {
			throw new UnsupportedWorkflowError(
				`Node "${node.name}" uses Merge mode "chooseBranch", which is not supported yet.`,
			);
		}
		if (node.typeVersion >= 2 && typeof mode === 'string' && mode.startsWith('=')) {
			throw new UnsupportedWorkflowError(
				`Node "${node.name}" sets its Merge mode with an expression, which cannot be checked at conversion time. Use a literal mode.`,
			);
		}
	}

	/** Heuristic trigger detection — see {@link KNOWN_TRIGGER_TYPES}. */
	private isTriggerNode(node: INode): boolean {
		return (
			node.type === MANUAL_TRIGGER_TYPE ||
			KNOWN_TRIGGER_TYPES.has(node.type) ||
			node.type.toLowerCase().endsWith('trigger')
		);
	}

	private toEdges(workflow: IWorkflowBase): GraphEdge[] {
		const idsByName = new Map(workflow.nodes.map((node) => [node.name, node.id]));

		return Object.entries(workflow.connections).flatMap(([sourceName, connectionsByType]) =>
			this.toEdgesForSource(sourceName, connectionsByType, idsByName),
		);
	}

	/**
	 * v1 connections of one source node have the shape
	 * `{ main: [ [connection, ...], null, [connection, ...] ] }`: connections
	 * grouped by type, then by the source's output slot, where a slot with
	 * nothing connected may hold null.
	 */
	private toEdgesForSource(
		sourceName: string,
		connectionsByType: INodeConnections,
		idsByName: Map<string, string>,
	): GraphEdge[] {
		const from = idsByName.get(sourceName);
		const edges: GraphEdge[] = [];

		for (const [connectionType, outputSlots] of Object.entries(connectionsByType)) {
			this.validateSupportedConnectionType(sourceName, connectionType);

			for (let outputIndex = 0; outputIndex < outputSlots.length; outputIndex++) {
				for (const connection of outputSlots[outputIndex] ?? []) {
					this.validateSupportedConnectionType(sourceName, connection.type);

					const to = idsByName.get(connection.node);

					// v1 skips connections whose endpoint no longer exists, so dropping
					// them is the faithful translation
					if (from === undefined || to === undefined) continue;

					edges.push({ from, to, outputIndex, inputIndex: connection.index });
				}
			}
		}

		return edges;
	}

	private validateSupportedConnectionType(nodeName: string, connectionType: string): void {
		if (connectionType !== MAIN_CONNECTION_TYPE) {
			throw new UnsupportedConnectionTypeError(nodeName, connectionType);
		}
	}

	private spliceOutDisabledNodes(edges: GraphEdge[], disabledNodeIds: string[]): GraphEdge[] {
		for (const disabledNodeId of disabledNodeIds) {
			const incoming = edges.filter(
				(edge) =>
					edge.to === disabledNodeId && edge.from !== disabledNodeId && edge.inputIndex === 0,
			);
			const outgoing = edges.filter(
				(edge) => edge.from === disabledNodeId && edge.to !== disabledNodeId,
			);
			const spliced = incoming.flatMap((into) =>
				outgoing.map((outOf) => ({
					from: into.from,
					to: outOf.to,
					outputIndex: into.outputIndex,
					inputIndex: outOf.inputIndex,
				})),
			);

			edges = this.dedupeEdges(
				edges
					.filter((edge) => edge.from !== disabledNodeId && edge.to !== disabledNodeId)
					.concat(spliced),
			);
		}

		return edges;
	}

	private dedupeEdges(edges: GraphEdge[]): GraphEdge[] {
		const byKey = new Map<string, GraphEdge>();
		for (const edge of edges) {
			byKey.set(`${edge.from}|${edge.to}|${edge.outputIndex}|${edge.inputIndex}`, edge);
		}
		return [...byKey.values()];
	}

	/**
	 * Finds every loop, marks its return edges as `isBackEdge`, and rejects
	 * every other cycle, peeling loops from the outside in. Each round: group
	 * the nodes that can reach each other in a circle ({@link computeSccs}),
	 * require each group to have a single valid entry
	 * ({@link resolveSingleBatchEntry}), mark the group's edges into that
	 * entry as returns, and cut them. Cutting breaks the outer circle, so a
	 * nested loop surfaces as its own group in the next round. When nothing
	 * circular remains, every loop is marked.
	 *
	 * Example with a nested loop:
	 *
	 *   ┌───────┐   ┌─────┐    ┌─────┐    ┌──────────┐
	 *   │Trigger├──►│     ├───►│     ├───►│AfterInner│
	 *   └───────┘   │Outer│    │Inner│    └────┬─────┘
	 *               │     │    │     │ ┌────┐  │
	 *               │     │    │     ├►│Body│  │
	 *               └──▲──┘    └──▲──┘ └──┬─┘  │
	 *                  │          └(back)─┘    │
	 *                  └───────(back)──────────┘
	 *
	 *   Round 1 groups {Outer, Inner, Body, AfterInner} with entry Outer, then
	 *   marks and cuts AfterInner -> Outer. Round 2 groups {Inner, Body} with
	 *   entry Inner, then marks and cuts Body -> Inner. Round 3 finds nothing
	 *   circular and stops.
	 *
	 * Only set membership decides, never traversal order, so the outcome does
	 * not depend on node or edge order.
	 */
	private markBackEdges(nodes: GraphNode[], edges: GraphEdge[]): void {
		const batchNodeIds = new Set(nodes.filter((node) => node.type === 'batch').map((n) => n.id));
		const namesById = new Map(nodes.map((node) => [node.id, node.name]));

		let remaining = edges;
		while (remaining.length > 0) {
			const outgoingByNode = new Map<string, GraphEdge[]>();
			const selfLoopNodeIds = new Set<string>();
			for (const edge of remaining) {
				const outgoing = outgoingByNode.get(edge.from);
				if (outgoing) outgoing.push(edge);
				else outgoingByNode.set(edge.from, [edge]);
				if (edge.from === edge.to) selfLoopNodeIds.add(edge.from);
			}

			const cyclicSccs = this.computeSccs(nodes, outgoingByNode).filter(
				(members) => members.length > 1 || selfLoopNodeIds.has(members[0]),
			);
			if (cyclicSccs.length === 0) return;

			for (const members of cyclicSccs) {
				const entryId = this.resolveSingleBatchEntry(members, remaining, batchNodeIds, namesById);
				const memberSet = new Set(members);
				for (const edge of remaining) {
					if (edge.to === entryId && memberSet.has(edge.from)) edge.isBackEdge = true;
				}
			}

			remaining = remaining.filter((edge) => !edge.isBackEdge);
		}
	}

	/**
	 * A loop is convertible only when there is exactly one way into it from
	 * the outside and that way in is the batch node. Otherwise there is no
	 * single answer to which edge is the return. A loop that nothing points
	 * into has no outside entries, so its batch node stands in, provided it
	 * has exactly one.
	 */
	private resolveSingleBatchEntry(
		members: string[],
		edges: GraphEdge[],
		batchNodeIds: Set<string>,
		namesById: Map<string, string>,
	): string {
		const memberSet = new Set(members);
		const toNames = (ids: string[]) => ids.map((id) => namesById.get(id) ?? id);

		const batchMembers = members.filter((id) => batchNodeIds.has(id));
		if (batchMembers.length === 0) {
			throw new UnsupportedCycleError(toNames(members));
		}

		const externalEntries = new Set<string>();
		for (const edge of edges) {
			if (memberSet.has(edge.to) && !memberSet.has(edge.from)) externalEntries.add(edge.to);
		}

		const entries = externalEntries.size > 0 ? [...externalEntries] : batchMembers;
		if (entries.length !== 1 || !batchNodeIds.has(entries[0])) {
			throw new UnsupportedLoopEntryError(toNames(members), toNames(entries));
		}

		return entries[0];
	}

	/**
	 * Splits the nodes into groups (strongly connected components): two nodes
	 * share a group when you can walk from one to the other and back along
	 * edges, through any number of nodes. A -> B -> C -> A puts all three in
	 * one group. A node on no such round trip is a group of one, so a group
	 * with more than one member, or with a self-loop, is a cycle.
	 * Textbook Tarjan's algorithm, best reviewed against a reference:
	 * https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
	 */
	private computeSccs(nodes: GraphNode[], outgoingByNode: Map<string, GraphEdge[]>): string[][] {
		const indexById = new Map<string, number>();
		const lowlinkById = new Map<string, number>();
		const stack: string[] = [];
		const onStack = new Set<string>();
		const sccs: string[][] = [];
		let nextIndex = 0;

		const connect = (nodeId: string): void => {
			indexById.set(nodeId, nextIndex);
			lowlinkById.set(nodeId, nextIndex);
			nextIndex += 1;
			stack.push(nodeId);
			onStack.add(nodeId);

			for (const edge of outgoingByNode.get(nodeId) ?? []) {
				if (!indexById.has(edge.to)) {
					connect(edge.to);
					lowlinkById.set(nodeId, Math.min(lowlinkById.get(nodeId)!, lowlinkById.get(edge.to)!));
				} else if (onStack.has(edge.to)) {
					lowlinkById.set(nodeId, Math.min(lowlinkById.get(nodeId)!, indexById.get(edge.to)!));
				}
			}

			if (lowlinkById.get(nodeId) === indexById.get(nodeId)) {
				const members: string[] = [];
				let member: string;
				do {
					member = stack.pop()!;
					onStack.delete(member);
					members.push(member);
				} while (member !== nodeId);
				sccs.push(members);
			}
		};

		for (const node of nodes) {
			if (!indexById.has(node.id)) connect(node.id);
		}

		return sccs;
	}
}

function toBatchConfig(node: INode): BatchStepConfig {
	if (node.typeVersion !== SPLIT_IN_BATCHES_TYPE_VERSION) {
		throw new UnsupportedWorkflowError(
			`Node "${node.name}" is a Split In Batches of version ${node.typeVersion}, and only version ${SPLIT_IN_BATCHES_TYPE_VERSION} is supported.`,
		);
	}

	// Each pass slices a list fixed at the first pass, so nothing can restart a
	// loop halfway through.
	const options: unknown = node.parameters?.options;
	if (typeof options === 'string') {
		throw new UnsupportedWorkflowError(
			`Node "${node.name}" sets its options from an expression, which is not supported yet.`,
		);
	}

	const reset = isRecord(options) ? options.reset : undefined;
	if (reset !== undefined && reset !== false) {
		throw new UnsupportedWorkflowError(
			`Node "${node.name}" uses the reset option, which is not supported yet.`,
		);
	}

	const batchSize: unknown = node.parameters?.batchSize ?? DEFAULT_BATCH_SIZE;

	if (typeof batchSize === 'string') {
		throw new UnsupportedWorkflowError(
			`Node "${node.name}" sets its batch size from an expression, which is not supported yet.`,
		);
	}

	const config = { batchSize };

	if (!isBatchStepConfig(config)) {
		throw new UnsupportedWorkflowError(
			`Node "${node.name}" has a batch size of ${String(batchSize)}, and it must be a whole number of at least 1.`,
		);
	}

	return config;
}
