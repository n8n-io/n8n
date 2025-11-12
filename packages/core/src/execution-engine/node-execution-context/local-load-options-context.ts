import get from 'lodash/get';
import { ApplicationError, resolveRelativePath, Workflow } from 'n8n-workflow';
import type {
	INode,
	INodeParameterResourceLocator,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	ILocalLoadOptionsFunctions,
	IWorkflowLoader,
	IWorkflowNodeContext,
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

	async getWorkflowNodeContext(
		nodeType: string,
		nodeName?: string,
	): Promise<IWorkflowNodeContext | null> {
		const { value: workflowId } = this.getCurrentNodeParameter(
			'workflowId',
		) as INodeParameterResourceLocator;

		if (typeof workflowId !== 'string' || !workflowId) {
			throw new ApplicationError(`No workflowId parameter defined on node of type "${nodeType}"!`);
		}

		const dbWorkflow = await this.workflowLoader.get(workflowId);

		// Filter by type and optionally by name
		const selectedWorkflowNode = dbWorkflow.nodes.find((node) => {
			if (node.type !== nodeType) return false;
			if (nodeName && node.name !== nodeName) return false;
			return true;
		});

		if (selectedWorkflowNode) {
			const selectedSingleNodeWorkflow = new Workflow({
				id: dbWorkflow.id,
				name: dbWorkflow.name,
				nodes: [selectedWorkflowNode],
				connections: {},
				active: false,
				nodeTypes: this.nodeTypes,
			});

			const workflowAdditionalData = {
				...this.additionalData,
				currentNodeParameters: selectedWorkflowNode.parameters,
			};

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

		parameterPath = resolveRelativePath(this.path, parameterPath);

		return get(nodeParameters, parameterPath);
	}

	async getAllWorkflowNodes(nodeTypeFilter?: string): Promise<INode[]> {
		const { value: workflowId } = this.getCurrentNodeParameter(
			'workflowId',
		) as INodeParameterResourceLocator;

		if (typeof workflowId !== 'string' || !workflowId) {
			return [];
		}

		const dbWorkflow = await this.workflowLoader.get(workflowId);

		// Filter by node type if specified, and exclude disabled nodes
		if (nodeTypeFilter) {
			return dbWorkflow.nodes.filter((node) => node.type === nodeTypeFilter && !node.disabled);
		}

		return dbWorkflow.nodes.filter((node) => !node.disabled);
	}
}
