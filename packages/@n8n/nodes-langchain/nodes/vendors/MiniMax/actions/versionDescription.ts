/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as audio from './audio';
import * as image from './image';
import * as text from './text';
import * as video from './video';

export const versionDescription: INodeTypeDescription = {
	displayName: 'MiniMax',
	name: 'minimax',
	icon: 'file:minimax.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with MiniMax AI models',
	defaults: {
		name: 'MiniMax',
	},
	usableAsTool: true,
	codex: {
		alias: ['minimax', 'hailuo', 'LangChain', 'video', 'image', 'tts', 'speech'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.minimax/',
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
			name: 'minimaxApi',
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
					name: 'Audio',
					value: 'audio',
				},
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'Text',
					value: 'text',
				},
				{
					name: 'Video',
					value: 'video',
				},
			],
			default: 'text',
		},
		...audio.description,
		...image.description,
		...text.description,
		...video.description,
	],
};
