import * as a from 'assert';
import type {
	IConnections,
	INode,
	INodeExecutionData,
	IPinData,
	IRunData,
	WorkflowParameters,
} from 'n8n-workflow';
import { NodeConnectionType, Workflow } from 'n8n-workflow';

function findSubgraphRecursive(
	graph: DirectedGraph,
	destinationNode: INode,
	current: INode,
	trigger: INode,
	newGraph: DirectedGraph,
	currentBranch: Connection[],
) {
	//console.log('currentBranch', currentBranch);

	// If the current node is the chosen ‘trigger keep this branch.
	if (current === trigger) {
		console.log(`${current.name}: is trigger`);
		for (const connection of currentBranch) {
			newGraph.addNodes(connection.from, connection.to);
			newGraph.addConnection(connection);
		}

		return;
	}

	let parentConnections = graph.getDirectParents(current);

	// If the current node has no parents, don’t keep this branch.
	if (parentConnections.length === 0) {
		console.log(`${current.name}: no parents`);
		return;
	}

	// If the current node is the destination node again, don’t keep this branch.
	const isCycleWithDestinationNode =
		current === destinationNode && currentBranch.some((c) => c.to === destinationNode);
	if (isCycleWithDestinationNode) {
		console.log(`${current.name}: isCycleWithDestinationNode`);
		return;
	}

	// If the current node was already visited, keep this branch.
	const isCycleWithCurrentNode = currentBranch.some((c) => c.to === current);
	if (isCycleWithCurrentNode) {
		console.log(`${current.name}: isCycleWithCurrentNode`);
		// TODO: write function that adds nodes when adding connections
		for (const connection of currentBranch) {
			newGraph.addNodes(connection.from, connection.to);
			newGraph.addConnection(connection);
		}
		return;
	}

	// If the current node is disabled, don’t keep this node, but keep the
	// branch.
	// Take every incoming connection and connect it to every node that is
	// connected to the current node’s first output
	if (current.disabled) {
		console.log(`${current.name}: is disabled`);
		const incomingConnections = graph.getDirectParents(current);
		const outgoingConnections = graph
			.getDirectChildren(current)
			// NOTE: When a node is disabled only the first output gets data
			.filter((connection) => connection.outputIndex === 0);

		parentConnections = [];

		for (const incomingConnection of incomingConnections) {
			for (const outgoingConnection of outgoingConnections) {
				const newConnection = {
					...incomingConnection,
					to: outgoingConnection.to,
					inputIndex: outgoingConnection.inputIndex,
				};

				parentConnections.push(newConnection);
				currentBranch.pop();
				currentBranch.push(newConnection);
			}
		}
	}

	// Recurse on each parent.
	for (const parentConnection of parentConnections) {
		findSubgraphRecursive(graph, destinationNode, parentConnection.from, trigger, newGraph, [
			...currentBranch,
			parentConnection,
		]);
	}
}

function findAllParentTriggers(workflow: Workflow, destinationNode: string) {
	// Traverse from the destination node back until we found all trigger nodes.
	// Do this recursively, because why not.
	const parentNodes = workflow
		.getParentNodes(destinationNode)
		.map((name) => {
			const node = workflow.getNode(name);

			if (!node) {
				return null;
			}

			return {
				node,
				nodeType: workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion),
			};
		})
		.filter((value) => value !== null)
		.filter(({ nodeType }) => nodeType.description.group.includes('trigger'))
		.map(({ node }) => node);

	return parentNodes;
}

// TODO: write unit tests for this
export function findTriggerForPartialExecution(
	workflow: Workflow,
	destinationNode: string,
): INode | undefined {
	const parentTriggers = findAllParentTriggers(workflow, destinationNode).filter(
		(trigger) => !trigger.disabled,
	);
	const pinnedTriggers = parentTriggers
		// TODO: add the other filters here from `findAllPinnedActivators`
		.filter((trigger) => workflow.pinData?.[trigger.name])
		.sort((n) => (n.type.endsWith('webhook') ? -1 : 1));

	if (pinnedTriggers.length) {
		return pinnedTriggers[0];
	} else {
		return parentTriggers[0];
	}
}

