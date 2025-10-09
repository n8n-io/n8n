import {
	AIMessagePromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { IDataObject, INodeInputConfiguration, INodeProperties } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode } from '@utils/descriptions';
import { getBatchingOptionFields, getTemplateNoticeField } from '@utils/sharedFields';

/**
 * Dynamic input configuration generation based on node parameters
 */
export function getInputs(parameters: IDataObject) {
	const inputs: INodeInputConfiguration[] = [
		{ displayName: '', type: 'main' },
		{
			displayName: 'Model',
			maxConnections: 1,
			type: 'ai_languageModel',
			required: true,
		},
	];

	const needsFallback = parameters?.needsFallback;

	if (needsFallback === true) {
		inputs.push({
			displayName: 'Fallback Model',
			maxConnections: 1,
			type: 'ai_languageModel',
			required: true,
		});
	}

	// If `hasOutputParser` is undefined it must be version 1.3 or earlier so we
	// always add the output parser input
	const hasOutputParser = parameters?.hasOutputParser;
	if (hasOutputParser === undefined || hasOutputParser === true) {
		inputs.push({
			displayName: 'Output Parser',
			type: 'ai_outputParser',
			maxConnections: 1,
			required: false,
		});
	}

	return inputs;
}

/**
 * Node properties configuration
 */
export const nodeProperties: INodeProperties[] = [
	getTemplateNoticeField(1978),
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '={{ $json.input }}',
		displayOptions: {
			show: {
				'@version': [1],
			},
		},
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '={{ $json.chat_input }}',
		displayOptions: {
			show: {
				'@version': [1.1, 1.2],
			},
		},
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '={{ $json.chatInput }}',
		displayOptions: {
			show: {
				'@version': [1.3],
			},
		},
	},
	{
		...promptTypeOptions,
		displayOptions: {
			hide: {
				'@version': [1, 1.1, 1.2, 1.3],
			},
		},
	},
	{
		...textFromPreviousNode,
		displayOptions: { show: { promptType: ['auto'], '@version': [{ _cnd: { gte: 1.5 } }] } },
	},
	{
		displayName: 'Prompt (User Message)',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Hello, how can you help me?',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				promptType: ['define'],
			},
		},
	},
	{
		displayName: 'Require Specific Output Format',
		name: 'hasOutputParser',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		displayOptions: {
			hide: {
				'@version': [1, 1.1, 1.3],
			},
		},
	},
	{
		displayName: 'Enable Fallback Model',
		name: 'needsFallback',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		displayOptions: {
			hide: {
				'@version': [1, 1.1, 1.3],
			},
		},
	},
	{
		displayName: 'Chat Messages (if Using a Chat Model)',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add prompt',
		options: [
			{
				name: 'messageValues',
				displayName: 'Prompt',
				values: [
					{
						displayName: 'Type Name or ID',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'AI',
								value: AIMessagePromptTemplate.lc_name(),
							},
							{
								name: 'System',
								value: SystemMessagePromptTemplate.lc_name(),
							},
							{
								name: 'User',
								value: HumanMessagePromptTemplate.lc_name(),
							},
						],
						default: SystemMessagePromptTemplate.lc_name(),
					},
					{
						displayName: 'Message Type',
						name: 'messageType',
						type: 'options',
						displayOptions: {
							show: {
								type: [HumanMessagePromptTemplate.lc_name()],
							},
						},
						options: [
							{
								name: 'Text',
								value: 'text',
								description: 'Simple text message',
							},
							{
								name: 'Image (Binary)',
								value: 'imageBinary',
								description: 'Process the binary input from the previous node',
							},
							{
								name: 'Image (URL)',
								value: 'imageUrl',
								description: 'Process the image from the specified URL',
							},
						],
						default: 'text',
					},
					{
						displayName: 'Image Data Field Name',
						name: 'binaryImageDataKey',
						type: 'string',
						default: 'data',
						required: true,
						description:
							"The name of the field in the chain's input that contains the binary image file to be processed",
						displayOptions: {
							show: {
								messageType: ['imageBinary'],
							},
						},
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						required: true,
						description: 'URL to the image to be processed',
						displayOptions: {
							show: {
								messageType: ['imageUrl'],
							},
						},
					},
					{
						displayName: 'Image Details',
						description:
							'Control how the model processes the image and generates its textual understanding',
						name: 'imageDetail',
						type: 'options',
						displayOptions: {
							show: {
								type: [HumanMessagePromptTemplate.lc_name()],
								messageType: ['imageBinary', 'imageUrl'],
							},
						},
						options: [
							{
								name: 'Auto',
								value: 'auto',
								description:
									'Model will use the auto setting which will look at the image input size and decide if it should use the low or high setting',
							},
							{
								name: 'Low',
								value: 'low',
								description:
									'The model will receive a low-res 512px x 512px version of the image, and represent the image with a budget of 65 tokens. This allows the API to return faster responses and consume fewer input tokens for use cases that do not require high detail.',
							},
							{
								name: 'High',
								value: 'high',
								description:
									'Allows the model to see the low res image and then creates detailed crops of input images as 512px squares based on the input image size. Each of the detailed crops uses twice the token budget (65 tokens) for a total of 129 tokens.',
							},
						],
						default: 'auto',
					},

					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						required: true,
						displayOptions: {
							hide: {
								messageType: ['imageBinary', 'imageUrl'],
							},
						},
						default: '',
					},
				],
			},
		],
	},
	getBatchingOptionFields({
		show: {
			'@version': [{ _cnd: { gte: 1.7 } }],
		},
	}),
	{
		displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				hasOutputParser: [true],
			},
		},
	},
	{
		displayName:
			'Connect an additional language model on the canvas to use it as a fallback if the main model fails',
		name: 'fallbackNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				needsFallback: [true],
			},
		},
	},
];
