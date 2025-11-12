/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { INode, INodeParameters, INodeCredentials } from 'n8n-workflow';

import type { NodeType, GetNodeParameters } from './nodeTypes';

// Helper type to get parameters based on node type
type NodeParams<T> = T extends NodeType ? GetNodeParameters<T> : INodeParameters;

export class WorkflowNode<T extends NodeType | unknown = unknown> {
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
	type<NewType extends NodeType>(type: NewType): WorkflowNode<NewType> {
		this.node.type = type;
		return this as unknown as WorkflowNode<NewType>;
	}

	/**
	 * Set the node parameters
	 */
	parameters(params: NodeParams<T>): this {
		this.node.parameters = { ...this.node.parameters, ...params } as INodeParameters;
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
