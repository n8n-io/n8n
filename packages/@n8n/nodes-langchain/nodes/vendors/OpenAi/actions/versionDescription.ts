/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import * as assistant from './assistant';
import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import * as text from './text';

const prettifyOperation = (operation: string) => {
	switch (operation) {
		case 'messageModel':
			return 'Message Model';
		case 'createAssistant':
			return 'Create Assistant';
		case 'messageAssistant':
			return 'Message Assistant';
		case 'deleteAssistant':
			return 'Delete Assistant';
		case 'listAssistants':
			return 'List Assistants';
		case 'updateAssistant':
			return 'Update Assistant';
		case 'uploadFile':
			return 'Upload File';
		case 'listFiles':
			return 'List Files';
		case 'deleteFile':
			return 'Delete File';
		case 'generateImage':
			return 'Generate Image';
		case 'generateAudio':
			return 'Generate Audio';
		case 'transcribeRecording':
			return 'Transcribe Recording';
		case 'translateRecording':
			return 'Translate Recording';
		case 'analyzeImage':
			return 'Analyze Image';
		case 'createModeration':
			return 'Create Moderation';
		default:
			return operation;
	}
};

const configureNodeInputs = (useCustomTools: boolean) => {
	if (useCustomTools) {
		return [
			{ type: NodeConnectionType.Main },
			{ type: NodeConnectionType.AiTool, displayName: 'Tools' },
		];
	}

	return [NodeConnectionType.Main];
};

// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
export const versionDescription: INodeTypeDescription = {
	displayName: 'OpenAI',
	name: 'openAi',
	icon: 'file:openAi.svg',
	group: ['transform'],
	version: 1,
	subtitle: `={{(${prettifyOperation})($parameter.operation)}}`,
	description: 'E.g. message an assistant. (The other AI nodes can also use OpenAI models)',
	defaults: {
		name: 'OpenAI',
	},
	codex: {
		alias: ['LangChain'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.openai/',
				},
			],
		},
	},
	inputs: `={{(${configureNodeInputs})($parameter.useCustomTools)}}`,
	outputs: ['main'],
	credentials: [
		{
			name: 'openAiApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Assistant',
					value: 'assistant',
				},
				{
					name: 'Text',
					value: 'text',
				},
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'Audio',
					value: 'audio',
				},
				{
					name: 'File',
					value: 'file',
				},
			],
			default: 'text',
		},
		...assistant.description,
		...audio.description,
		...file.description,
		...image.description,
		...text.description,
	],
};
