import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';
import {
	NodeHelpers,
	type INode,
	type INodeInputConfiguration,
	type INodeIssues,
	type INodeTypeDescription,
	type NodeConnectionType,
	type Workflow,
} from 'n8n-workflow';

// TODO: This composable currently delegates to workflowsStore.workflowObject for reads.
// The long-term goal is to remove workflowsStore entirely — workflowObject will become
// private state owned by workflowDocumentStore. Once that happens, the direct import
// (and the import-cycle warning it causes) will go away.
export function useWorkflowDocumentNodeHelpers() {
	const workflowsStore = useWorkflowsStore();
	const nodeHelpers = useNodeHelpers();

	function getNodeIssues(
		nodeType: INodeTypeDescription | null,
		node: INodeUi,
		ignoreIssues?: string[],
	): INodeIssues | null {
		return nodeHelpers.getNodeIssues(
			nodeType,
			node,
			workflowsStore.workflowObject as Workflow,
			ignoreIssues,
		);
	}

	function getNodeInputs(
		node: INode,
		nodeTypeData: INodeTypeDescription,
	): Array<NodeConnectionType | INodeInputConfiguration> {
		return NodeHelpers.getNodeInputs(workflowsStore.workflowObject as Workflow, node, nodeTypeData);
	}

	return {
		getNodeIssues,
		getNodeInputs,
	};
}