//function findAllPinnedActivators(workflow: Workflow, pinData?: IPinData) {
//	return Object.values(workflow.nodes)
//		.filter(
//			(node) =>
//				!node.disabled &&
//				pinData?.[node.name] &&
//				['trigger', 'webhook'].some((suffix) => node.type.toLowerCase().endsWith(suffix)) &&
//				node.type !== 'n8n-nodes-base.respondToWebhook',
//		)
//		.sort((a) => (a.type.endsWith('webhook') ? -1 : 1));
//}

// TODO: deduplicate this with
// packages/cli/src/workflows/workflowExecution.service.ts
//function selectPinnedActivatorStarter(
//	workflow: Workflow,
//	startNodes?: string[],
//	pinData?: IPinData,
//) {
//	if (!pinData || !startNodes) return null;
//
//	const allPinnedActivators = findAllPinnedActivators(workflow, pinData);
//
//	if (allPinnedActivators.length === 0) return null;
//
//	const [firstPinnedActivator] = allPinnedActivators;
//
//	// full manual execution
//
//	if (startNodes?.length === 0) return firstPinnedActivator ?? null;
//
//	// partial manual execution
//
//	/**
//	 * If the partial manual execution has 2+ start nodes, we search only the zeroth
//	 * start node's parents for a pinned activator. If we had 2+ start nodes without
//	 * a common ancestor and so if we end up finding multiple pinned activators, we
//	 * would still need to return one to comply with existing usage.
//	 */
//	const [firstStartNodeName] = startNodes;
//
//	const parentNodeNames =
//		//new Workflow({
//		//		nodes: workflow.nodes,
//		//		connections: workflow.connections,
//		//		active: workflow.active,
//		//		nodeTypes: this.nodeTypes,
//		//	}).
//		workflow.getParentNodes(firstStartNodeName);
//
//	if (parentNodeNames.length > 0) {
//		const parentNodeName = parentNodeNames.find((p) => p === firstPinnedActivator.name);
//
//		return allPinnedActivators.find((pa) => pa.name === parentNodeName) ?? null;
//	}
//
//	return allPinnedActivators.find((pa) => pa.name === firstStartNodeName) ?? null;
//}

// TODO: implement dirty checking for options and properties and parent nodes
// being disabled
export function isDirty(node: INode, runData: IRunData = {}, pinData: IPinData = {}): boolean {
	//- it’s properties or options changed since last execution, or

	const propertiesOrOptionsChanged = false;

	if (propertiesOrOptionsChanged) {
		return true;
	}

	const parentNodeGotDisabled = false;

	if (parentNodeGotDisabled) {
		return true;
	}

	//- it has an error, or

	const hasAnError = false;

	if (hasAnError) {
		return true;
	}

	//- it does neither have run data nor pinned data

	const hasPinnedData = pinData[node.name] !== undefined;

	if (hasPinnedData) {
		return false;
	}

	const hasRunData = runData?.[node.name];

	if (hasRunData) {
		return false;
	}

	return true;
}

interface ISourceData {
	previousNode: INode;
	previousNodeOutput: number; // If undefined "0" gets used
	previousNodeRun: number; // If undefined "0" gets used
}
// TODO: This is how ISourceData should look like.
//interface NewSourceData {
//	connection: Connection;
//	previousNodeRun: number; // If undefined "0" gets used
//}

// TODO: rename to something more general, like path segment
export interface StartNodeData {
	node: INode;
	sourceData?: ISourceData;
}

//export function getDirectChildren(workflow: Workflow, parent: INode): StartNodeData[] {
//	const directChildren: StartNodeData[] = [];
//
//	for (const [_connectionGroupName, inputs] of Object.entries(
//		workflow.connectionsBySourceNode[parent.name] ?? {},
//	)) {
//		for (const [outputIndex, connections] of inputs.entries()) {
//			for (const connection of connections) {
//				const node = workflow.getNode(connection.node);
//
//				a.ok(node, `Node(${connection.node}) does not exist in workflow.`);
//
//				directChildren.push({
//					node,
//					sourceData: {
//						previousNode: parent,
//						previousNodeOutput: outputIndex,
//						// TODO: I don't have this here. This part is working without run
//						// data, so there are not runs.
//						previousNodeRun: 0,
//					},
//				});
//			}
//		}
//	}
//
//	return directChildren;
//}

