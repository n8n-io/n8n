import type {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	IPinData,
	IRunData,
	ITaskData,
} from 'n8n-workflow';
import { mapConnectionsByDestination, NodeConnectionTypes } from 'n8n-workflow';

/**
 * Plans the run data an "execute step" run needs.
 *
 * The engine picks the nodes to run with `findStartNodes`, which walks *down*
 * from the trigger and stops at the first node that has neither run data nor
 * pin data. To run one node on its own, every node between the trigger and
 * that node must therefore carry run data. A single mocked parent is not
 * enough.
 *
 * This module builds that run data. It stays pure so the graph rules are
 * testable without an engine or a database.
 */

/** How the target node got its input. */
export type StepRunInputMode = 'chain' | 'reused-execution' | 'mocked';

export interface StepRunPlan {
	/**
	 * Run data for the engine. `undefined` runs the whole chain, because
	 * `ManualExecutionService.runManually` routes on `runData === undefined`.
	 */
	runData?: IRunData;
	/** Forces the target to re-run when the reused data already covers it. */
	dirtyNodeNames?: string[];
	/** Nodes whose output this plan invented. Never real evidence. */
	mockedNodeNames: string[];
	/** Nodes replaying output from an earlier execution. */
	reusedNodeNames: string[];
}

/** One inbound edge of a node, after disabled nodes are skipped. */
interface ParentEdge {
	node: INode;
	/** Output of the parent that feeds the edge. */
	outputIndex: number;
}

/**
 * Places `items` on `outputIndex` and leaves every earlier output empty, so a
 * branching parent (IF, Switch) only routes the run down the branch that
 * reaches the target.
 */
function taskDataOnOutput(
	items: INodeExecutionData[],
	outputIndex: number,
	executionIndex: number,
): ITaskData {
	const outputs: Array<INodeExecutionData[] | null> = [];
	for (let i = 0; i < outputIndex; i++) outputs.push([]);
	outputs.push(items);
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex,
		executionStatus: 'success',
		source: [],
		data: { [NodeConnectionTypes.Main]: outputs },
	};
}

/**
 * Direct main-connection parents of `nodeName`. A disabled node is transparent:
 * the engine's `filterDisabledNodes` removes it and joins its parents to its
 * children, so this walks through to the enabled node behind it.
 */
function directParents(
	connectionsByDestination: IConnections,
	nodesByName: Map<string, INode>,
	nodeName: string,
	seen: Set<string> = new Set(),
): ParentEdge[] {
	if (seen.has(nodeName)) return [];
	seen.add(nodeName);

	const inputs = connectionsByDestination[nodeName]?.[NodeConnectionTypes.Main] ?? [];
	const edges: ParentEdge[] = [];

	for (const input of inputs) {
		for (const connection of input ?? []) {
			const parent = nodesByName.get(connection.node);
			if (!parent) continue;
			if (parent.disabled) {
				edges.push(...directParents(connectionsByDestination, nodesByName, parent.name, seen));
				continue;
			}
			edges.push({ node: parent, outputIndex: connection.index });
		}
	}

	return edges;
}

/**
 * Builds run data that makes `targetName` the only node the engine re-runs.
 *
 * The direct parents emit `mockItems`. Every node further upstream emits one
 * placeholder item on the output that leads to the target, which keeps
 * `findStartNodes` walking down to the target instead of stopping earlier.
 *
 * The placeholders are the reason a mocked step is never real evidence: a
 * placeholder item on an upstream IF or Switch decides a branch that the real
 * data may decide the other way.
 */
export function buildMockedStepRunData(args: {
	nodes: INode[];
	connections: IConnections;
	targetName: string;
	mockItems: INodeExecutionData[];
}): { runData: IRunData; mockedNodeNames: string[] } {
	const { nodes, connections, targetName, mockItems } = args;
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const connectionsByDestination = mapConnectionsByDestination(connections);

	const runData: IRunData = {};
	const mockedNodeNames: string[] = [];
	let executionIndex = 0;

	// Breadth-first up the graph. `visited` is keyed by node name, so a node
	// feeding several paths is written once — the first (shallowest) edge wins,
	// which is the edge closest to the target.
	const visited = new Set<string>([targetName]);
	let frontier: ParentEdge[] = directParents(connectionsByDestination, nodesByName, targetName);
	let depth = 0;

	while (frontier.length > 0) {
		const next: ParentEdge[] = [];

		for (const edge of frontier) {
			if (visited.has(edge.node.name)) continue;
			visited.add(edge.node.name);

			// Only the direct parents carry the caller's items. Deeper ancestors
			// exist to keep the path "clean", so a placeholder is enough.
			const items = depth === 0 ? mockItems : [{ json: {} }];
			runData[edge.node.name] = [taskDataOnOutput(items, edge.outputIndex, executionIndex++)];
			mockedNodeNames.push(edge.node.name);

			next.push(...directParents(connectionsByDestination, nodesByName, edge.node.name));
		}

		frontier = next;
		depth++;
	}

	return { runData, mockedNodeNames };
}

