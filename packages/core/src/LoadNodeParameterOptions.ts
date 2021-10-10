/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
	INode,
	INodeCredentials,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeNameVersion,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import { NodeExecuteFunctions } from '.';

const TEMP_NODE_NAME = 'Temp-Node';
const TEMP_WORKFLOW_NAME = 'Temp-Workflow';

export class LoadNodeParameterOptions {
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
		this.path = path;
		if (nodeType === undefined) {
			throw new Error(
				`The node-type "${nodeTypeNameAndVersion.name} v${nodeTypeNameAndVersion.version}"  is not known!`,
			);
		}

		const nodeData: INode = {
			parameters: currentNodeParameters,
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
	 * Returns the available options
	 *
	 * @param {string} methodName The name of the method of which to get the data from
	 * @param {IWorkflowExecuteAdditionalData} additionalData
	 * @returns {Promise<INodePropertyOptions[]>}
	 * @memberof LoadNodeParameterOptions
	 */
	async getOptions(
		methodName: string,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const node = this.workflow.getNode(TEMP_NODE_NAME);

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node!.type, node?.typeVersion);

		if (
			!nodeType ||
			nodeType.methods === undefined ||
			nodeType.methods.loadOptions === undefined ||
			nodeType.methods.loadOptions[methodName] === undefined
		) {
			throw new Error(
				`The node-type "${node!.type}" does not have the method "${methodName}" defined!`,
			);
		}

		const thisArgs = NodeExecuteFunctions.getLoadOptionsFunctions(
			this.workflow,
			node!,
			this.path,
			additionalData,
		);

		return nodeType.methods.loadOptions[methodName].call(thisArgs);
	}
}
