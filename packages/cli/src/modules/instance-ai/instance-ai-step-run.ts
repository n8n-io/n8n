import type {
	AiAgentRequest,
	FromAIArgument,
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	IPinData,
	IRunData,
	ITaskData,
} from 'n8n-workflow';
import {
	mapConnectionsByDestination,
	MCP_CLIENT_TOOL_NODE_TYPE,
	NodeConnectionTypes,
	nodeNameToToolName,
	traverseNodeParameters,
} from 'n8n-workflow';

import { MCP_REGISTRY_PACKAGE_NAME } from '@/modules/mcp-registry/mcp-registry-connection';

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
	/**
	 * Root nodes the target runs through, when the target is a sub-node. Absent
	 * for a normal node, which is its own root.
	 */
	rootNodeNames?: string[];
	/**
	 * Set when the caller asked to replay an earlier execution, the reused run
	 * data does not cover the path, and a run would execute real nodes above the
	 * target. The caller must refuse the run instead of silently downgrading it.
	 *
	 * Mocked input has no such case. It mocks the direct parents of the roots and
	 * walks up from there, which is the same walk `collectAncestorNames` makes,
	 * so a target with a node above it always has something to mock.
	 */
	unhonoredInput?: {
		requested: 'reused-execution';
		upstreamNodeNames: string[];
	};
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

/** One outbound edge of a node, after disabled nodes are skipped. */
interface ChildEdge {
	node: INode;
	/** Output of this node that feeds the edge. */
	outputIndex: number;
}

/**
 * Direct main-connection children of `nodeName`, the mirror of
 * `directParents`. A disabled node is transparent here too: the engine joins
 * its parents to its children, and the joined edge keeps the *parent's* output
 * index.
 */
function directChildren(
	connections: IConnections,
	nodesByName: Map<string, INode>,
	nodeName: string,
	outputIndex?: number,
	seen: Set<string> = new Set(),
): ChildEdge[] {
	if (seen.has(nodeName)) return [];
	seen.add(nodeName);

	const outputs = connections[nodeName]?.[NodeConnectionTypes.Main] ?? [];
	const edges: ChildEdge[] = [];

	for (const [index, output] of outputs.entries()) {
		for (const connection of output ?? []) {
			const child = nodesByName.get(connection.node);
			if (!child) continue;
			const carriedBy = outputIndex ?? index;
			if (child.disabled) {
				edges.push(...directChildren(connections, nodesByName, child.name, carriedBy, seen));
				continue;
			}
			edges.push({ node: child, outputIndex: carriedBy });
		}
	}

	return edges;
}

/**
 * Nodes this one feeds through a non-main connection — a sub-node's link to the
 * node that runs it (`ai_tool` to an Agent, `ai_embedding` to a Vector Store).
 * Sorted, so a tool on two agents resolves the same way on every call.
 */
function nonMainChildren(
	connections: IConnections,
	nodesByName: Map<string, INode>,
	nodeName: string,
): string[] {
	const children = new Set<string>();

	for (const [type, outputs] of Object.entries(connections[nodeName] ?? {})) {
		if (type === NodeConnectionTypes.Main) continue;
		for (const output of outputs ?? []) {
			for (const connection of output ?? []) {
				if (nodesByName.has(connection.node)) children.add(connection.node);
			}
		}
	}

	return [...children].sort();
}

/**
 * The nodes whose main ancestry a step run has to cover.
 *
 * A sub-node has no main input of its own. The engine never runs one on its
 * own either: `rewireGraph` replaces the root node (the Agent) with a virtual
 * Tool Executor that inherits *the root node's* main parents, and runs the
 * sub-node from there. So the nodes that need run data are the root node's
 * ancestors, not the sub-node's — it has none, and planning from the sub-node
 * finds nothing to mock and falls back to a chain run that executes the real
 * nodes above the Agent.
 *
 * Normal nodes are their own root, so this returns `[targetName]` for them.
 * A sub-node on several roots returns all of them: `rewireGraph` picks one, and
 * covering every candidate keeps the plan correct whichever it picks — unless
 * one root sits above another, which `findRootsAboveOtherRoots` detects.
 */