/**
 * Names of the nodes that can reach `targetName` through main connections.
 * Used to report which reused nodes actually fed the step.
 */
export function collectAncestorNames(
	nodes: INode[],
	connections: IConnections,
	targetName: string,
): string[] {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const connectionsByDestination = mapConnectionsByDestination(connections);

	const seen = new Set<string>();
	const queue = [targetName];

	while (queue.length > 0) {
		const current = queue.shift() as string;
		for (const edge of directParents(connectionsByDestination, nodesByName, current)) {
			if (seen.has(edge.node.name)) continue;
			seen.add(edge.node.name);
			queue.push(edge.node.name);
		}
	}

	return [...seen];
}

/**
 * Chooses the run data for a step run.
 *
 * - `mockItems` given → mock the path (mode `mocked`).
 * - `priorRunData` given → replay it and mark the target dirty so it runs again
 *   (mode `reused-execution`). The engine's `cleanRunData` drops the target and
 *   everything downstream of it, so stale output cannot survive the run.
 * - neither → leave the run data unset and let the engine run the chain
 *   (mode `chain`), which is what the canvas "Execute step" does.
 */
export function planStepRun(args: {
	nodes: INode[];
	connections: IConnections;
	targetName: string;
	mockItems?: INodeExecutionData[];
	priorRunData?: IRunData;
}): StepRunPlan & { inputMode: StepRunInputMode } {
	const { nodes, connections, targetName, mockItems, priorRunData } = args;

	if (mockItems !== undefined) {
		const { runData, mockedNodeNames } = buildMockedStepRunData({
			nodes,
			connections,
			targetName,
			mockItems,
		});
		// A node with no enabled parent has nothing to mock. Running the chain
		// gives the engine a start point it accepts, instead of a partial run it
		// rejects for having no reachable root with run data.
		if (mockedNodeNames.length > 0) {
			return {
				inputMode: 'mocked',
				runData,
				dirtyNodeNames: [targetName],
				mockedNodeNames,
				reusedNodeNames: [],
			};
		}
	}

	if (priorRunData !== undefined && Object.keys(priorRunData).length > 0) {
		const ancestors = new Set(collectAncestorNames(nodes, connections, targetName));
		const reusedNodeNames = Object.keys(priorRunData).filter((name) => ancestors.has(name));

		// Reuse is only worth it when the prior run actually reached an ancestor.
		// Otherwise fall through to a chain run rather than start an execution
		// that the engine would reject for having no usable start point.
		if (reusedNodeNames.length > 0) {
			return {
				inputMode: 'reused-execution',
				runData: priorRunData,
				dirtyNodeNames: [targetName],
				mockedNodeNames: [],
				reusedNodeNames,
			};
		}
	}

	return {
		inputMode: 'chain',
		mockedNodeNames: [],
		reusedNodeNames: [],
	};
}

/**
 * Drops the pin data that would stop a step run from doing its job.
 *
 * A pinned node never executes — `isDirty` treats it as clean and
 * `getPinnedOutput` returns the pin — so a pinned target would make "run this
 * node" silently replay stale output instead. The same applies to a mocked
 * parent: `recreateNodeExecutionStack` prefers pin data over run data, so the
 * caller's mock input would lose to a leftover pin.
 *
 * Only this run's copy is affected. The saved workflow keeps its pins.
 */
export function pinDataForStepRun(
	workflowPinData: IPinData | undefined,
	args: { targetName: string; mockedNodeNames: string[] },
): IPinData | undefined {
	if (!workflowPinData) return undefined;

	const overridden = new Set([args.targetName, ...args.mockedNodeNames]);
	const kept = Object.entries(workflowPinData).filter(([nodeName]) => !overridden.has(nodeName));

	if (kept.length === Object.keys(workflowPinData).length) return workflowPinData;
	return Object.fromEntries(kept);
}

/**
 * Converts caller-supplied plain objects into engine items. The cast mirrors
 * `sdkPinDataToRuntime`: the model hands us arbitrary JSON, and the engine
 * validates the deeper shape when the node reads it.
 */
export function toExecutionItems(items: Array<Record<string, unknown>>): INodeExecutionData[] {
	return items.map((json) => ({ json: (json ?? {}) as IDataObject }));
}
