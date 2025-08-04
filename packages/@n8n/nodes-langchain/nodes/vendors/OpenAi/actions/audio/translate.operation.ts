import FormData from 'form-data';
import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		hint: 'The name of the input field containing the binary file data to be processed',
		placeholder: 'e.g. data',
		description:
			'Name of the binary property which contains the audio file in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['translate'],
		resource: ['audio'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = 'whisper-1';
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
	const options = this.getNodeParameter('options', i, {});

	const formData = new FormData();

	formData.append('model', model);

	if (options.temperature) {
		formData.append('temperature', options.temperature.toString());
	}

	const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
	const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

	formData.append('file', dataBuffer, {
		filename: binaryData.fileName,
		contentType: binaryData.mimeType,
	});

	const response = await apiRequest.call(this, 'POST', '/audio/translations', {
		option: { formData },
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
