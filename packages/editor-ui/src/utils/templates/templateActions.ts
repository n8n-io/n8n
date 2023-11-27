import type { INodeUi, IWorkflowData, IWorkflowTemplate } from '@/Interface';
import { getNewWorkflow } from '@/api/workflows';
import type { useRootStore } from '@/stores/n8nRoot.store';
import type { useWorkflowsStore } from '@/stores/workflows.store';
import { getFixedNodesList } from '@/utils/nodeViewUtils';
import { replaceAllTemplateNodeCredentials } from '@/utils/templates/templateTransforms';
import type { INodeCredentialsDetails } from 'n8n-workflow';

/**
 * Creates a new workflow from a template
 */
export async function createWorkflowFromTemplate(
	template: IWorkflowTemplate,
	credentialOverrides: Record<string, INodeCredentialsDetails>,
	rootStore: ReturnType<typeof useRootStore>,
	workflowsStore: ReturnType<typeof useWorkflowsStore>,
) {
	const workflowData = await getNewWorkflow(rootStore.getRestApiContext, template.name);
	const nodesWithCreds = replaceAllTemplateNodeCredentials(
		template.workflow.nodes,
		credentialOverrides,
	);
	const nodes = getFixedNodesList(nodesWithCreds) as INodeUi[];
	const connections = template.workflow.connections;

	const workflowToCreate: IWorkflowData = {
		name: workflowData.name,
		nodes,
		connections,
		active: false,
		// Ignored: pinData, settings, tags, versionId, meta
	};

	const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);

	return createdWorkflow;
}
