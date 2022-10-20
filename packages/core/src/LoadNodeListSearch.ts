/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	INode,
	INodeCredentials,
	INodeListSearchResult,
	INodeParameters,
	INodeTypeNameVersion,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	requireDistNode,
	Workflow,
} from 'n8n-workflow';

import { NodeExecuteFunctions } from '.';

const TEMP_NODE_NAME = 'Temp-Node';
const TEMP_WORKFLOW_NAME = 'Temp-Workflow';

export class LoadNodeListSearch {
	currentNodeParameters: INodeParameters;

	path: string;

	workflow: Workflow;

	constructor(
		nodeTypeNameAndVersion: INodeTypeNameVersion,
		nodeTypes: INodeTypes,
		path: string,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	) {
		const nodeType = nodeTypes.getByNameAndVersion(
			nodeTypeNameAndVersion.name,
			nodeTypeNameAndVersion.version,
		);
		this.currentNodeParameters = currentNodeParameters;
		this.path = path;
		if (nodeType === undefined) {
			throw new Error(
				`The node-type "${nodeTypeNameAndVersion.name} v${nodeTypeNameAndVersion.version}"  is not known!`,
			);
		}

		const nodeData: INode = {
			parameters: currentNodeParameters,
			id: 'uuid-1234',
			name: TEMP_NODE_NAME,
			type: nodeTypeNameAndVersion.name,
			typeVersion: nodeTypeNameAndVersion.version,
			position: [0, 0],
		};
		if (credentials) {
			nodeData.credentials = credentials;
		}

		const workflowData = {
			nodes: [nodeData],
			connections: {},
		};

		this.workflow = new Workflow({
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes,
		});
	}

	/**
	 * Returns data of a fake workflow
	 *
	 * @returns
	 * @memberof LoadNodeParameterOptions
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	getWorkflowData() {
		return {
			name: TEMP_WORKFLOW_NAME,
			active: false,
			connections: {},
			nodes: Object.values(this.workflow.nodes),
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	/**
	 * Returns the available options via a predefined method
	 *
	 * @param {string} methodName The name of the method of which to get the data from
	 * @param {IWorkflowExecuteAdditionalData} additionalData
	 * @returns {Promise<INodePropertyOptions[]>}
	 * @memberof LoadNodeParameterOptions
	 */
	async getOptionsViaMethodName(
		methodName: string,
		additionalData: IWorkflowExecuteAdditionalData,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const node = this.workflow.getNode(TEMP_NODE_NAME);

		if (!node) {
			throw new Error(`Failed to find node ${TEMP_NODE_NAME}`);
		}

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node.type, node?.typeVersion);

		if (!nodeType?.methods?.listSearch || !nodeType.methods.listSearch[methodName]) {
			throw new Error(
				`The node-type "${node.type}" does not have the method "${methodName}" defined!`,
			);
		}

		const loadOptionsFunctions = NodeExecuteFunctions.getLoadOptionsFunctions(
			this.workflow,
			node,
			this.path,
			additionalData,
		);

		const listSearchMethod = nodeType.methods.listSearch[methodName];

		const isCachedNode = typeof listSearchMethod === 'string';

		if (!isCachedNode) {
			return nodeType.methods.listSearch[methodName].call(
				loadOptionsFunctions,
				filter,
				paginationToken,
			);
		}

		// cached node contains stub method, so require dist node at runtime

		const distNode = requireDistNode(nodeType, this.workflow);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return distNode.methods.listSearch[methodName].call(
			loadOptionsFunctions,
			filter,
			paginationToken,
		);
	}
}
