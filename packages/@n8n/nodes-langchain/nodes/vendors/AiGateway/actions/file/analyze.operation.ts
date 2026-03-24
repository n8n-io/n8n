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
		description: 'What to ask about the file',
		typeOptions: {
			rows: 3,
		},
	},
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/document.pdf',
		description: 'Public HTTPS URL of the file (must be reachable by the model provider)',
	},
	{
		displayName: 'Temperature',
		name: 'temperature',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
		default: 0.5,
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
		operation: ['analyze'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model =
		(this.getNodeParameter(MODEL_PARAM, i, '') as string) || DEFAULT_MODEL_FOR_RESOURCE.file;
	const prompt = this.getNodeParameter('prompt', i, '') as string;
	const fileUrl = this.getNodeParameter('fileUrl', i, '') as string;
	const temperature = this.getNodeParameter('temperature', i, 0.5) as number;
	const maxTokens = this.getNodeParameter('maxTokens', i, 2048) as number;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const userMessage = `${prompt}\n\nFile URL: ${fileUrl}`;

	const body: IDataObject = {
		model,
		messages: [{ role: 'user', content: userMessage }],
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
