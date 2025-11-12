import type {
	IWorkflowBase as WorkflowJSON,
	INode,
	INodeParameters,
	INodeCredentials,
	IConnections,
	IPinData,
	IWorkflowSettings,
	IDataObject,
	WorkflowFEMeta,
	IConnection,
	NodeConnectionType,
} from 'n8n-workflow';

/**
 * Workflow JSON SDK for n8n
 *
 * A Zod-like API for constructing n8n workflows programmatically
 */

// ============================================================================
// Types
// ============================================================================

// Re-export commonly used types
export type {
	INode as WorkflowNodeData,
	IConnections as WorkflowConnections,
	WorkflowJSON,
	NodeConnectionType,
};

export interface ConnectionConfig {
	node: WorkflowNode;
	type?: NodeConnectionType;
	index?: number;
}

// ============================================================================
// Workflow Node Builder
// ============================================================================

export class WorkflowNode {
	private node: INode;

	constructor(name: string) {
		this.node = {
			id: this.generateId(),
			name,
			type: '',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
	}

	private generateId(): string {
		return `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 13)}`;
	}

	/**
	 * Set the node type
	 */
	type(type: string): this {
		this.node.type = type;
		return this;
	}

	/**
	 * Set the node parameters
	 */
	parameters(params: INodeParameters): this {
		this.node.parameters = { ...this.node.parameters, ...params };
		return this;
	}

	/**
	 * Set the node position
	 */
	position(x: number, y: number): this {
		this.node.position = [x, y];
		return this;
	}

	/**
	 * Set the type version
	 */
	version(version: number): this {
		this.node.typeVersion = version;
		return this;
	}

	/**
	 * Set the node ID
	 */
	id(id: string): this {
		this.node.id = id;
		return this;
	}

	/**
	 * Disable the node
	 */
	disabled(disabled: boolean = true): this {
		this.node.disabled = disabled;
		return this;
	}

	/**
	 * Add notes to the node
	 */
	notes(notes: string, inFlow: boolean = false): this {
		this.node.notes = notes;
		this.node.notesInFlow = inFlow;
		return this;
	}

	/**
	 * Set webhook ID
	 */
	webhookId(webhookId: string): this {
		this.node.webhookId = webhookId;
		return this;
	}

	/**
	 * Set credentials
	 */
	credentials(credentials: INodeCredentials): this {
		this.node.credentials = credentials;
		return this;
	}

	/**
	 * Set retry on fail
	 */
	retryOnFail(retry: boolean, maxTries?: number, waitBetweenTries?: number): this {
		this.node.retryOnFail = retry;
		if (maxTries !== undefined) this.node.maxTries = maxTries;
		if (waitBetweenTries !== undefined) this.node.waitBetweenTries = waitBetweenTries;
		return this;
	}

	/**
	 * Set always output data
	 */
	alwaysOutputData(always: boolean = true): this {
		this.node.alwaysOutputData = always;
		return this;
	}

	/**
	 * Set execute once
	 */
	executeOnce(once: boolean = true): this {
		this.node.executeOnce = once;
		return this;
	}

	/**
	 * Set continue on fail
	 */
	continueOnFail(continueOnFail: boolean = true): this {
		this.node.continueOnFail = continueOnFail;
		return this;
	}

	/**
	 * Get the node name
	 */
	getName(): string {
		return this.node.name;
	}

	/**
	 * Convert to JSON representation
	 */
	toJSON(): INode {
		return { ...this.node };
	}
}

// ============================================================================
// Connection Builder
// ============================================================================

export class ConnectionBuilder {
	private source?: {
		node: WorkflowNode;
		type: NodeConnectionType;
		index: number;
	};

	constructor(private workflow: Workflow) {}

	/**
	 * Set the source node
	 */
	from(
		source: WorkflowNode | { node: WorkflowNode; type?: NodeConnectionType; index?: number },
	): this {
		if (source instanceof WorkflowNode) {
			this.source = {
				node: source,
				type: 'main',
				index: 0,
			};
		} else {
			this.source = {
				node: source.node,
				type: source.type ?? 'main',
				index: source.index ?? 0,
			};
		}
		return this;
	}

	/**
	 * Add destination nodes and create connections immediately
	 */
	to(
		destinations:
			| WorkflowNode
			| WorkflowNode[]
			| { node: WorkflowNode; type?: NodeConnectionType; index?: number },
	): this {
		if (!this.source) {
			throw new Error('Source node not set. Use .from() to set the source node.');
		}

		const destNodes: Array<{ node: WorkflowNode; type: NodeConnectionType; index: number }> = [];

		if (Array.isArray(destinations)) {
			for (const dest of destinations) {
				destNodes.push({
					node: dest,
					type: 'main',
					index: 0,
				});
			}
		} else if (destinations instanceof WorkflowNode) {
			destNodes.push({
				node: destinations,
				type: 'main',
				index: 0,
			});
		} else {
			destNodes.push({
				node: destinations.node,
				type: destinations.type ?? 'main',
				index: destinations.index ?? 0,
			});
		}

		// Add connections immediately
		for (const dest of destNodes) {
			this.workflow.addConnection(
				this.source.node,
				dest.node,
				this.source.type,
				this.source.index,
				dest.type,
				dest.index,
			);
		}

		return this;
	}
}

// ============================================================================
// Workflow Builder
// ============================================================================

export class Workflow {
	private data: Partial<WorkflowJSON> = {};
	private nodes: Map<string, WorkflowNode> = new Map();
	private connectionMap: Map<string, Map<string, IConnection[][]>> = new Map();

	constructor(options?: { name?: string; meta?: WorkflowFEMeta }) {
		if (options?.name) this.data.name = options.name;
		if (options?.meta) this.data.meta = options.meta;
	}

