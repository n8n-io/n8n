import type {
	INode,
	IConnections,
	IDataObject,
	INodeParameters,
	INodeCredentials,
} from 'n8n-workflow';
import type {
	WorkflowBuilder,
	WorkflowBuilderStatic,
	WorkflowSettings,
	WorkflowJSON,
	NodeInstance,
	TriggerInstance,
	OutputSelector,
	MergeComposite,
} from './types/base';

/**
 * Default horizontal spacing between nodes
 */
const NODE_SPACING_X = 200;

/**
 * Default vertical position for nodes
 */
const DEFAULT_Y = 300;

/**
 * Starting X position for first node
 */
const START_X = 100;

/**
 * Parse version string to number
 */
function parseVersion(version: string): number {
	const match = version.match(/v?(\d+(?:\.\d+)?)/);
	return match ? parseFloat(match[1]) : 1;
}

/**
 * Internal representation of a node in the graph
 */
interface GraphNode {
	instance: NodeInstance<string, string, unknown>;
	connections: Map<number, string[]>; // outputIndex -> nodeNames
}

/**
 * Internal workflow builder implementation
 */
class WorkflowBuilderImpl implements WorkflowBuilder {
	readonly id: string;
	readonly name: string;
	private _settings: WorkflowSettings;
	private _nodes: Map<string, GraphNode>;
	private _currentNode: string | null;
	private _currentOutput: number;

	constructor(
		id: string,
		name: string,
		settings: WorkflowSettings = {},
		nodes?: Map<string, GraphNode>,
		currentNode?: string | null,
	) {
		this.id = id;
		this.name = name;
		this._settings = { ...settings };
		this._nodes = nodes ? new Map(nodes) : new Map();
		this._currentNode = currentNode ?? null;
		this._currentOutput = 0;
	}

	private clone(overrides: {
		nodes?: Map<string, GraphNode>;
		currentNode?: string | null;
		currentOutput?: number;
		settings?: WorkflowSettings;
	}): WorkflowBuilderImpl {
		const builder = new WorkflowBuilderImpl(
			this.id,
			this.name,
			overrides.settings ?? this._settings,
			overrides.nodes ?? this._nodes,
			overrides.currentNode !== undefined ? overrides.currentNode : this._currentNode,
		);
		builder._currentOutput = overrides.currentOutput ?? this._currentOutput;
		return builder;
	}

	add<N extends NodeInstance<string, string, unknown> | TriggerInstance<string, string, unknown>>(
		node: N,
	): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		newNodes.set(node.name, {
			instance: node,
			connections: new Map(),
		});
		return this.clone({
			nodes: newNodes,
			currentNode: node.name,
			currentOutput: 0,
		});
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrMerge: N | MergeComposite,
	): WorkflowBuilder {
		// Handle merge composite
		if ('mergeNode' in nodeOrMerge && 'branches' in nodeOrMerge) {
			// This will be implemented in merge.ts
			throw new Error('Merge composite not yet implemented');
		}

		const node = nodeOrMerge as N;
		const newNodes = new Map(this._nodes);

		// Add the new node
		newNodes.set(node.name, {
			instance: node,
			connections: new Map(),
		});

		// Connect from current node if exists
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const outputConnections = currentGraphNode.connections.get(this._currentOutput) || [];
				currentGraphNode.connections.set(this._currentOutput, [...outputConnections, node.name]);
			}
		}

		return this.clone({
			nodes: newNodes,
			currentNode: node.name,
			currentOutput: 0,
		});
	}

	output(index: number): OutputSelector<WorkflowBuilder> {
		const self = this;
		return {
			then<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder {
				const newNodes = new Map(self._nodes);

				// Add the new node
				newNodes.set(node.name, {
					instance: node,
					connections: new Map(),
				});

				// Connect from current node at specified output
				if (self._currentNode) {
					const currentGraphNode = newNodes.get(self._currentNode);
					if (currentGraphNode) {
						const outputConnections = currentGraphNode.connections.get(index) || [];
						currentGraphNode.connections.set(index, [...outputConnections, node.name]);
					}
				}

				return self.clone({
					nodes: newNodes,
					currentNode: self._currentNode, // Stay on the same node for .output() chaining
					currentOutput: index,
				});
			},
		};
	}

	settings(settings: WorkflowSettings): WorkflowBuilder {
		return this.clone({
			settings: { ...this._settings, ...settings },
		});
	}

	getNode(name: string): NodeInstance<string, string, unknown> | undefined {
		const graphNode = this._nodes.get(name);
		return graphNode?.instance;
	}

	toJSON(): WorkflowJSON {
		const nodes: INode[] = [];
		const connections: IConnections = {};

		// Calculate positions for nodes without explicit positions
		const nodePositions = this.calculatePositions();

		// Convert nodes
		for (const [nodeName, graphNode] of this._nodes) {
			const instance = graphNode.instance;
			const position = instance.config.position ??
				nodePositions.get(nodeName) ?? [START_X, DEFAULT_Y];

			const n8nNode: INode = {
				id: instance.id,
				name: nodeName,
				type: instance.type,
				typeVersion: parseVersion(instance.version),
				position,
				parameters: (instance.config.parameters ?? {}) as INodeParameters,
			};

			// Add optional properties
			if (instance.config.credentials) {
				n8nNode.credentials = instance.config.credentials as unknown as INodeCredentials;
			}
			if (instance.config.disabled) {
				n8nNode.disabled = instance.config.disabled;
			}
			if (instance.config.notes) {
				n8nNode.notes = instance.config.notes;
			}
			if (instance.config.notesInFlow) {
				n8nNode.notesInFlow = instance.config.notesInFlow;
			}
			if (instance.config.executeOnce) {
				n8nNode.executeOnce = instance.config.executeOnce;
			}
			if (instance.config.retryOnFail) {
				n8nNode.retryOnFail = instance.config.retryOnFail;
			}
			if (instance.config.alwaysOutputData) {
				n8nNode.alwaysOutputData = instance.config.alwaysOutputData;
			}
			if (instance.config.onError) {
				n8nNode.onError = instance.config.onError;
			}

			nodes.push(n8nNode);

			// Convert connections
			if (graphNode.connections.size > 0) {
				const nodeConnections: IConnections[string] = { main: [] };

				// Get max output index to ensure array is properly sized
				const maxOutput = Math.max(...graphNode.connections.keys());
				for (let i = 0; i <= maxOutput; i++) {
					const targets = graphNode.connections.get(i) || [];
					nodeConnections.main[i] = targets.map((targetName) => ({
						node: targetName,
						type: 'main' as const,
						index: 0,
					}));
				}

				connections[nodeName] = nodeConnections;
			}
		}

		const json: WorkflowJSON = {
			id: this.id,
			name: this.name,
			nodes,
			connections,
		};

		if (Object.keys(this._settings).length > 0) {
			json.settings = this._settings;
		}

		return json;
	}

	toString(): string {
		return JSON.stringify(this.toJSON(), null, 2);
	}

	/**
	 * Calculate positions for nodes using a simple left-to-right layout
	 */
	private calculatePositions(): Map<string, [number, number]> {
		const positions = new Map<string, [number, number]>();

		// Find root nodes (nodes with no incoming connections)
		const hasIncoming = new Set<string>();
		for (const graphNode of this._nodes.values()) {
			for (const targets of graphNode.connections.values()) {
				for (const target of targets) {
					hasIncoming.add(target);
				}
			}
		}

		const rootNodes = [...this._nodes.keys()].filter((name) => !hasIncoming.has(name));

		// BFS to assign positions
		const visited = new Set<string>();
		const queue: Array<{ name: string; x: number; y: number }> = [];

		// Initialize queue with root nodes
		let y = DEFAULT_Y;
		for (const rootName of rootNodes) {
			queue.push({ name: rootName, x: START_X, y });
			y += 150; // Offset Y for multiple roots
		}

		while (queue.length > 0) {
			const { name, x, y: nodeY } = queue.shift()!;

			if (visited.has(name)) continue;
			visited.add(name);

			// Only set position if node doesn't have explicit position
			const node = this._nodes.get(name);
			if (node && !node.instance.config.position) {
				positions.set(name, [x, nodeY]);
			}

			// Queue connected nodes
			if (node) {
				let branchOffset = 0;
				for (const [outputIndex, targets] of node.connections) {
					for (const target of targets) {
						if (!visited.has(target)) {
							queue.push({
								name: target,
								x: x + NODE_SPACING_X,
								y: nodeY + branchOffset * 150,
							});
							branchOffset++;
						}
					}
				}
			}
		}

		return positions;
	}
}

