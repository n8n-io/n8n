import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { GenerateContentResponse } from '../../helpers/interfaces';
import { uploadFile } from '../../helpers/utils';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		placeholder: 'e.g. combine the first image with the second image',
		description: 'Instruction describing how to edit the image',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description: 'Name of the binary field which contains the image to edit',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'edited',
				hint: 'The name of the output field to put the binary file data in',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['edit'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const prompt = this.getNodeParameter('prompt', i, '');
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
	const binaryPropertyOutput = this.getNodeParameter('options.binaryPropertyOutput', i, 'data');
	const outputKey = typeof binaryPropertyOutput === 'string' ? binaryPropertyOutput : 'data';

	const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
	const { fileUri, mimeType } = await uploadFile.call(this, buffer, binaryData.mimeType);

	const model = 'models/gemini-2.5-flash-image-preview';
	const generationConfig = {
		responseModalities: ['IMAGE'],
	};

	const body = {
		contents: [
			{
				role: 'user',
				parts: [{ fileData: { fileUri, mimeType } }, { text: prompt }],
			},
		],
		generationConfig,
	};

	const response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
		body,
	})) as GenerateContentResponse;

	const promises = response.candidates.map(async (candidate) => {
		const imagePart = candidate.content.parts.find((part) => 'inlineData' in part);
		const bufferOut = Buffer.from(imagePart?.inlineData.data ?? '', 'base64');
		const binaryOut = await this.helpers.prepareBinaryData(
			bufferOut,
			'image.png',
			imagePart?.inlineData.mimeType,
		);
		return {
			binary: {
				[outputKey]: binaryOut,
			},
			json: {
				...binaryOut,
				data: undefined,
			},
			pairedItem: { item: i },
		};
	});

	return await Promise.all(promises);
}
