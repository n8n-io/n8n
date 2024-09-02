import * as a from 'assert';
import type { IConnections, INode, WorkflowParameters } from 'n8n-workflow';
import { NodeConnectionType, Workflow } from 'n8n-workflow';

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

	private connections: Map<DirectedGraphKey, Connection> = new Map();

	getNodes() {
		return new Map(this.nodes.entries());
	}

	getConnections(filter: { to?: INode } = {}) {
		const filteredCopy: Connection[] = [];

		for (const connection of this.connections.values()) {
			const toMatches = filter.to ? connection.to === filter.to : true;

			if (toMatches) {
				filteredCopy.push(connection);
			}
		}

		return filteredCopy;

		//return new Map(this.connections.entries());
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

	getConnection(
		from: INode,
		outputIndex: number,
		type: NodeConnectionType,
		inputIndex: number,
		to: INode,
	): Connection | undefined {
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
