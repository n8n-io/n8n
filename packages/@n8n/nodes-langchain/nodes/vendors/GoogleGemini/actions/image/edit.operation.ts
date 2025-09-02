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
		displayName: 'Images',
		name: 'images',
		type: 'fixedCollection',
		placeholder: 'Add Images',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Image',
		},
		default: { values: [{ binaryPropertyName: 'data' }] },
		description: 'Add one or more binary fields to include images with your prompt',
		options: [
			{
				displayName: 'Image',
				name: 'values',
				values: [
					{
						displayName: 'Binary Field Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						placeholder: 'e.g. data',
						description: 'The name of the binary field containing the image data',
					},
				],
			},
		],
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
	const binaryPropertyOutput = this.getNodeParameter('options.binaryPropertyOutput', i, 'data');
	const outputKey = typeof binaryPropertyOutput === 'string' ? binaryPropertyOutput : 'data';

	// Collect image binary field names from collection
	const imagesUi =
		(
			this.getNodeParameter('images', i, { values: [{ binaryPropertyName: 'data' }] }) as {
				values?: Array<{ binaryPropertyName?: string }>;
			}
		).values ?? [];
	const imageFieldNames = imagesUi
		.map((v) => v.binaryPropertyName)
		.filter((n): n is string => Boolean(n));

	// Upload all images and gather fileData parts
	const fileParts = [] as Array<{ fileData: { fileUri: string; mimeType: string } }>;
	for (const fieldName of imageFieldNames) {
		const bin = this.helpers.assertBinaryData(i, fieldName);
		const buf = await this.helpers.getBinaryDataBuffer(i, fieldName);
		const uploaded = await uploadFile.call(this, buf, bin.mimeType);
		fileParts.push({ fileData: { fileUri: uploaded.fileUri, mimeType: uploaded.mimeType } });
	}

	const model = 'models/gemini-2.5-flash-image-preview';
	const generationConfig = {
		responseModalities: ['IMAGE'],
	};

	const body = {
		contents: [
			{
				role: 'user',
				parts: [...fileParts, { text: prompt }],
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
