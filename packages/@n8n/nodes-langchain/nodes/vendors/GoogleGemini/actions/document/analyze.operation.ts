import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { Content, GenerateContentResponse } from '../../helpers/interfaces';
import { downloadFile, uploadFile } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	// TODO: different models?
	modelRLC('modelSearch'),
	{
		displayName: 'Text Input',
		name: 'text',
		type: 'string',
		placeholder: "e.g. What's in this document?",
		default: "What's in this document?",
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		default: 'url',
		options: [
			{
				name: 'Document URL(s)',
				value: 'url',
			},
			{
				name: 'Binary File(s)',
				value: 'binary',
			},
		],
	},
	{
		displayName: 'URL(s)',
		name: 'documentUrls',
		type: 'string',
		placeholder: 'e.g. https://example.com/document.pdf',
		description:
			'URL(s) of the document(s) to analyze, multiple URLs can be added separated by comma',
		default: '',
		displayOptions: {
			show: {
				inputType: ['url'],
			},
		},
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description: 'Name of the binary property which contains the document(s)',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to simplify the response or not',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Length of Description (Max Tokens)',
				description: 'Fewer tokens will result in shorter, less detailed image description',
				name: 'maxOutputTokens',
				type: 'number',
				default: 300,
				typeOptions: {
					minValue: 1,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['analyze'],
		resource: ['document'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const inputType = this.getNodeParameter('inputType', i, 'url') as string;
	const text = this.getNodeParameter('text', i, '') as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});

	const generationConfig = {
		maxOutputTokens: options.maxOutputTokens,
	};

	let contents: Content[];
	if (inputType === 'url') {
		const documentUrls = this.getNodeParameter('documentUrls', i, '') as string;
		const filesDataPromises = documentUrls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url)
			.map(async (url) => {
				const { fileContent, mimeType } = await downloadFile.call(this, url, 'application/pdf');
				return await uploadFile.call(this, fileContent, mimeType);
			});

		const filesData = await Promise.all(filesDataPromises);
		contents = [
			{
				role: 'user',
				parts: filesData.map((fileData) => ({
					fileData,
				})),
			},
		];
	} else {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		const fileData = await uploadFile.call(this, buffer, binaryData.mimeType);
		contents = [
			{
				role: 'user',
				parts: [
					{
						fileData,
					},
				],
			},
		];
	}

	contents[0].parts.push({ text });

	const body = {
		contents,
		generationConfig,
	};

	const response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
		body,
	})) as GenerateContentResponse;

	if (simplify) {
		return response.candidates.map((candidate) => ({
			json: candidate,
			pairedItem: { item: i },
		}));
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
