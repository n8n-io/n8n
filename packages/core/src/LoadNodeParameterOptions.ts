import {
	INode,
	INodeCredentials,
	INodeParameters,
	INodePropertyOptions,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import {
	NodeExecuteFunctions,
} from './';


const TEMP_NODE_NAME = 'Temp-Node';
const TEMP_WORKFLOW_NAME = 'Temp-Workflow';


export class LoadNodeParameterOptions {
	path: string;
	workflow: Workflow;


	constructor(nodeTypeName: string, nodeTypes: INodeTypes, path: string, currentNodeParameters: INodeParameters, credentials?: INodeCredentials) {
		this.path = path;
		const nodeType = nodeTypes.getByName(nodeTypeName);

		if (nodeType === undefined) {
			throw new Error(`The node-type "${nodeTypeName}"  is not known!`);
		}

		const nodeData: INode = {
			parameters: currentNodeParameters,
			name: TEMP_NODE_NAME,
			type: nodeTypeName,
			typeVersion: 1,
			position: [
				0,
				0,
			],
		};

		if (credentials) {
			nodeData.credentials = credentials;
		}

		const workflowData = {
			nodes: [
				nodeData,
			],
			connections: {},
		};

		this.workflow = new Workflow({ nodes: workflowData.nodes, connections: workflowData.connections, active: false, nodeTypes });
	}


	/**
	 * Returns data of a fake workflow
	 *
	 * @returns
	 * @memberof LoadNodeParameterOptions
	 */
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
	 * Returns the available options
	 *
	 * @param {string} methodName The name of the method of which to get the data from
	 * @param {IWorkflowExecuteAdditionalData} additionalData
	 * @returns {Promise<INodePropertyOptions[]>}
	 * @memberof LoadNodeParameterOptions
	 */
	getOptions(methodName: string, additionalData: IWorkflowExecuteAdditionalData): Promise<INodePropertyOptions[]> {
		const node = this.workflow.getNode(TEMP_NODE_NAME);

		const nodeType = this.workflow.nodeTypes.getByName(node!.type);

		if (nodeType!.methods === undefined || nodeType!.methods.loadOptions === undefined || nodeType!.methods.loadOptions[methodName] === undefined) {
			throw new Error(`The node-type "${node!.type}" does not have the method "${methodName}" defined!`);
		}

		const thisArgs = NodeExecuteFunctions.getLoadOptionsFunctions(this.workflow, node!, this.path, additionalData);

		return nodeType!.methods.loadOptions[methodName].call(thisArgs);
	}

}
