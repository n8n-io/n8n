import { ApplicationError, type INodeTypeNameVersion } from 'n8n-workflow';
import type { WorkflowDataWithTemplateId } from '@/Interface';
import { isWorkflowDataWithTemplateId } from './typeGuards';
/* eslint-disable import-x/extensions */
import easyAiStarterJson from './samples/easy_ai_starter.json';
import ragStarterJson from './samples/rag_starter.json';
import buildYourFirstAiAgentJson from './samples/tutorial/build_your_first_ai_agent.json';
import jsonBasicsJson from './samples/tutorial/json_basics.json';
import expressionsTutorialJson from './samples/tutorial/expressions_tutorial.json';
import workflowLogicJson from './samples/tutorial/workflow_logic.json';
import apiFundamentalsJson from './samples/tutorial/api_fundamentals.json';
/* eslint-enable import-x/extensions */

const getWorkflowJson = (json: unknown): WorkflowDataWithTemplateId => {
	if (!isWorkflowDataWithTemplateId(json)) {
		throw new ApplicationError('Invalid workflow template JSON structure');
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

export const TutorialTemplates = {
	BuildYourFirstAiAgent: getWorkflowJson(buildYourFirstAiAgentJson).meta.templateId,
	JsonBasics: getWorkflowJson(jsonBasicsJson).meta.templateId,
	Expressions: getWorkflowJson(expressionsTutorialJson).meta.templateId,
	WorkflowLogic: getWorkflowJson(workflowLogicJson).meta.templateId,
	ApiFundamentals: getWorkflowJson(apiFundamentalsJson).meta.templateId,
} as const;

export const isTutorialTemplateId = (value: string): boolean => {
	return Object.values(TutorialTemplates).includes(value);
};

interface SampleTemplate {
	template: WorkflowDataWithTemplateId;
	name: string;
	description: string;
	nodes: INodeTypeNameVersion[];
}

export const getTutorialTemplates = (): SampleTemplate[] => {
	return [
		{
			name: 'Build your first AI agent',
			description:
				'This template launches your very first AI Agent —an AI-powered chatbot that can do more than just talk— it can take action using tools.',
			template: getWorkflowJson(buildYourFirstAiAgentJson),
			nodes: [],
		},
		{
			name: 'JSON basics',
			description:
				'Designed to teach you the absolute basics of JSON (JavaScript Object Notation) and, more importantly, how to use it within n8n.',
			template: getWorkflowJson(jsonBasicsJson),
			nodes: [],
		},
		{
			name: 'Expressions',
			description:
				'Step-by-step tutorial designed to teach you the most important skill in n8n: using expressions to access and manipulate data.',
			template: getWorkflowJson(expressionsTutorialJson),
			nodes: [],
		},
		{
			name: 'Workflow logic',
			description:
				'This template is a hands-on tutorial that teaches you the three most fundamental nodes for controlling the flow of your automations: Merge, IF, and Switch.',
			template: getWorkflowJson(workflowLogicJson),
			nodes: [],
		},
		{
			name: 'API fundamentals',
			description:
				'Hands-on tutorial designed to demystify what an API is and how it works, right inside your n8n canvas.',
			template: getWorkflowJson(apiFundamentalsJson),
			nodes: [],
		},
	];
};

export const getSampleWorkflowByTemplateId = (
	templateId: string,
): WorkflowDataWithTemplateId | undefined => {
	const workflows = [
		getEasyAiWorkflowJson(),
		getRagStarterWorkflowJson(),
		...getTutorialTemplates().map((tutorial) => tutorial.template),
	];

	return workflows.find((workflow) => workflow.meta.templateId === templateId);
};