	/**
	 * Set workflow name
	 */
	name(name: string): this {
		this.data.name = name;
		return this;
	}

	/**
	 * Set workflow meta
	 */
	meta(meta: WorkflowFEMeta): this {
		this.data.meta = { ...this.data.meta, ...meta };
		return this;
	}

	/**
	 * Create a new node
	 */
	node(name: string): WorkflowNode {
		const node = new WorkflowNode(name);
		this.nodes.set(name, node);
		return node;
	}

	/**
	 * Create a connection builder
	 */
	connection(): ConnectionBuilder {
		return new ConnectionBuilder(this);
	}

	/**
	 * Add a connection between nodes (internal use)
	 */
	addConnection(
		sourceNode: WorkflowNode,
		destNode: WorkflowNode,
		sourceType: NodeConnectionType,
		sourceIndex: number,
		destType: NodeConnectionType,
		destIndex: number,
	): void {
		const sourceName = sourceNode.getName();

		if (!this.connectionMap.has(sourceName)) {
			this.connectionMap.set(sourceName, new Map());
		}

		const sourceConnections = this.connectionMap.get(sourceName)!;

		if (!sourceConnections.has(sourceType)) {
			sourceConnections.set(sourceType, []);
		}

		const typeConnections = sourceConnections.get(sourceType)!;

		// Ensure we have enough arrays for the source index
		while (typeConnections.length <= sourceIndex) {
			typeConnections.push([]);
		}

		// Add the connection
		typeConnections[sourceIndex].push({
			node: destNode.getName(),
			type: destType,
			index: destIndex,
		});
	}

	/**
	 * Set pin data
	 */
	pinData(nodeName: string, data: IPinData[string]): this {
		this.data.pinData ??= {};
		this.data.pinData[nodeName] = data;
		return this;
	}

	/**
	 * Set workflow settings
	 */
	settings(settings: IWorkflowSettings): this {
		this.data.settings = { ...this.data.settings, ...settings };
		return this;
	}

	/**
	 * Set static data
	 */
	staticData(data: IDataObject): this {
		this.data.staticData = data;
		return this;
	}

	/**
	 * Set active status
	 */
	active(active: boolean = true): this {
		this.data.active = active;
		return this;
	}

	/**
	 * Convert to JSON
	 */
	toJSON(): WorkflowJSON {
		// Build connections object
		const connections: IConnections = {};
		for (const [nodeName, typeMap] of this.connectionMap.entries()) {
			connections[nodeName] = {};
			for (const [type, indexArray] of typeMap.entries()) {
				connections[nodeName][type] = indexArray;
			}
		}

		// Build nodes array
		const nodesArray = Array.from(this.nodes.values()).map((node) => node.toJSON());

		const workflow: WorkflowJSON = {
			id: '',
			name: this.data.name ?? '',
			active: this.data.active ?? false,
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: nodesArray,
			connections,
		};

		if (this.data.meta) workflow.meta = this.data.meta;
		if (this.data.pinData) workflow.pinData = this.data.pinData;
		if (this.data.settings) workflow.settings = this.data.settings;
		if (this.data.staticData) workflow.staticData = this.data.staticData;

		return workflow;
	}
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new workflow
 */
export function workflow(options?: { name?: string; meta?: WorkflowFEMeta }): Workflow {
	return new Workflow(options);
}

/**
 * Create a workflow from existing JSON
 */
export function fromJSON(json: WorkflowJSON): Workflow {
	const wf = new Workflow({
		name: json.name,
		meta: json.meta,
	});

	// Add settings and other properties
	if (json.settings) wf.settings(json.settings);
	if (json.staticData) wf.staticData(json.staticData);
	if (json.active !== undefined) wf.active(json.active);

	// Create nodes
	const nodeMap = new Map<string, WorkflowNode>();
	for (const nodeData of json.nodes) {
		const node = wf
			.node(nodeData.name)
			.type(nodeData.type)
			.parameters(nodeData.parameters)
			.position(nodeData.position[0], nodeData.position[1]);

		if (nodeData.id) node.id(nodeData.id);
		if (nodeData.typeVersion) node.version(nodeData.typeVersion);
		if (nodeData.disabled) node.disabled(nodeData.disabled);
		if (nodeData.notes) node.notes(nodeData.notes, nodeData.notesInFlow);
		if (nodeData.webhookId) node.webhookId(nodeData.webhookId);
		if (nodeData.credentials) node.credentials(nodeData.credentials);
		if (nodeData.retryOnFail) {
			node.retryOnFail(nodeData.retryOnFail, nodeData.maxTries, nodeData.waitBetweenTries);
		}
		if (nodeData.alwaysOutputData) node.alwaysOutputData(nodeData.alwaysOutputData);
		if (nodeData.executeOnce) node.executeOnce(nodeData.executeOnce);
		if (nodeData.continueOnFail) node.continueOnFail(nodeData.continueOnFail);

		nodeMap.set(nodeData.name, node);
	}

	// Create connections
	for (const [sourceName, typeConnections] of Object.entries(json.connections)) {
		const sourceNode = nodeMap.get(sourceName);
		if (!sourceNode) continue;

		for (const [sourceType, indexArrays] of Object.entries(typeConnections)) {
			indexArrays.forEach((connections, sourceIndex) => {
				if (!connections) return;
				for (const conn of connections) {
					const destNode = nodeMap.get(conn.node);
					if (!destNode) continue;

					wf.addConnection(
						sourceNode,
						destNode,
						sourceType as NodeConnectionType,
						sourceIndex,
						conn.type,
						conn.index,
					);
				}
			});
		}
	}

	// Add pin data
	if (json.pinData) {
		for (const [nodeName, data] of Object.entries(json.pinData)) {
			wf.pinData(nodeName, data);
		}
	}

	return wf;
}