export function getIncomingData(
	runData: IRunData,
	nodeName: string,
	runIndex: number,
	connectionType: NodeConnectionType,
	outputIndex: number,
): INodeExecutionData[] | null | undefined {
	a.ok(runData[nodeName], `Can't find node with name '${nodeName}' in runData.`);
	a.ok(
		runData[nodeName][runIndex],
		`Can't find a run for index '${runIndex}' for node name '${nodeName}'`,
	);
	a.ok(
		runData[nodeName][runIndex].data,
		`Can't find data for index '${runIndex}' for node name '${nodeName}'`,
	);

	return runData[nodeName][runIndex].data[connectionType][outputIndex];
}

type Key = `${string}-${number}-${string}`;

function makeKey(from: ISourceData | undefined, to: INode): Key {
	return `${from?.previousNode.name ?? 'start'}-${from?.previousNodeOutput ?? 0}-${to.name}`;
}

function findStartNodesRecursive(
	graph: DirectedGraph,
	current: INode,
	destination: INode,
	runData: IRunData,
	pinData: IPinData,
	startNodes: Map<Key, StartNodeData>,
	seen: Set<INode>,
	source?: ISourceData,
) {
	const nodeIsDirty = isDirty(current, runData, pinData);

	// If the current node is dirty stop following this branch, we found a start
	// node.
	if (nodeIsDirty) {
		startNodes.set(makeKey(source, current), {
			node: current,
			sourceData: source,
		});
		return startNodes;
	}

	// If the current node is the destination node stop following this branch, we
	// found a start node.
	if (current === destination) {
		startNodes.set(makeKey(source, current), { node: current, sourceData: source });
		return startNodes;
	}

	// If we detect a cycle stop following the branch, there is no start node on
	// this branch.
	if (seen.has(current)) {
		return startNodes;
	}

	// Recurse with every direct child that is part of the sub graph.
	const outGoingConnections = graph.getDirectChildren(current);
	for (const outGoingConnection of outGoingConnections) {
		const nodeRunData = getIncomingData(
			runData,
			outGoingConnection.from.name,
			// NOTE: It's always 0 until I fix the bug that removes the run data for
			// old runs. The FE only sends data for one run for each node.
			0,
			outGoingConnection.type,
			outGoingConnection.outputIndex,
		);

		// If the node has multiple outputs, only follow the outputs that have run data.
		const hasNoRunData =
			nodeRunData === null || nodeRunData === undefined || nodeRunData.length === 0;
		if (hasNoRunData) {
			continue;
		}

		findStartNodesRecursive(
			graph,
			outGoingConnection.to,
			destination,
			runData,
			pinData,
			startNodes,
			new Set(seen).add(current),
			{
				previousNode: current,
				// NOTE: It's always 0 until I fix the bug that removes the run data for
				// old runs. The FE only sends data for one run for each node.
				previousNodeRun: 0,
				previousNodeOutput: outGoingConnection.outputIndex,
			},
		);
	}

	return startNodes;
}

export function findStartNodes(
	graph: DirectedGraph,
	trigger: INode,
	destination: INode,
	runData: IRunData = {},
	pinData: IPinData = {},
): StartNodeData[] {
	const startNodes = findStartNodesRecursive(
		graph,
		trigger,
		destination,
		runData,
		pinData,
		new Map(),
		new Set(),
	);
	return [...startNodes.values()];
}

export function findCycles(_workflow: Workflow) {
	// TODO: implement depth first search or Tarjan's Algorithm
	return [];
}

export type Connection = {
	from: INode;
	to: INode;
	type: NodeConnectionType;
	outputIndex: number;
	inputIndex: number;
};
// fromName-outputType-outputIndex-inputIndex-toName
type DirectedGraphKey = `${string}-${NodeConnectionType}-${number}-${number}-${string}`;
export class DirectedGraph {
	private nodes: Map<string, INode> = new Map();

	private connections: Map<string, Connection> = new Map();

	getNodes() {
		return new Map(this.nodes.entries());
	}

	addNode(node: INode) {
		this.nodes.set(node.name, node);
		return this;
	}

	addNodes(...nodes: INode[]) {
		for (const node of nodes) {
			this.addNode(node);
		}
		return this;
	}

