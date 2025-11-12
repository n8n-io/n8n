/**
 * Workflow JSON SDK for n8n
 *
 * A Zod-like API for constructing n8n workflows programmatically
 */

// ============================================================================
// Types
// ============================================================================

export type NodeParameterValue = string | number | boolean | object | null | undefined;

export interface NodeParameters {
	[key: string]: NodeParameterValue | NodeParameters;
}

export interface NodePosition {
	x: number;
	y: number;
}

export interface NodeConnection {
	node: string;
	type: string;
	index: number;
}

export interface ConnectionConfig {
	node: WorkflowNode;
	type?: string;
	index?: number;
}

export interface WorkflowMeta {
	instanceId?: string;
	templateCredsSetupCompleted?: boolean;
	[key: string]: unknown;
}

export interface WorkflowNodeData {
	id: string;
	name: string;
	type: string;
	position: [number, number];
	parameters: NodeParameters;
	typeVersion?: number;
	disabled?: boolean;
	notes?: string;
	notesInFlow?: boolean;
	creator?: string;
	cid?: string;
	webhookId?: string;
	credentials?: Record<string, unknown>;
	retryOnFail?: boolean;
	maxTries?: number;
	waitBetweenTries?: number;
	alwaysOutputData?: boolean;
	executeOnce?: boolean;
	continueOnFail?: boolean;
}

export interface WorkflowConnections {
	[nodeName: string]: {
		[outputType: string]: NodeConnection[][];
	};
}

export interface WorkflowJSON {
	meta?: WorkflowMeta;
	name?: string;
	nodes: WorkflowNodeData[];
	connections: WorkflowConnections;
	pinData?: Record<string, unknown[]>;
	settings?: Record<string, unknown>;
	staticData?: unknown;
	tags?: unknown[];
	active?: boolean;
}

// ============================================================================
// Workflow Node Builder
// ============================================================================

export class WorkflowNode {
	private _id: string;
	private _name: string;
	private _type: string = '';
	private _parameters: NodeParameters = {};
	private _position: [number, number] = [0, 0];
	private _typeVersion: number = 1;
	private _disabled: boolean = false;
	private _notes?: string;
	private _notesInFlow?: boolean;
	private _creator?: string;
	private _cid?: string;
	private _webhookId?: string;
	private _credentials?: Record<string, unknown>;
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
	parameters(params: NodeParameters): this {
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
	 * Set the creator
	 */
	creator(creator: string): this {
		this._creator = creator;
		return this;
	}

	/**
	 * Set the CID
	 */
	cid(cid: string): this {
		this._cid = cid;
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
	credentials(credentials: Record<string, unknown>): this {
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
	toJSON(): WorkflowNodeData {
		const node: WorkflowNodeData = {
			id: this._id,
			name: this._name,
			type: this._type,
			position: this._position,
			parameters: this._parameters,
		};

		if (this._typeVersion !== 1) node.typeVersion = this._typeVersion;
		if (this._disabled) node.disabled = this._disabled;
		if (this._notes) node.notes = this._notes;
		if (this._notesInFlow) node.notesInFlow = this._notesInFlow;
		if (this._creator) node.creator = this._creator;
		if (this._cid) node.cid = this._cid;
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
	private _meta: WorkflowMeta = {};
	private nodes: Map<string, WorkflowNode> = new Map();
	private connectionMap: Map<
		string,
		Map<string, Array<Array<{ node: string; type: string; index: number }>>>
	> = new Map();
	private _pinData: Record<string, unknown[]> = {};
	private _settings: Record<string, unknown> = {};
	private _staticData: unknown = null;
	private _tags: unknown[] = [];
	private _active: boolean = false;

	constructor(options?: { name?: string; meta?: WorkflowMeta }) {
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
	meta(meta: WorkflowMeta): this {
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
			type: destType,
			index: destIndex,
		});
	}

	/**
	 * Set pin data
	 */
	pinData(nodeName: string, data: unknown[]): this {
		this._pinData[nodeName] = data;
		return this;
	}

	/**
	 * Set workflow settings
	 */
	settings(settings: Record<string, unknown>): this {
		this._settings = { ...this._settings, ...settings };
		return this;
	}

	/**
	 * Set static data
	 */
	staticData(data: unknown): this {
		this._staticData = data;
		return this;
	}

	/**
	 * Set tags
	 */
	tags(tags: unknown[]): this {
		this._tags = tags;
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
		const connections: WorkflowConnections = {};
		for (const [nodeName, typeMap] of this.connectionMap.entries()) {
			connections[nodeName] = {};
			for (const [type, indexArray] of typeMap.entries()) {
				connections[nodeName][type] = indexArray;
			}
		}

		// Build nodes array
		const nodesArray = Array.from(this.nodes.values()).map((node) => node.toJSON());

		const workflow: WorkflowJSON = {
			nodes: nodesArray,
			connections,
		};

		if (this._name) workflow.name = this._name;
		if (Object.keys(this._meta).length > 0) workflow.meta = this._meta;
		if (Object.keys(this._pinData).length > 0) workflow.pinData = this._pinData;
		if (Object.keys(this._settings).length > 0) workflow.settings = this._settings;
		if (this._staticData !== null) workflow.staticData = this._staticData;
		if (this._tags.length > 0) workflow.tags = this._tags;
		if (this._active) workflow.active = this._active;

		return workflow;
	}
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new workflow
 */
export function workflow(options?: { name?: string; meta?: WorkflowMeta }): Workflow {
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
	if (json.tags) wf.tags(json.tags);
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
		if (nodeData.creator) node.creator(nodeData.creator);
		if (nodeData.cid) node.cid(nodeData.cid);
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

	return wf;
}

// ============================================================================
// Exports
// ============================================================================