/**
 * Create a new workflow builder
 */
function createWorkflow(id: string, name: string, settings?: WorkflowSettings): WorkflowBuilder {
	return new WorkflowBuilderImpl(id, name, settings);
}

/**
 * Import workflow from n8n JSON format
 */
function fromJSON(json: WorkflowJSON): WorkflowBuilder {
	const nodes = new Map<string, GraphNode>();

	// Create node instances from JSON
	for (const n8nNode of json.nodes) {
		const version = `v${n8nNode.typeVersion}`;

		// Convert credentials from n8n format to SDK format
		const credentials = n8nNode.credentials
			? Object.fromEntries(
					Object.entries(n8nNode.credentials).map(([type, cred]) => [
						type,
						{ name: cred.name, id: cred.id ?? '' },
					]),
				)
			: undefined;

		// Create a minimal node instance
		const instance: NodeInstance<string, string, unknown> = {
			type: n8nNode.type,
			version,
			id: n8nNode.id,
			name: n8nNode.name,
			config: {
				parameters: n8nNode.parameters as IDataObject,
				credentials,
				position: n8nNode.position,
				disabled: n8nNode.disabled,
				notes: n8nNode.notes,
				notesInFlow: n8nNode.notesInFlow,
				executeOnce: n8nNode.executeOnce,
				retryOnFail: n8nNode.retryOnFail,
				alwaysOutputData: n8nNode.alwaysOutputData,
				onError: n8nNode.onError,
			},
			update: function (config) {
				return {
					...this,
					config: { ...this.config, ...config },
				};
			},
		};

		nodes.set(n8nNode.name, {
			instance,
			connections: new Map(),
		});
	}

	// Rebuild connections
	if (json.connections) {
		for (const [sourceName, nodeConns] of Object.entries(json.connections)) {
			const graphNode = nodes.get(sourceName);
			if (graphNode && nodeConns.main) {
				for (let outputIndex = 0; outputIndex < nodeConns.main.length; outputIndex++) {
					const targets = nodeConns.main[outputIndex];
					if (targets && targets.length > 0) {
						graphNode.connections.set(
							outputIndex,
							targets.map((conn) => conn.node),
						);
					}
				}
			}
		}
	}

	// Find the last node in the chain for currentNode
	let lastNode: string | null = null;
	for (const name of nodes.keys()) {
		lastNode = name;
	}

	return new WorkflowBuilderImpl(json.id ?? '', json.name, json.settings, nodes, lastNode);
}

/**
 * Workflow builder factory function with static methods
 */
export const workflow: WorkflowBuilderStatic = Object.assign(createWorkflow, {
	fromJSON,
});