	addConnection(connectionInput: {
		from: INode;
		to: INode;
		type?: NodeConnectionType;
		outputIndex?: number;
		inputIndex?: number;
	}) {
		const { from, to } = connectionInput;

		const fromExists = this.nodes.get(from.name) === from;
		const toExists = this.nodes.get(to.name) === to;

		a.ok(fromExists);
		a.ok(toExists);

		const connection: Connection = {
			...connectionInput,
			type: connectionInput.type ?? NodeConnectionType.Main,
			outputIndex: connectionInput.outputIndex ?? 0,
			inputIndex: connectionInput.inputIndex ?? 0,
		};

		this.connections.set(this.makeKey(connection), connection);
		return this;
	}

	addConnections(
		...connectionInputs: Array<{
			from: INode;
			to: INode;
			type?: NodeConnectionType;
			outputIndex?: number;
			inputIndex?: number;
		}>
	) {
		for (const connectionInput of connectionInputs) {
			this.addConnection(connectionInput);
		}
		return this;
	}

	getDirectChildren(node: INode) {
		const nodeExists = this.nodes.get(node.name) === node;
		a.ok(nodeExists);

		const directChildren: Connection[] = [];

		for (const connection of this.connections.values()) {
			if (connection.from !== node) {
				continue;
			}

			directChildren.push(connection);
		}

		return directChildren;
	}

	private getChildrenRecursive(node: INode, seen: Set<INode>): Connection[] {
		if (seen.has(node)) {
			return [];
		}

		const directChildren = this.getDirectChildren(node);

		return [
			...directChildren,
			...directChildren.flatMap((child) =>
				this.getChildrenRecursive(child.to, new Set(seen).add(node)),
			),
		];
	}

	getChildren(node: INode): Connection[] {
		return this.getChildrenRecursive(node, new Set());
	}

	getDirectParents(node: INode) {
		const nodeExists = this.nodes.get(node.name) === node;
		a.ok(nodeExists);

		const directParents: Connection[] = [];

		for (const connection of this.connections.values()) {
			if (connection.to !== node) {
				continue;
			}

			directParents.push(connection);
		}

		return directParents;
	}

	toWorkflow(parameters: Omit<WorkflowParameters, 'nodes' | 'connections'>): Workflow {
		return new Workflow({
			...parameters,
			nodes: [...this.nodes.values()],
			connections: this.toIConnections(),
		});
	}

	static fromWorkflow(workflow: Workflow): DirectedGraph {
		const graph = new DirectedGraph();

		graph.addNodes(...Object.values(workflow.nodes));

		for (const [fromNodeName, iConnection] of Object.entries(workflow.connectionsBySourceNode)) {
			const from = workflow.getNode(fromNodeName);
			a.ok(from);

			for (const [outputType, outputs] of Object.entries(iConnection)) {
				// TODO: parse
				//const type = outputType as NodeConnectionType

				for (const [outputIndex, conns] of outputs.entries()) {
					for (const conn of conns) {
						// TODO: What's with the input type?
						const { node: toNodeName, type: _inputType, index: inputIndex } = conn;
						const to = workflow.getNode(toNodeName);
						a.ok(to);

						graph.addConnection({
							from,
							to,
							type: outputType as NodeConnectionType,
							outputIndex,
							inputIndex,
						});
					}
				}
			}
		}

		return graph;
	}

	private toIConnections() {
		const result: IConnections = {};

		for (const connection of this.connections.values()) {
			const { from, to, type, outputIndex, inputIndex } = connection;

			result[from.name] = result[from.name] ?? {
				[type]: [],
			};
			const resultConnection = result[from.name];
			resultConnection[type][outputIndex] = resultConnection[type][outputIndex] ?? [];
			const group = resultConnection[type][outputIndex];

			group.push({
				node: to.name,
				type,
				index: inputIndex,
			});
		}

		return result;
	}

	private makeKey(connection: Connection): DirectedGraphKey {
		return `${connection.from.name}-${connection.type}-${connection.outputIndex}-${connection.inputIndex}-${connection.to.name}`;
	}
}

export function findSubgraph(
	graph: DirectedGraph,
	destinationNode: INode,
	trigger: INode,
): DirectedGraph {
	const newGraph = new DirectedGraph();

	findSubgraphRecursive(graph, destinationNode, destinationNode, trigger, newGraph, []);

	return newGraph;
}
