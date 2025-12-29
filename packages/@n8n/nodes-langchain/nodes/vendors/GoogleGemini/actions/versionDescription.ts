/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as audio from './audio';
import * as cache from './cache';
import * as document from './document';
import * as file from './file';
import * as image from './image';
import * as text from './text';
import * as video from './video';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Google Gemini',
	name: 'googleGemini',
	icon: 'file:gemini.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with Google Gemini AI models',
	defaults: {
		name: 'Google Gemini',
	},
	usableAsTool: true,
	codex: {
		alias: ['LangChain', 'video', 'document', 'audio', 'transcribe', 'assistant'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.googlegemini/',
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
			name: 'googlePalmApi',
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
					name: 'Cached Content',
					value: 'cache',
				},
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
		...cache.description,
		...document.description,
		...file.description,
		...image.description,
		...text.description,
		...video.description,
	],
};
