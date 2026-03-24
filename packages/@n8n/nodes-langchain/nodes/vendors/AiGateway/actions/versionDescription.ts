/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as audio from './audio';
import { modelSelector } from './descriptions';
import * as file from './file';
import * as image from './image';
import * as text from './text';

export const versionDescription: INodeTypeDescription = {
	displayName: 'AI Gateway',
	name: 'openRouterAiGateway',
	icon: { light: 'file:n8nAiGateway.svg', dark: 'file:n8nAiGateway.svg' },
	group: ['transform'],
	version: [1],
	defaultVersion: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with hundreds of AI models through one unified gateway',
	defaults: {
		name: 'AI Gateway',
	},
	usableAsTool: true,
	codex: {
		alias: ['OpenRouter', 'LLM', 'chat', 'vision', 'multimodal', 'transcribe'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://openrouter.ai/docs',
				},
			],
		},
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Text',
					value: 'text',
				},
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'Audio',
					value: 'audio',
				},
			],
			default: 'text',
		},
		// Operation dropdowns (one per resource, only one visible at a time)
		audio.description[0],
		file.description[0],
		image.description[0],
		text.description[0],
		// Model selector — always visible, positioned right after operation
		modelSelector,
		// Operation-specific fields (visible based on resource + operation)
		...audio.description.slice(1),
		...file.description.slice(1),
		...image.description.slice(1),
		...text.description.slice(1),
	],
};
