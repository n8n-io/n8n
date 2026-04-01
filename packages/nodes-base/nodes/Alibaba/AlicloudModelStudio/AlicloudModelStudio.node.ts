import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as text from './actions/text';
import * as image from './actions/image';
import * as video from './actions/video';

export class AlicloudModelStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Alibaba Cloud Model Studio',
		name: 'alicloudModelStudio',
		icon: 'file:alibaba.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with Alibaba Cloud Qwen models via Model Studio',
		defaults: {
			name: 'Alibaba Cloud Model Studio',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
			},
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'alibabaCloudApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://dashscope-intl.aliyuncs.com',
			headers: {
				'Content-Type': 'application/json',
			},
		},
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
		usableAsTool: undefined,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
