import * as a from 'assert';
import type { IConnections, INode, WorkflowParameters } from 'n8n-workflow';
import { NodeConnectionType, Workflow } from 'n8n-workflow';

export type GraphConnection = {
	from: INode;
	to: INode;
	type: NodeConnectionType;
	outputIndex: number;
	inputIndex: number;
};
// fromName-outputType-outputIndex-inputIndex-toName
type DirectedGraphKey = `${string}-${NodeConnectionType}-${number}-${number}-${string}`;

type RemoveNodeBaseOptions = {
	reconnectConnections: boolean;
	skipConnectionFn?: (connection: GraphConnection) => boolean;
};

/**
 * Represents a directed graph as an adjacency list, e.g. one list for the
 * vertices and one list for the edges.
 * To integrate easier with the n8n codebase vertices are called nodes and
 * edges are called connections.
 *
 * The reason why this exists next to the Workflow class is that the workflow
 * class stored the graph in a deeply nested, normalized format. This format
 * does not lend itself to editing the graph or build graphs incrementally.
 * This closes this gap by having import and export functions:
 * `fromWorkflow`, `toWorkflow`.
 *
 * Thus it allows to do something like this:
 * ```ts
 * const newWorkflow = DirectedGraph.fromWorkflow(workflow)
 * 	.addNodes(node1, node2)
 * 	.addConnection({ from: node1, to: node2 })
 * 	.toWorkflow(...workflow);
 * ```
 */
export class DirectedGraph {
	private nodes: Map<string, INode> = new Map();

	private connections: Map<DirectedGraphKey, GraphConnection> = new Map();

	getNodes() {
		return new Map(this.nodes.entries());
	}

	getConnections(filter: { to?: INode } = {}) {
		const filteredCopy: GraphConnection[] = [];

		for (const connection of this.connections.values()) {
			const toMatches = filter.to ? connection.to === filter.to : true;

			if (toMatches) {
				filteredCopy.push(connection);
			}
		}

		return filteredCopy;
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

	/**
	 * Removes a node from the graph.
	 *
	 * By default it will also remove all connections that use that node and
	 * return nothing.
	 *
	 * If you pass `{ reconnectConnections: true }` it will rewire all
	 * connections making sure all parent nodes are connected to all child nodes
	 * and return the new connections.
	 */
	removeNode(
		node: INode,
		options?: { reconnectConnections: true } & RemoveNodeBaseOptions,
	): GraphConnection[];
	removeNode(
		node: INode,
		options?: { reconnectConnections: false } & RemoveNodeBaseOptions,
	): undefined;
	removeNode(
		node: INode,
		options: RemoveNodeBaseOptions = { reconnectConnections: false },
	): undefined | GraphConnection[] {
		if (options.reconnectConnections) {
			const incomingConnections = this.getDirectParentConnections(node);
			const outgoingConnections = this.getDirectChildConnections(node);

			const newConnections: GraphConnection[] = [];

			for (const incomingConnection of incomingConnections) {
				if (options.skipConnectionFn && options.skipConnectionFn(incomingConnection)) {
					continue;
				}

				for (const outgoingConnection of outgoingConnections) {
					if (options.skipConnectionFn && options.skipConnectionFn(outgoingConnection)) {
						continue;
					}

					const newConnection = {
						...incomingConnection,
						to: outgoingConnection.to,
						inputIndex: outgoingConnection.inputIndex,
					};

					newConnections.push(newConnection);
				}
			}

			for (const [key, connection] of this.connections.entries()) {
				if (connection.to === node || connection.from === node) {
					this.connections.delete(key);
				}
			}

			for (const newConnection of newConnections) {
				this.connections.set(this.makeKey(newConnection), newConnection);
			}

			this.nodes.delete(node.name);

			return newConnections;
		} else {
			for (const [key, connection] of this.connections.entries()) {
				if (connection.to === node || connection.from === node) {
					this.connections.delete(key);
				}
			}

			this.nodes.delete(node.name);

			return;
		}
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

		const connection: GraphConnection = {
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

	getDirectChildConnections(node: INode) {
		const nodeExists = this.nodes.get(node.name) === node;
		a.ok(nodeExists);

		const directChildren: GraphConnection[] = [];

		for (const connection of this.connections.values()) {
			if (connection.from !== node) {
				continue;
			}

			directChildren.push(connection);
		}

		return directChildren;
	}

	private getChildrenRecursive(node: INode, children: Set<INode>) {
		const directChildren = this.getDirectChildConnections(node);

		for (const directChild of directChildren) {
			// Break out if we found a cycle.
			if (children.has(directChild.to)) {
				continue;
			}
			children.add(directChild.to);
			this.getChildrenRecursive(directChild.to, children);
		}

		return children;
	}

	/**
	 * Returns all nodes that are children of the node that is passed as an
	 * argument.
	 *
	 * If the node being passed in is a child of itself (e.g. is part of a
	 * cycle), the return set will contain it as well.
	 */
	getChildren(node: INode) {
		return this.getChildrenRecursive(node, new Set());
	}

	getDirectParentConnections(node: INode) {
		const nodeExists = this.nodes.get(node.name) === node;
		a.ok(nodeExists);

		const directParents: GraphConnection[] = [];

		for (const connection of this.connections.values()) {
			if (connection.to !== node) {
				continue;
			}

			directParents.push(connection);
		}

		return directParents;
	}

	private getParentConnectionsRecursive(node: INode, connections: Set<GraphConnection>) {
		const parentConnections = this.getDirectParentConnections(node);

		for (const connection of parentConnections) {
			// break out of cycles
			if (connections.has(connection)) {
				continue;
			}

			connections.add(connection);

			this.getParentConnectionsRecursive(connection.from, connections);
		}

		return connections;
	}

	getParentConnections(node: INode) {
		return this.getParentConnectionsRecursive(node, new Set());
	}

	getConnection(
		from: INode,
		outputIndex: number,
		type: NodeConnectionType,
		inputIndex: number,
		to: INode,
	): GraphConnection | undefined {
		return this.connections.get(
			this.makeKey({
				from,
				outputIndex,
				type,
				inputIndex,
				to,
			}),
		);
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
				for (const [outputIndex, conns] of outputs.entries()) {
					for (const conn of conns) {
						// TODO: What's with the input type?
						const { node: toNodeName, type: _inputType, index: inputIndex } = conn;
						const to = workflow.getNode(toNodeName);
						a.ok(to);

						graph.addConnection({
							from,
							to,
							// TODO: parse outputType instead of casting it
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

	private makeKey(connection: GraphConnection): DirectedGraphKey {
		return `${connection.from.name}-${connection.type}-${connection.outputIndex}-${connection.inputIndex}-${connection.to.name}`;
	}
}