export function resolveStepRunRoots(
	nodes: INode[],
	connections: IConnections,
	targetName: string,
): string[] {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const connectionsByDestination = mapConnectionsByDestination(connections);

	const roots = new Set<string>();
	const seen = new Set<string>([targetName]);
	const queue = [targetName];

	while (queue.length > 0) {
		const current = queue.shift() as string;

		// A main input means the node sits in the main graph and is its own root.
		if (directParents(connectionsByDestination, nodesByName, current).length > 0) {
			roots.add(current);
			continue;
		}

		const parents = nonMainChildren(connections, nodesByName, current);
		if (parents.length === 0) {
			// A trigger, an orphan, or a sub-node with nothing to run it.
			roots.add(current);
			continue;
		}

		for (const parent of parents) {
			if (seen.has(parent)) continue;
			seen.add(parent);
			queue.push(parent);
		}
	}

	return [...roots];
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
	/** Where to start walking up. Defaults to the target; see `resolveStepRunRoots`. */
	rootNames?: string[];
}): { runData: IRunData; mockedNodeNames: string[] } {
	const { nodes, connections, targetName, mockItems } = args;
	const rootNames = args.rootNames ?? [targetName];
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const connectionsByDestination = mapConnectionsByDestination(connections);

	const runData: IRunData = {};
	const mockedNodeNames: string[] = [];
	let executionIndex = 0;

	// Breadth-first up the graph. `visited` is keyed by node name, so a node
	// feeding several paths is written once — the first (shallowest) edge wins,
	// which is the edge closest to the target.
	const visited = new Set<string>([targetName]);
	let frontier: ParentEdge[] = rootNames.flatMap((rootName) =>
		directParents(connectionsByDestination, nodesByName, rootName),
	);
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
	/** Where to start walking up. Defaults to the target; see `resolveStepRunRoots`. */
	rootNames: string[] = [targetName],
): string[] {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const connectionsByDestination = mapConnectionsByDestination(connections);

	// The target is never its own ancestor, even when an edge loops back to it.
	// It runs either way, and `buildMockedStepRunData` skips it for the same
	// reason — the two walks have to agree, or a plan can report a node above
	// the target that it never mocked.
	const ancestors = new Set<string>();
	const visited = new Set<string>([targetName]);
	const queue = [...rootNames];

	while (queue.length > 0) {
		const current = queue.shift() as string;
		for (const edge of directParents(connectionsByDestination, nodesByName, current)) {
			if (visited.has(edge.node.name)) continue;
			visited.add(edge.node.name);
			ancestors.add(edge.node.name);
			queue.push(edge.node.name);
		}
	}

	return [...ancestors];
}

/**
 * The roots of a shared sub-node that sit above another of its roots.
 *
 * `rewireGraph` stands in for one root only. When it picks a lower one, a root
 * above it stays in the run with its edge to the sub-node, so `cleanRunData`
 * treats that root as a child of the dirty target. It then drops the run data
 * of that root and of every node between it and the chosen root, and the
 * engine runs them for real. Roots on parallel branches never enter the run,
 * so this returns nothing for them.
 */
export function findRootsAboveOtherRoots(
	nodes: INode[],
	connections: IConnections,
	rootNames: string[],
): string[] {
	if (rootNames.length < 2) return [];

	const above = new Set<string>();
	for (const rootName of rootNames) {
		const ancestors = new Set(collectAncestorNames(nodes, connections, rootName));
		for (const other of rootNames) {
			if (other !== rootName && ancestors.has(other)) above.add(other);
		}
	}

	return rootNames.filter((name) => above.has(name));
}

/**
 * Whether an earlier run left items on one output of a node. Mirrors the
 * engine's `getIncomingDataFromAnyRun`: any run of the node counts, and an
 * empty output does not. The engine follows only the outputs that carried
 * items, so an untaken IF branch never runs on a replay.
 */
function outputCarriedItems(runData: IRunData, nodeName: string, outputIndex: number): boolean {
	return (runData[nodeName] ?? []).some(
		(task) => (task.data?.[NodeConnectionTypes.Main]?.[outputIndex] ?? []).length > 0,
	);
}

/**
 * The nodes above the target that a replay of `runData` would still execute
 * for real.
 *
 * Having run data for *some* ancestor is not enough. The engine walks down
 * from the trigger and makes the first node with no run data a start node, so
 * a gap anywhere on the path puts that node and everything after it back in
 * the run. A gap at the trigger is the worst case: the whole chain runs again.
 *
 * This walk answers the same question the engine asks, with the same two
 * rules: a node with run data or pin data is clean, and only an output that
 * carried items leads anywhere. It therefore accepts the replays the engine
 * can honour — an untaken branch above the target needs no data, and a second
 * trigger the earlier run never fired needs none either, because the engine
 * prefers the trigger that has run data.
 */
