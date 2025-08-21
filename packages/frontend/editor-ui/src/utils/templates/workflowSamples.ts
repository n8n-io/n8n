import { ApplicationError, type INodeTypeNameVersion } from 'n8n-workflow';
import type { WorkflowDataWithTemplateId } from '@/Interface';
import { isWorkflowDataWithTemplateId } from '@/utils/templates/typeGuards';

/* eslint-disable import-x/extensions */
import easyAiStarterJson from '@/utils/templates/samples/easy_ai_starter.json';
import ragStarterJson from '@/utils/templates/samples/rag_starter.json';
import emailTriageAgentWithGmailJson from '@/utils/templates/samples/agents/email_triage_agent_with_gmail.json';
import jokeAgentWithHttpToolJson from '@/utils/templates/samples/agents/joke_agent_with_http_tool.json';
import knowledgeStoreAgentWithGoogleDriveJson from '@/utils/templates/samples/agents/knowledge_store_agent_with_google_drive.json';
import taskManagementAgentWithGoogleSheetsJson from '@/utils/templates/samples/agents/task_management_agent_with_google_sheets.json';
import voiceAssistantAgentWithTelegramAndGcalJson from '@/utils/templates/samples/agents/voice_assistant_agent_with_telegram_and_gcal.json';
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

export const PrebuiltAgentTemplates = {
	VoiceAssistantAgent: getWorkflowJson(voiceAssistantAgentWithTelegramAndGcalJson).meta.templateId,
	EmailTriageAgent: getWorkflowJson(emailTriageAgentWithGmailJson).meta.templateId,
	KnowledgeStoreAgent: getWorkflowJson(knowledgeStoreAgentWithGoogleDriveJson).meta.templateId,
	TaskManagementAgent: getWorkflowJson(taskManagementAgentWithGoogleSheetsJson).meta.templateId,
	JokeAgent: getWorkflowJson(jokeAgentWithHttpToolJson).meta.templateId,
} as const;

export const isPrebuiltAgentTemplateId = (value: string): boolean => {
	return Object.values(PrebuiltAgentTemplates).includes(value);
};

interface PrebuiltAgentTemplate {
	template: WorkflowDataWithTemplateId;
	name: string;
	description: string;
	nodes: INodeTypeNameVersion[];
}

export const getPrebuiltAgents = (): PrebuiltAgentTemplate[] => {
	return [
		{
			name: 'Voice assistant agent',
			description: 'Personal AI assistant in Telegram, handling both text and voice messages.',
			template: getWorkflowJson(voiceAssistantAgentWithTelegramAndGcalJson),
			nodes: [
				{
					name: 'n8n-nodes-base.telegram',
					version: 1.2,
				},
				{
					name: 'n8n-nodes-base.googleCalendar',
					version: 1.3,
				},
			],
		},
		{
			name: 'Email triage agent',
			description:
				'Categorizes new, unread emails by analyzing their content and applying relevant labels.',
			template: getWorkflowJson(emailTriageAgentWithGmailJson),
			nodes: [
				{
					name: 'n8n-nodes-base.gmail',
					version: 2.1,
				},
			],
		},
		{
			name: 'Knowledge store agent',
			description:
				'Retrieve, analyze, and answer questions using documents uploaded to Google Drive.',
			template: getWorkflowJson(knowledgeStoreAgentWithGoogleDriveJson),
			nodes: [
				{
					name: 'n8n-nodes-base.googleDrive',
					version: 3,
				},
			],
		},
		{
			name: 'Task management agent',
			description:
				'Task management assistant that helps users create, view, update, and delete tasks.',
			template: getWorkflowJson(taskManagementAgentWithGoogleSheetsJson),
			nodes: [
				{
					name: 'n8n-nodes-base.googleSheets',
					version: 4.7,
				},
			],
		},
		{
			name: 'Joke agent',
			description: 'Uses the Joke API via the HTTP tool to deliver fun, personalized jokes.',
			template: getWorkflowJson(jokeAgentWithHttpToolJson),
			nodes: [
				{
					name: 'n8n-nodes-base.httpRequest',
					version: 4.2,
				},
			],
		},
	];
};

export const getSampleWorkflowByTemplateId = (
	templateId: string,
): WorkflowDataWithTemplateId | undefined => {
	const workflows = [
		getEasyAiWorkflowJson(),
		getRagStarterWorkflowJson(),
		...getPrebuiltAgents().map((agent) => agent.template),
	];

	return workflows.find((workflow) => workflow.meta.templateId === templateId);
};
