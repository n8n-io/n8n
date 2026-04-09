/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as image from './image';
import * as text from './text';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Moonshot Kimi',
	name: 'moonshot',
	icon: { light: 'file:moonshot.svg', dark: 'file:moonshot.dark.svg' },
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with Moonshot Kimi AI models',
	defaults: {
		name: 'Moonshot Kimi',
	},
	usableAsTool: true,
	codex: {
		alias: ['kimi', 'moonshot', 'LangChain', 'image', 'vision'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.moonshot/',
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
			name: 'moonshotApi',
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
