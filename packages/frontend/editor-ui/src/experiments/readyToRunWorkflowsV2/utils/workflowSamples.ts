import { ApplicationError } from 'n8n-workflow';
import type { WorkflowDataWithTemplateId } from '@/Interface';
import { isWorkflowDataWithTemplateId } from '@/utils/templates/typeGuards';
import { READY_TO_RUN_WORKFLOW } from '../workflows/ai-workflow';

const getWorkflowJson = (json: unknown): WorkflowDataWithTemplateId => {
	if (!isWorkflowDataWithTemplateId(json)) {
		throw new ApplicationError('Invalid workflow template JSON structure');
	}

	return json;
};

export const getReadyToRunAIWorkflow = (): WorkflowDataWithTemplateId => {
	return getWorkflowJson(READY_TO_RUN_WORKFLOW);
};
