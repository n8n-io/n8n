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
export type { INode as WorkflowNodeData, IConnections as WorkflowConnections, WorkflowJSON };

export interface ConnectionConfig {
	node: WorkflowNode;
	type?: string;
	index?: number;
}

// ============================================================================
// Workflow Node Builder
// ============================================================================

export class WorkflowNode {
	private _id: string;
	private _name: string;
	private _type: string = '';
	private _parameters: INodeParameters = {};
	private _position: [number, number] = [0, 0];
	private _typeVersion: number = 1;
	private _disabled: boolean = false;
	private _notes?: string;
	private _notesInFlow?: boolean;
	private _webhookId?: string;
	private _credentials?: INodeCredentials;
	private _retryOnFail?: boolean;
	private _maxTries?: number;
	private _waitBetweenTries?: number;
	private _alwaysOutputData?: boolean;
	private _executeOnce?: boolean;
	private _continueOnFail?: boolean;

	constructor(name: string) {
		this._name = name;
		this._id = this.generateId();
	}

	private generateId(): string {
		return `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 13)}`;
	}

	/**
	 * Set the node type
	 */
	type(type: string): this {
		this._type = type;
		return this;
	}

	/**
	 * Set the node parameters
	 */
	parameters(params: INodeParameters): this {
		this._parameters = { ...this._parameters, ...params };
		return this;
	}

	/**
	 * Set the node position
	 */
	position(x: number, y: number): this {
		this._position = [x, y];
		return this;
	}

	/**
	 * Set the type version
	 */
	version(version: number): this {
		this._typeVersion = version;
		return this;
	}

	/**
	 * Set the node ID
	 */
	id(id: string): this {
		this._id = id;
		return this;
	}

	/**
	 * Disable the node
	 */
	disabled(disabled: boolean = true): this {
		this._disabled = disabled;
		return this;
	}

	/**
	 * Add notes to the node
	 */
	notes(notes: string, inFlow: boolean = false): this {
		this._notes = notes;
		this._notesInFlow = inFlow;
		return this;
	}

	/**
	 * Set webhook ID
	 */
	webhookId(webhookId: string): this {
		this._webhookId = webhookId;
		return this;
	}

	/**
	 * Set credentials
	 */
	credentials(credentials: INodeCredentials): this {
		this._credentials = credentials;
		return this;
	}

	/**
	 * Set retry on fail
	 */
	retryOnFail(retry: boolean, maxTries?: number, waitBetweenTries?: number): this {
		this._retryOnFail = retry;
		if (maxTries !== undefined) this._maxTries = maxTries;
		if (waitBetweenTries !== undefined) this._waitBetweenTries = waitBetweenTries;
		return this;
	}

	/**
	 * Set always output data
	 */
	alwaysOutputData(always: boolean = true): this {
		this._alwaysOutputData = always;
		return this;
	}

	/**
	 * Set execute once
	 */
	executeOnce(once: boolean = true): this {
		this._executeOnce = once;
		return this;
	}

	/**
	 * Set continue on fail
	 */
	continueOnFail(continueOnFail: boolean = true): this {
		this._continueOnFail = continueOnFail;
		return this;
	}

	/**
	 * Get the node name
	 */
	getName(): string {
		return this._name;
	}

	/**
	 * Convert to JSON representation
	 */
	toJSON(): INode {
		const node: INode = {
			id: this._id,
			name: this._name,
			type: this._type,
			typeVersion: this._typeVersion,
			position: this._position,
			parameters: this._parameters,
		};

		if (this._disabled) node.disabled = this._disabled;
		if (this._notes) node.notes = this._notes;
		if (this._notesInFlow) node.notesInFlow = this._notesInFlow;
		if (this._webhookId) node.webhookId = this._webhookId;
		if (this._credentials) node.credentials = this._credentials;
		if (this._retryOnFail) node.retryOnFail = this._retryOnFail;
		if (this._maxTries) node.maxTries = this._maxTries;
		if (this._waitBetweenTries) node.waitBetweenTries = this._waitBetweenTries;
		if (this._alwaysOutputData) node.alwaysOutputData = this._alwaysOutputData;
		if (this._executeOnce) node.executeOnce = this._executeOnce;
		if (this._continueOnFail) node.continueOnFail = this._continueOnFail;

		return node;
	}
}

