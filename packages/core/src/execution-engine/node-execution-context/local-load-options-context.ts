import get from 'lodash/get';
import { resolveRelativePath, Workflow } from 'n8n-workflow';
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

	private async loadSelectedWorkflow(preferActiveVersion: boolean) {
		const workflowIdParam = this.getCurrentNodeParameter('workflowId') as
			| INodeParameterResourceLocator
			| undefined;
		const workflowId = workflowIdParam?.value;

		if (typeof workflowId !== 'string' || !workflowId) {
			return null;
		}

		const dbWorkflow = await this.workflowLoader.get(workflowId);
		const nodes =
			preferActiveVersion && dbWorkflow.activeVersion
				? dbWorkflow.activeVersion.nodes
				: dbWorkflow.nodes;

		return { dbWorkflow, nodes };
	}

	async getWorkflowNodes(preferActiveVersion: boolean = false): Promise<INode[]> {
		const loaded = await this.loadSelectedWorkflow(preferActiveVersion);
		return loaded?.nodes ?? [];
	}

	async getWorkflowNodeContext(
		nodeType: string,
		preferActiveVersion: boolean = false,
		nodeName?: string,
	): Promise<IWorkflowNodeContext | null> {
		const loaded = await this.loadSelectedWorkflow(preferActiveVersion);

		if (!loaded) {
			return null;
		}

		const { dbWorkflow, nodes } = loaded;

		// When a node name is given, resolve that exact node; otherwise fall back
		// to the first node of the requested type.
		const selectedWorkflowNode = nodeName
			? nodes.find((node) => node.name === nodeName && node.type === nodeType)
			: nodes.find((node) => node.type === nodeType);

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
}
