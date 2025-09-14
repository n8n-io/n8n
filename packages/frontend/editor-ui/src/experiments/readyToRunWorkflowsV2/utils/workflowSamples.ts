import { ApplicationError, deepCopy, OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import type { WorkflowDataWithTemplateId } from '@/Interface';
import { isWorkflowDataWithTemplateId } from '@/utils/templates/typeGuards';
import { READY_TO_RUN_WORKFLOW_V1 } from '../workflows/ai-workflow';
import { READY_TO_RUN_WORKFLOW_V2 } from '../workflows/ai-workflow-v2';

const getWorkflowJson = (json: unknown): WorkflowDataWithTemplateId => {
	if (!isWorkflowDataWithTemplateId(json)) {
		throw new ApplicationError('Invalid workflow template JSON structure');
	}

	return json;
};

/**
 * Injects OpenAI credentials into workflow template if available in localStorage
 */
const injectOpenAiCredentialIntoWorkflow = (
	workflow: WorkflowDataWithTemplateId,
): WorkflowDataWithTemplateId => {
	const credentialId = localStorage.getItem('N8N_READY_TO_RUN_V2_OPENAI_CREDENTIAL_ID');

	if (!credentialId) {
		return workflow;
	}

	const clonedWorkflow = deepCopy(workflow);

	if (clonedWorkflow.nodes) {
		const openAiNode = clonedWorkflow.nodes.find((node) => node.name === 'OpenAI Model');
		if (openAiNode) {
			openAiNode.credentials ??= {};
			openAiNode.credentials[OPEN_AI_API_CREDENTIAL_TYPE] = {
				id: credentialId,
				name: '',
			};
		}
	}

	return clonedWorkflow;
};

export const getReadyToRunAIWorkflows = (): WorkflowDataWithTemplateId[] => {
	return [
		injectOpenAiCredentialIntoWorkflow(getWorkflowJson(READY_TO_RUN_WORKFLOW_V1)),
		injectOpenAiCredentialIntoWorkflow(getWorkflowJson(READY_TO_RUN_WORKFLOW_V2)),
	];
};
