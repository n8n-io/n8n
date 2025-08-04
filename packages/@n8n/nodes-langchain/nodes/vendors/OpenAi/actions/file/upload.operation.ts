import FormData from 'form-data';
import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions, NodeOperationError } from 'n8n-workflow';

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
			'Name of the binary property which contains the file. The size of individual files can be a maximum of 512 MB or 2 million tokens for Assistants.',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'options',
				default: 'assistants',
				description:
					"The intended purpose of the uploaded file, the 'Fine-tuning' only supports .jsonl files",
				options: [
					{
						name: 'Assistants',
						value: 'assistants',
					},
					{
						name: 'Fine-Tune',
						value: 'fine-tune',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['upload'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
	const options = this.getNodeParameter('options', i, {});

	const formData = new FormData();

	formData.append('purpose', options.purpose || 'assistants');

	const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
	const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

	formData.append('file', dataBuffer, {
		filename: binaryData.fileName,
		contentType: binaryData.mimeType,
	});

	try {
		const response = await apiRequest.call(this, 'POST', '/files', {
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
	} catch (error) {
		if (
			error.message.includes('Bad request') &&
			error.description?.includes('Expected file to have JSONL format')
		) {
			throw new NodeOperationError(this.getNode(), 'The file content is not in JSONL format', {
				description:
					'Fine-tuning accepts only files in JSONL format, where every line is a valid JSON dictionary',
			});
		}
		throw error;
	}
}
