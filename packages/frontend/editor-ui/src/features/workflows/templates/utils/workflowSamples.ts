import { UnexpectedError } from 'n8n-workflow';
import type { WorkflowDataWithTemplateId } from '@/Interface';
import { isWorkflowDataWithTemplateId } from './typeGuards';
/* eslint-disable import-x/extensions */
import easyAiStarterJson from './samples/easy_ai_starter.json';
import ragStarterJson from './samples/rag_starter.json';
/* eslint-enable import-x/extensions */

const getWorkflowJson = (json: unknown): WorkflowDataWithTemplateId => {
	if (!isWorkflowDataWithTemplateId(json)) {
		throw new UnexpectedError('Invalid workflow template JSON structure');
	}

	return json;
};

export const getEasyAiWorkflowJson = (): WorkflowDataWithTemplateId => {
	return getWorkflowJson(easyAiStarterJson);
};

export const getRagStarterWorkflowJson = (): WorkflowDataWithTemplateId => {
	return getWorkflowJson(ragStarterJson);
};

export const SampleTemplates = {
	RagStarterTemplate: getRagStarterWorkflowJson().meta.templateId,
	EasyAiTemplate: getEasyAiWorkflowJson().meta.templateId,
} as const;

export const getSampleWorkflowByTemplateId = (
	templateId: string,
): WorkflowDataWithTemplateId | undefined => {
	const workflows = [getEasyAiWorkflowJson(), getRagStarterWorkflowJson()];

	return workflows.find((workflow) => workflow.meta.templateId === templateId);
};
