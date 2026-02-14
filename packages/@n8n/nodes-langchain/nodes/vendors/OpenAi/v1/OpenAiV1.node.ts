import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { listSearch, loadOptions } from '../methods';
import { router } from './actions/router';
import { configureNodeInputs } from '../helpers/description';

import * as assistant from './actions/assistant';
import * as audio from './actions/audio';
import * as file from './actions/file';
import * as image from './actions/image';
import * as text from './actions/text';

export class OpenAiV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8],
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
	}

	methods = {
		listSearch,
		loadOptions,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
