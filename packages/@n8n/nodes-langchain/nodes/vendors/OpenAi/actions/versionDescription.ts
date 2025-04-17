/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeInputConfiguration, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as assistant from './assistant';
import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import * as text from './text';

const prettifyOperation = (resource: string, operation: string) => {
	if (operation === 'deleteAssistant') {
		return 'Delete Assistant';
	}

	if (operation === 'deleteFile') {
		return 'Delete File';
	}

	if (operation === 'classify') {
		return 'Classify Text';
	}

	if (operation === 'message' && resource === 'text') {
		return 'Message Model';
	}

	const capitalize = (str: string) => {
		const chars = str.split('');
		chars[0] = chars[0].toUpperCase();
		return chars.join('');
	};

	if (['transcribe', 'translate'].includes(operation)) {
		resource = 'recording';
	}

	if (operation === 'list') {
		resource = resource + 's';
	}

	return `${capitalize(operation)} ${capitalize(resource)}`;
};

const configureNodeInputs = (
	resource: string,
	operation: string,
	hideTools: string,
	memory: string | undefined,
) => {
	if (resource === 'assistant' && operation === 'message') {
		const inputs: INodeInputConfiguration[] = [
			{ type: 'main' },
			{ type: 'ai_tool', displayName: 'Tools' },
		];
		if (memory !== 'threadId') {
			inputs.push({ type: 'ai_memory', displayName: 'Memory', maxConnections: 1 });
		}
		return inputs;
	}
	if (resource === 'text' && operation === 'message') {
		if (hideTools === 'hide') {
			return ['main'];
		}
		return [{ type: 'main' }, { type: 'ai_tool', displayName: 'Tools' }];
	}

	return ['main'];
};

// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
export const versionDescription: INodeTypeDescription = {
	displayName: 'OpenAI',
	name: 'openAi',
	icon: { light: 'file:openAi.svg', dark: 'file:openAi.dark.svg' },
	group: ['transform'],
	version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8],
	subtitle: `={{(${prettifyOperation})($parameter.resource, $parameter.operation)}}`,
	description: 'Message an assistant or GPT, analyze images, generate audio, etc.',
	defaults: {
		name: 'OpenAI',
	},
	codex: {
		alias: ['LangChain', 'ChatGPT', 'DallE', 'whisper', 'audio', 'transcribe', 'tts', 'assistant'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/',
				},
			],
		},
	},
	inputs: `={{(${configureNodeInputs})($parameter.resource, $parameter.operation, $parameter.hideTools, $parameter.memory ?? undefined)}}`,
	outputs: [NodeConnectionTypes.Main],
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
