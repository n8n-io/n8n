import get from 'lodash/get';
import { resolveRelativePath, Workflow } from 'n8n-workflow';
import type {
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
		preferActiveVersion: boolean = false,
	): Promise<IWorkflowNodeContext | null> {
		const workflowIdParam = this.getCurrentNodeParameter('workflowId') as
			| INodeParameterResourceLocator
			| undefined;
		const workflowId = workflowIdParam?.value;

		if (typeof workflowId !== 'string' || !workflowId) {
			return null;
		}

		const dbWorkflow = await this.workflowLoader.get(workflowId);

		// The active version gates existence: it must contain the requested node for
		// the mapping to be exposed at all. The draft nodes are only used directly when
		// no active version is preferred/available.
		const activeVersion = preferActiveVersion ? dbWorkflow.activeVersion : null;
		const selectedWorkflowNode = (activeVersion ? activeVersion.nodes : dbWorkflow.nodes).find(
			(node) => node.type === nodeType,
		);

		if (!selectedWorkflowNode) {
			return null;
		}

		// The active version is a snapshot taken at publish time and can lag behind the
		// latest saved draft. When the same node still exists in the draft, prefer its
		// definition so inputs added/edited after publishing surface in the parent
		// node's mapping (ADO-5610).
		// Node names are unique within a workflow, so matching by name identifies the
		// draft counterpart of the node found in the active version.
		const draftWorkflowNode = activeVersion
			? dbWorkflow.nodes.find((node) => node.name === selectedWorkflowNode.name)
			: undefined;

		const nodeForContext = draftWorkflowNode ?? selectedWorkflowNode;

		const selectedSingleNodeWorkflow = new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: [nodeForContext],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		const workflowAdditionalData = {
			...this.additionalData,
			currentNodeParameters: nodeForContext.parameters,
		};

		return new LoadWorkflowNodeContext(
			selectedSingleNodeWorkflow,
			nodeForContext,
			workflowAdditionalData,
		);
	}

	getCurrentNodeParameter(parameterPath: string): NodeParameterValueType | object | undefined {
		const nodeParameters = this.additionalData.currentNodeParameters;

		parameterPath = resolveRelativePath(this.path, parameterPath);

		return get(nodeParameters, parameterPath);
	}
}