export function findUncoveredAncestors(args: {
	nodes: INode[];
	connections: IConnections;
	targetName: string;
	rootNames: string[];
	runData: IRunData;
	pinnedNodeNames?: string[];
}): string[] {
	const { nodes, connections, targetName, rootNames, runData } = args;
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const connectionsByDestination = mapConnectionsByDestination(connections);
	const pinned = new Set(args.pinnedNodeNames ?? []);

	const ancestors = new Set(collectAncestorNames(nodes, connections, targetName, rootNames));
	if (ancestors.size === 0) return [];

	const isClean = (name: string) => runData[name] !== undefined || pinned.has(name);

	// A run starts at a trigger. When the one the engine would pick has no data
	// of its own it re-runs, and takes every node under it along.
	const sources = [...ancestors].filter(
		(name) => directParents(connectionsByDestination, nodesByName, name).length === 0,
	);
	const startPoints = sources.filter(isClean);
	if (startPoints.length === 0) return [...ancestors];

	const uncovered = new Set<string>();
	const seen = new Set<string>(startPoints);
	const queue = [...startPoints];
	const stopAt = new Set([...rootNames, targetName]);

	while (queue.length > 0) {
		const current = queue.shift() as string;

		for (const edge of directChildren(connections, nodesByName, current)) {
			const child = edge.node.name;
			// The root runs by design — it is the node the target runs through — and
			// a node off the path to the target is not part of the run at all.
			if (stopAt.has(child) || !ancestors.has(child)) continue;
			// A pinned node feeds every output, so the engine always walks on.
			if (!pinned.has(current) && !outputCarriedItems(runData, current, edge.outputIndex)) continue;

			if (!isClean(child)) {
				uncovered.add(child);
				continue;
			}
			if (seen.has(child)) continue;
			seen.add(child);
			queue.push(child);
		}
	}

	return [...uncovered];
}

/**
 * Chooses the run data for a step run.
 *
 * - `mockItems` given → mock the path (mode `mocked`).
 * - `priorRunData` given (even empty) → replay it and mark the target dirty so
 *   it runs again
 *   (mode `reused-execution`). The engine's `cleanRunData` drops the target and
 *   everything downstream of it, so stale output cannot survive the run.
 * - neither → leave the run data unset and let the engine run the chain
 *   (mode `chain`), which is what the canvas "Execute step" does.
 *
 * A sub-node target is planned through its root node — see
 * `resolveStepRunRoots`. When a requested mode cannot be honoured and the
 * target has real nodes above it, the plan says so in `unhonoredInput` rather
 * than falling back to a chain run that would execute them.
 */
