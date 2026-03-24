import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { configureNodeInputs } from '../helpers/description';
import { listSearch, loadOptions } from '../methods';
import { router } from './actions/router';

import * as audio from './actions/audio';
import * as conversation from './actions/conversation';
import * as file from './actions/file';
import * as image from './actions/image';
import * as text from './actions/text';
import * as video from './actions/video';

export class OpenAiV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2, 2.1],
			defaults: {
				name: 'OpenAI',
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
							name: 'Text',
							value: 'text',
							builderHint: {
								message:
									'For text generation, reasoning and tools, use AI Agent with OpenAI Chat Model instead of this resource.',
							},
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
						{
							name: 'Conversation',
							value: 'conversation',
						},
						{
							name: 'Video',
							value: 'video',
						},
					],
					default: 'text',
				},
				...audio.description,
				...file.description,
				...image.description,
				...text.description,
				...conversation.description,
				...video.description,
			],
		};
	}

	methods = {
		listSearch,
		loadOptions,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
