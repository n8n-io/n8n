/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as image from './image';
import * as text from './text';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Ollama',
	name: 'ollama',
	icon: 'file:ollama.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with Ollama AI models',
	defaults: {
		name: 'Ollama',
	},
	usableAsTool: true,
	codex: {
		alias: ['LangChain', 'image', 'vision', 'AI', 'local'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.ollama/',
				},
			],
		},
	},
	inputs: `={{
		(() => {
			const resource = $parameter.resource;
	  	const operation = $parameter.operation;
			if (resource === 'text' && operation === 'message') {
				return [{ type: 'main' }, { type: 'ai_tool', displayName: 'Tools' }];
			}

			return ['main'];
		})()
	}}`,
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'ollamaApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'Text',
					value: 'text',
				},
			],
			default: 'text',
		},
		...image.description,
		...text.description,
	],
};