// ============================================================================
// Connection Builder
// ============================================================================

export class ConnectionBuilder {
	private sourceNode?: WorkflowNode;
	private sourceType: string = 'main';
	private sourceIndex: number = 0;
	private destinations: Array<{
		node: WorkflowNode;
		type: string;
		index: number;
	}> = [];

	constructor(private workflow: Workflow) {}

	/**
	 * Set the source node
	 */
	from(source: WorkflowNode | { node: WorkflowNode; type?: string; index?: number }): this {
		if (source instanceof WorkflowNode) {
			this.sourceNode = source;
			this.sourceType = 'main';
			this.sourceIndex = 0;
		} else {
			this.sourceNode = source.node;
			this.sourceType = source.type ?? 'main';
			this.sourceIndex = source.index ?? 0;
		}
		return this;
	}

	/**
	 * Add destination nodes
	 */
	to(
		destinations:
			| WorkflowNode
			| WorkflowNode[]
			| { node: WorkflowNode; type?: string; index?: number },
	): this {
		if (Array.isArray(destinations)) {
			for (const dest of destinations) {
				this.destinations.push({
					node: dest,
					type: 'main',
					index: 0,
				});
			}
		} else if (destinations instanceof WorkflowNode) {
			this.destinations.push({
				node: destinations,
				type: 'main',
				index: 0,
			});
		} else {
			this.destinations.push({
				node: destinations.node,
				type: destinations.type ?? 'main',
				index: destinations.index ?? 0,
			});
		}
		return this;
	}

	/**
	 * Build and register the connections
	 */
	build(): void {
		if (!this.sourceNode) {
			throw new Error('Source node not set. Use .from() to set the source node.');
		}

		for (const dest of this.destinations) {
			this.workflow.addConnection(
				this.sourceNode,
				dest.node,
				this.sourceType,
				this.sourceIndex,
				dest.type,
				dest.index,
			);
		}
	}
}

// ============================================================================
// Workflow Builder
// ============================================================================

export class Workflow {
	private _name?: string;
	private _meta?: WorkflowFEMeta;
	private nodes: Map<string, WorkflowNode> = new Map();
	private connectionMap: Map<string, Map<string, IConnection[][]>> = new Map();
	private _pinData?: IPinData;
	private _settings?: IWorkflowSettings;
	private _staticData?: IDataObject;
	private _active: boolean = false;

	constructor(options?: { name?: string; meta?: WorkflowFEMeta }) {
		if (options?.name) this._name = options.name;
		if (options?.meta) this._meta = options.meta;
	}

	/**
	 * Set workflow name
	 */
	name(name: string): this {
		this._name = name;
		return this;
	}

	/**
	 * Set workflow meta
	 */
	meta(meta: WorkflowFEMeta): this {
		this._meta = { ...this._meta, ...meta };
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
		sourceType: string,
		sourceIndex: number,
		destType: string,
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
			type: destType as IConnection['type'],
			index: destIndex,
		});
	}

	/**
	 * Set pin data
	 */
	pinData(nodeName: string, data: IPinData[string]): this {
		this._pinData ??= {};
		this._pinData[nodeName] = data;
		return this;
	}

	/**
	 * Set workflow settings
	 */
	settings(settings: IWorkflowSettings): this {
		this._settings = { ...this._settings, ...settings };
		return this;
	}

	/**
	 * Set static data
	 */
	staticData(data: IDataObject): this {
		this._staticData = data;
		return this;
	}

	/**
	 * Set active status
	 */
	active(active: boolean = true): this {
		this._active = active;
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
			name: this._name ?? '',
			active: this._active,
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: nodesArray,
			connections,
		};

		if (this._meta) workflow.meta = this._meta;
		if (this._pinData) workflow.pinData = this._pinData;
		if (this._settings) workflow.settings = this._settings;
		if (this._staticData) workflow.staticData = this._staticData;

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
	if (json.active) wf.active(json.active);

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

					wf.addConnection(sourceNode, destNode, sourceType, sourceIndex, conn.type, conn.index);
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

	// Set workflow name and active status
	if (json.name) wf.name(json.name);
	if (json.active !== undefined) wf.active(json.active);

	return wf;
}

// ============================================================================
// Exports
// ============================================================================
