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
		placeholder: 'e.g. Summarize the following…',
		typeOptions: {
			rows: 4,
		},
	},
	{
		displayName: 'System Message',
		name: 'systemMessage',
		type: 'string',
		default: '',
		placeholder: 'Optional instructions for the model',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Temperature',
		name: 'temperature',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
		default: 1,
	},
	{
		displayName: 'Max Tokens',
		name: 'maxTokens',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1024,
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return only the assistant text and usage metadata',
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model =
		(this.getNodeParameter(MODEL_PARAM, i, '') as string) || DEFAULT_MODEL_FOR_RESOURCE.text;
	const prompt = this.getNodeParameter('prompt', i, '') as string;
	const systemMessage = this.getNodeParameter('systemMessage', i, '') as string;
	const temperature = this.getNodeParameter('temperature', i, 1) as number;
	const maxTokens = this.getNodeParameter('maxTokens', i, 1024) as number;
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
	};

	const response = await chatCompletion.call(this, i, body);

	const json = simplify ? toSimplifiedOutput(response) : toFullOutput(response);
	if (!simplify) {
		(json as IDataObject).output = getMessageContent(response);
	}

	return [{ json, pairedItem: { item: i } }];
}
