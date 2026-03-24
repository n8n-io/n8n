import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import {
	getMessageContent,
	toFullOutput,
	toSimplifiedOutput,
} from '../../helpers/formatChatResponse';
import { DEFAULT_MODEL_FOR_RESOURCE, MODEL_PARAM } from '../../helpers/modelParams';
import { chatCompletion } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		default: '',
		required: true,
		description:
			'Describe the JSON you need. The model returns JSON in the message content (include "json" in the prompt per provider requirements).',
		typeOptions: {
			rows: 4,
		},
	},
	{
		displayName: 'System Message',
		name: 'systemMessage',
		type: 'string',
		default: 'You are a helpful assistant that replies with valid JSON only.',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Temperature',
		name: 'temperature',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
		default: 0.2,
	},
	{
		displayName: 'Max Tokens',
		name: 'maxTokens',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 2048,
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
	},
];

const displayOptions = {
	show: {
		operation: ['json'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model =
		(this.getNodeParameter(MODEL_PARAM, i, '') as string) || DEFAULT_MODEL_FOR_RESOURCE.text;
	const prompt = this.getNodeParameter('prompt', i, '') as string;
	const systemMessage = this.getNodeParameter('systemMessage', i, '') as string;
	const temperature = this.getNodeParameter('temperature', i, 0.2) as number;
	const maxTokens = this.getNodeParameter('maxTokens', i, 2048) as number;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const messages: IDataObject[] = [];
	if (systemMessage.trim()) {
		messages.push({ role: 'system', content: systemMessage });
	}
	messages.push({ role: 'user', content: prompt });

	const body: IDataObject = {
		model,
		messages,
		temperature,
		max_tokens: maxTokens,
		response_format: { type: 'json_object' },
	};

	const response = await chatCompletion.call(this, i, body);

	const json = simplify ? toSimplifiedOutput(response) : toFullOutput(response);
	if (!simplify) {
		(json as IDataObject).output = getMessageContent(response);
	}

	return [{ json, pairedItem: { item: i } }];
}
