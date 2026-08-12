import { UnexpectedError, type INodeTypeNameVersion } from 'n8n-workflow';
import type { WorkflowDataWithTemplateId } from '@/Interface';
import { isWorkflowDataWithTemplateId } from './typeGuards';
/* eslint-disable import-x/extensions */
import easyAiStarterJson from './samples/easy_ai_starter.json';
import ragStarterJson from './samples/rag_starter.json';
import gmailStarterJson from './samples/starter/gmail.json';
import slackStarterJson from './samples/starter/slack.json';
import telegramStarterJson from './samples/starter/telegram.json';
import loopStarterJson from './samples/starter/loop.json';
import ifStarterJson from './samples/starter/if.json';
import httpRequestStarterJson from './samples/starter/http_request.json';
import buildYourFirstAiAgentJson from './samples/tutorial/build_your_first_ai_agent.json';
import jsonBasicsJson from './samples/tutorial/json_basics.json';
import expressionsTutorialJson from './samples/tutorial/expressions_tutorial.json';
import workflowLogicJson from './samples/tutorial/workflow_logic.json';
import apiFundamentalsJson from './samples/tutorial/api_fundamentals.json';
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

export interface StarterTemplate {
	/** Stable key used to build the i18n keys for the node creator tile */
	key: string;
	template: WorkflowDataWithTemplateId;
	/** Key nodes shown as icons on the node creator tile */
	nodes: INodeTypeNameVersion[];
}

export const getStarterTemplates = (): StarterTemplate[] => {
	return [
		{
			key: 'gmail',
			template: getWorkflowJson(gmailStarterJson),
			nodes: [{ name: 'n8n-nodes-base.gmail', version: 2.2 }],
		},
		{
			key: 'slack',
			template: getWorkflowJson(slackStarterJson),
			nodes: [{ name: 'n8n-nodes-base.slack', version: 2.7 }],
		},
		{
			key: 'telegram',
			template: getWorkflowJson(telegramStarterJson),
			nodes: [
				{ name: 'n8n-nodes-base.telegramTrigger', version: 1.5 },
				{ name: 'n8n-nodes-base.telegram', version: 1.2 },
			],
		},
		{
			key: 'loop',
			template: getWorkflowJson(loopStarterJson),
			nodes: [
				{ name: 'n8n-nodes-base.splitInBatches', version: 3 },
				{ name: 'n8n-nodes-base.code', version: 2 },
			],
		},
		{
			key: 'if',
			template: getWorkflowJson(ifStarterJson),
			nodes: [{ name: 'n8n-nodes-base.if', version: 2.3 }],
		},
		{
			key: 'httpRequest',
			template: getWorkflowJson(httpRequestStarterJson),
			nodes: [{ name: 'n8n-nodes-base.httpRequest', version: 4.5 }],
		},
	];
};

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
		...getStarterTemplates().map((starter) => starter.template),
		...getTutorialTemplates().map((tutorial) => tutorial.template),
	];

	return workflows.find((workflow) => workflow.meta.templateId === templateId);
};
