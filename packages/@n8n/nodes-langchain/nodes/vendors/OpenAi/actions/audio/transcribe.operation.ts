import FormData from 'form-data';
import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { getBinaryDataFile } from '../../helpers/binary-data';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
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
				displayName: 'Language of the Audio File',
				name: 'language',
				type: 'string',
				description:
					'The language of the input audio. Supplying the input language in <a href="https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes" target="_blank">ISO-639-1</a> format will improve accuracy and latency.',
				default: '',
			},
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
		operation: ['transcribe'],
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

	if (options.language) {
		formData.append('language', options.language);
	}

	if (options.temperature) {
		formData.append('temperature', options.temperature.toString());
	}

	const { filename, contentType, fileContent } = await getBinaryDataFile(
		this,
		i,
		binaryPropertyName,
	);
	formData.append('file', fileContent, {
		filename,
		contentType,
	});

	const response = await apiRequest.call(this, 'POST', '/audio/transcriptions', {
		option: { formData },
		headers: formData.getHeaders(),
	});

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
