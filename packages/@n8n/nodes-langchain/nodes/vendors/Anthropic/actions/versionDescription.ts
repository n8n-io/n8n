/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as document from './document';
import * as file from './file';
import * as image from './image';
import * as prompt from './prompt';
import * as text from './text';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Anthropic',
	name: 'anthropic',
	icon: 'file:anthropic.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with Anthropic AI models',
	defaults: {
		name: 'Anthropic',
	},
	usableAsTool: true,
	codex: {
		alias: ['LangChain', 'document', 'image', 'assistant', 'claude'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.anthropic/',
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
			name: 'anthropicApi',
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
					name: 'Document',
					value: 'document',
				},
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'Prompt',
					value: 'prompt',
				},
				{
					name: 'Text',
					value: 'text',
				},
			],
			default: 'text',
		},
		...document.description,
		...file.description,
		...image.description,
		...prompt.description,
		...text.description,
	],
};
