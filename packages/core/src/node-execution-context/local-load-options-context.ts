import { get } from 'lodash';
import { ApplicationError, deepCopy, Workflow } from 'n8n-workflow';
import type {
	INodeParameterResourceLocator,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	ILocalLoadOptionsFunctions,
	IWorkflowLoader,
	IWorkflowNodeContext,
	INode,
	INodeTypes,
} from 'n8n-workflow';

import { LoadWorkflowNodeContext } from './workflow-node-context';

export class LocalLoadOptionsContext implements ILocalLoadOptionsFunctions {
	constructor(
		private nodeTypes: INodeTypes,
		private additionalData: IWorkflowExecuteAdditionalData,
		private path: string,
		private workflowLoader: IWorkflowLoader,
	) {}

	async getWorkflowNodeContext(nodeType: string): Promise<IWorkflowNodeContext | null> {
		const { value } = this.getCurrentNodeParameter('workflowId') as INodeParameterResourceLocator;

		const workflowId = value as string;
		if (!workflowId) {
			throw new ApplicationError(`No workflowId parameter defined on node of type "${nodeType}"!`);
		}

		const dbWorkflow = await this.workflowLoader.get(workflowId);

		const selectedWorkflowNode = dbWorkflow.nodes.find((node) => node.type === nodeType) as INode;

		if (selectedWorkflowNode) {
			const selectedSingleNodeWorkflow = new Workflow({
				nodes: [selectedWorkflowNode],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
			});

			const workflowAdditionalData = { ...this.additionalData };
			workflowAdditionalData.currentNodeParameters = selectedWorkflowNode.parameters;

			return new LoadWorkflowNodeContext(
				selectedSingleNodeWorkflow,
				selectedWorkflowNode,
				workflowAdditionalData,
			);
		}

		return null;
	}

	getCurrentNodeParameter(parameterPath: string): NodeParameterValueType | object | undefined {
		const nodeParameters = this.additionalData.currentNodeParameters;

		if (parameterPath.startsWith('&')) {
			parameterPath = `${this.path.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
		}

		const returnData = get(nodeParameters, parameterPath);

		return returnData;
	}
}
