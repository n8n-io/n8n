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
		displayName: 'Audio URL',
		name: 'audioUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/audio.mp3',
		description: 'Public HTTPS URL of the audio file',
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		default: 'Transcribe the audio accurately. Reply with the transcript only.',
		typeOptions: { rows: 2 },
	},
	{
		displayName: 'Temperature',
		name: 'temperature',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
		default: 0,
	},
	{
		displayName: 'Max Tokens',
		name: 'maxTokens',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 4096,
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
		operation: ['transcribe'],
		resource: ['audio'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model =
		(this.getNodeParameter(MODEL_PARAM, i, '') as string) || DEFAULT_MODEL_FOR_RESOURCE.audio;
	const audioUrl = this.getNodeParameter('audioUrl', i, '') as string;
	const instructions = this.getNodeParameter('instructions', i, '') as string;
	const temperature = this.getNodeParameter('temperature', i, 0) as number;
	const maxTokens = this.getNodeParameter('maxTokens', i, 4096) as number;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const userMessage = `${instructions}\n\nAudio URL: ${audioUrl}`;

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
