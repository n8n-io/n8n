import get from 'lodash/get';
import { ApplicationError, resolveRelativePath, Workflow } from 'n8n-workflow';
import type {
	INode,
	INodeParameterResourceLocator,
	IWorkflowBase,
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

	/**
	 * Load workflow from database using workflowId from current node parameters
	 * @returns Loaded workflow or null if workflowId not found/invalid
	 */
	private async loadWorkflow(): Promise<IWorkflowBase | null> {
		const workflowIdParam = this.getCurrentNodeParameter('workflowId');

		if (!workflowIdParam || typeof workflowIdParam !== 'object') {
			return null;
		}

		const { value: workflowId } = workflowIdParam as INodeParameterResourceLocator;

		if (typeof workflowId !== 'string' || !workflowId) {
			return null;
		}

		return await this.workflowLoader.get(workflowId);
	}

	async getWorkflowNodeContext(
		nodeType: string,
		nodeName?: string,
	): Promise<IWorkflowNodeContext | null> {
		const dbWorkflow = await this.loadWorkflow();

		if (!dbWorkflow) {
			throw new ApplicationError(`No workflowId parameter defined on node of type "${nodeType}"!`);
		}

		// Filter by type, optionally by name, and exclude disabled nodes
		const selectedWorkflowNode = dbWorkflow.nodes.find(
			(node) => node.type === nodeType && (!nodeName || node.name === nodeName) && !node.disabled,
		);

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

	/**
	 * Load all nodes from the selected workflow.
	 * Reads the workflowId from current node parameters, loads the workflow from database,
	 * and returns all non-disabled nodes (optionally filtered by type).
	 *
	 * @param nodeTypeFilter - Optional node type to filter by (e.g., 'n8n-nodes-base.executeWorkflowTrigger')
	 * @returns Array of non-disabled nodes matching the filter, or empty array if workflowId not found
	 */
	async getAllWorkflowNodes(nodeTypeFilter?: string): Promise<INode[]> {
		const dbWorkflow = await this.loadWorkflow();

		if (!dbWorkflow) {
			return [];
		}

		// Filter by node type if specified, and exclude disabled nodes
		if (nodeTypeFilter) {
			return dbWorkflow.nodes.filter((node) => node.type === nodeTypeFilter && !node.disabled);
		}

		return dbWorkflow.nodes.filter((node) => !node.disabled);
	}
}