export function planStepRun(args: {
	nodes: INode[];
	connections: IConnections;
	targetName: string;
	mockItems?: INodeExecutionData[];
	priorRunData?: IRunData;
	/** Nodes the workflow pins. A pinned node is clean, so a replay may skip it. */
	pinnedNodeNames?: string[];
}): StepRunPlan & { inputMode: StepRunInputMode } {
	const { nodes, connections, targetName, mockItems, priorRunData } = args;

	// A sub-node runs through its root node, so the run data has to cover the
	// root's ancestry. Planning from the sub-node itself finds no main parent.
	const rootNames = resolveStepRunRoots(nodes, connections, targetName);
	const throughRoots =
		rootNames.length === 1 && rootNames[0] === targetName
			? undefined
			: { rootNodeNames: rootNames };

	if (mockItems !== undefined) {
		const { runData, mockedNodeNames } = buildMockedStepRunData({
			nodes,
			connections,
			targetName,
			mockItems,
			rootNames,
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
				...throughRoots,
			};
		}
	}

	const ancestors = collectAncestorNames(nodes, connections, targetName, rootNames);

	// Nodes the replay leaves for the engine to run for real. Empty means the
	// reused execution covers every node the run would otherwise execute.
	let uncovered: string[] = [];

	if (priorRunData !== undefined) {
		const ancestorNames = new Set(ancestors);
		const reusedNodeNames = Object.keys(priorRunData).filter((name) => ancestorNames.has(name));
		uncovered = findUncoveredAncestors({
			nodes,
			connections,
			targetName,
			rootNames,
			runData: priorRunData,
			pinnedNodeNames: args.pinnedNodeNames,
		});

		if (reusedNodeNames.length > 0 && uncovered.length === 0) {
			return {
				inputMode: 'reused-execution',
				runData: priorRunData,
				dirtyNodeNames: [targetName],
				mockedNodeNames: [],
				reusedNodeNames,
				...throughRoots,
			};
		}
	}

	// The chain is the intended mode only when the caller asked for it. Reaching
	// it after a request to replay an execution means the plan could not keep the
	// nodes above the target from running, and those nodes write to real systems
	// — report it instead of running them.
	//
	// A request for mocked input cannot reach here with work left to refuse:
	// mocking walks the same edges as `collectAncestorNames`, so it mocks nothing
	// only when the target has nothing above it, and then a chain run is what the
	// caller wanted anyway.
	return {
		inputMode: 'chain',
		mockedNodeNames: [],
		reusedNodeNames: [],
		...throughRoots,
		...(priorRunData !== undefined && ancestors.length > 0
			? {
					unhonoredInput: {
						requested: 'reused-execution',
						// Name the nodes that would really run, which is the part of the
						// ancestry the reused execution does not cover.
						upstreamNodeNames: uncovered.length > 0 ? uncovered : ancestors,
					},
				}
			: {}),
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
 * Node types that supply a toolkit — several tools behind one node — rather than
 * one tool.
 *
 * A step run cannot target one of these. The Tool Executor runs the member whose
 * name matches the agent request and skips every other, and that name is not the
 * server's tool name: `buildMcpToolName` prefixes it with the node's name and
 * caps the result at 64 characters. Resolving it needs the server's tool list
 * and a rule that lives in the nodes package, and a name that misses matches
 * nothing — the run then reports success with no result and no error.
 */
const TOOLKIT_NODE_TYPES = new Set<string>([MCP_CLIENT_TOOL_NODE_TYPE]);

/**
 * The MCP registry saves a server as its own node type, `@n8n/mcp-registry.<slug>`,
 * and routes every one of them to a single hidden runtime class. So the match is
 * on the package, the way `agents-tools.service.ts` decides the same question:
 * the class name never appears as a node type, and each slug is a type of its own.
 */
const MCP_REGISTRY_NODE_TYPE_PREFIX = `${MCP_REGISTRY_PACKAGE_NAME}.`;

/** Whether this node holds several tools instead of one. */
export function isToolkitNode(node: INode): boolean {
	return TOOLKIT_NODE_TYPES.has(node.type) || node.type.startsWith(MCP_REGISTRY_NODE_TYPE_PREFIX);
}

/** Arguments a tool node expects an agent to fill, from its `$fromAI` calls. */
export function declaredToolArguments(node: INode): string[] {
	const collected: FromAIArgument[] = [];
	traverseNodeParameters(node.parameters, collected);
	return [...new Set(collected.map((argument) => argument.key))];
}

/**
 * Parameters that hold a tool's name on the versions that take it from the
 * node's configuration instead of its name: `name` on Code Tool <= 1.1, Vector
 * Store Tool <= 1 and Workflow Tool <= 2.1, `toolName` on a vector store in
 * retrieve-as-tool mode < 1.3.
 */
const TOOL_NAME_PARAMETERS = ['name', 'toolName'];

/**
 * The agent request that gives a tool its arguments.
 *
 * `rewireGraph` copies this onto the virtual Tool Executor, which looks the
 * arguments up by the tool's *runtime* name. That name is
 * `nodeNameToToolName(node)` on current tool versions, but older ones read it
 * from a parameter and Think 1 hardcodes `thinking_tool`. Guessing it would
 * need every node's version rule, and those rules live in the nodes package.
 *
 * So the request names no tool. The Tool Executor runs the only tool the
 * rewired graph connects to it when the request leaves the name empty, which
 * takes the runtime name out of the decision to run at all. The arguments are
 * keyed under every name the tool can have, so the lookup finds them whichever
 * one it uses. A name this cannot know (Think 1) costs the arguments, not the
 * run.
 *
 * A bare string is a valid argument set: a tool with one free-text input
 * (Wikipedia, Code Tool, a vector store used as a tool) takes the query
 * directly, not wrapped in an object.
 */
export function buildToolAgentRequest(args: {
	target: INode;
	toolArguments?: Record<string, unknown> | string;
}): AiAgentRequest {
	const { target } = args;
	const toolArguments = args.toolArguments ?? {};

	const names = new Set<string>([nodeNameToToolName(target.name), target.name]);
	for (const parameter of TOOL_NAME_PARAMETERS) {
		const configured = target.parameters?.[parameter];
		if (typeof configured === 'string' && configured !== '') names.add(configured);
	}

	return {
		query: Object.fromEntries([...names].map((name) => [name, toolArguments])),
		tool: { name: '' },
	};
}

/**
 * Converts caller-supplied plain objects into engine items. The cast mirrors
 * `sdkPinDataToRuntime`: the model hands us arbitrary JSON, and the engine
 * validates the deeper shape when the node reads it.
 */
export function toExecutionItems(items: Array<Record<string, unknown>>): INodeExecutionData[] {
	return items.map((json) => ({ json: (json ?? {}) as IDataObject }));
}
