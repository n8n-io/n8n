import type {
	IWorkflowBase as WorkflowJSON,
	IConnections,
	IPinData,
	IWorkflowSettings,
	IDataObject,
	WorkflowFEMeta,
	IConnection,
	NodeConnectionType,
} from 'n8n-workflow';
import { WorkflowNode } from './nodes';
import { ConnectionBuilder } from './connections';

export class Workflow {
	private data: Partial<WorkflowJSON> = {};
	private nodes: Map<string, WorkflowNode<any>> = new Map();
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
		sourceNode: WorkflowNode<any>,
		destNode: WorkflowNode<any>,
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
