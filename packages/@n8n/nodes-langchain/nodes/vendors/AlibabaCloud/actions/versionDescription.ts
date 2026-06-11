/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as text from './text';
import * as image from './image';
import * as video from './video';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Alibaba Cloud Model Studio',
	name: 'alibabaCloud',
	icon: 'file:alibaba.svg',
	group: ['transform'],
	version: [1, 1.1],
	defaultVersion: 1.1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with Alibaba Cloud Qwen models via Model Studio',
	defaults: {
		name: 'Alibaba Cloud Model Studio',
	},
	usableAsTool: true,
	codex: {
		alias: ['qwen', 'dashscope', 'alibaba', 'model studio', 'video', 'image'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.alibabacloud/',
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
			name: 'alibabaCloudApi',
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
					name: 'Text',
					value: 'text',
				},
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'Video',
					value: 'video',
				},
			],
			default: 'text',
		},
		...text.description,
		...image.description,
		...video.description,
	],
};
