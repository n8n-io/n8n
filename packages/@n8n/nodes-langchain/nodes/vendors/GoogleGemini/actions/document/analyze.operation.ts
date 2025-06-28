import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IBinaryData,
} from 'n8n-workflow';
import { updateDisplayOptions, jsonParse, ApplicationError } from 'n8n-workflow';

import type { Content, GenerateContentResponse } from '../../helpers/interfaces';
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
				const downloadResponse = (await this.helpers.httpRequest({
					method: 'GET',
					url,
					returnFullResponse: true,
					encoding: 'arraybuffer',
				})) as { body: ArrayBuffer; headers: IDataObject };

				const mimeType =
					(downloadResponse.headers?.['content-type'] as string)?.split(';')?.[0] ??
					'application/pdf';
				const fileContent = Buffer.from(downloadResponse.body);
				const numBytes = fileContent.length;

				const uploadInitResponse = (await apiRequest.call(this, 'POST', '/upload/v1beta/files', {
					headers: {
						'X-Goog-Upload-Protocol': 'resumable',
						'X-Goog-Upload-Command': 'start',
						'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
						'X-Goog-Upload-Header-Content-Type': mimeType,
						'Content-Type': 'application/json',
					},
					option: {
						resolveWithFullResponse: true,
					},
				})) as { headers: IDataObject };
				const uploadUrl = uploadInitResponse.headers['x-goog-upload-url'] as string;

				const uploadResponse = (await this.helpers.httpRequest({
					method: 'POST',
					url: uploadUrl,
					headers: {
						'Content-Length': numBytes.toString(),
						'X-Goog-Upload-Offset': '0',
						'X-Goog-Upload-Command': 'upload, finalize',
					},
					body: fileContent,
				})) as { file: { uri: string; mimeType: string } };

				return { fileUri: uploadResponse.file.uri, mimeType: uploadResponse.file.mimeType };
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
		contents = [];
		// TODO: redo this later
		// // Handle binary files
		// const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
		// const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		// const filePromises = Object.entries(binaryData).map(async ([, binary]) => {
		// 	if (!binary || typeof binary !== 'object') {
		// 		throw new ApplicationError('Binary data is missing or invalid');
		// 	}
		// 	const binaryItem = binary as unknown as IBinaryData;
		// 	const mimeType = binaryItem.mimeType || 'application/pdf';
		// 	const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		// 	const numBytes = fileBuffer.length;
		// 	// Generate a display name from the file name
		// 	const displayName = binaryItem.fileName ? binaryItem.fileName.split('.')[0] : 'document';
		// 	// Step 1: Initial resumable request to get upload URL
		// 	const uploadInitResponse = (await this.helpers.httpRequest({
		// 		method: 'POST',
		// 		url: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
		// 		headers: {
		// 			'X-Goog-Upload-Protocol': 'resumable',
		// 			'X-Goog-Upload-Command': 'start',
		// 			'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
		// 			'X-Goog-Upload-Header-Content-Type': mimeType,
		// 			'Content-Type': 'application/json',
		// 		},
		// 		body: JSON.stringify({
		// 			file: {
		// 				display_name: displayName,
		// 			},
		// 		}),
		// 		returnFullResponse: true,
		// 	})) as { headers: IDataObject };
		// 	const uploadUrl = uploadInitResponse.headers['x-goog-upload-url'] as string;
		// 	// Step 2: Upload the actual file bytes
		// 	const uploadResponse = (await this.helpers.httpRequest({
		// 		method: 'POST',
		// 		url: uploadUrl,
		// 		headers: {
		// 			'Content-Length': numBytes.toString(),
		// 			'X-Goog-Upload-Offset': '0',
		// 			'X-Goog-Upload-Command': 'upload, finalize',
		// 		},
		// 		body: fileBuffer,
		// 		returnFullResponse: true,
		// 	})) as { body: string };
		// 	const fileInfo = jsonParse<{ file: { uri: string } }>(uploadResponse.body);
		// 	return {
		// 		mimeType,
		// 		fileUri: fileInfo.file.uri,
		// 	};
		// });
		// const files = await Promise.all(filePromises);
		// contents = [
		// 	{
		// 		role: 'user',
		// 		parts: files.map((file) => ({
		// 			fileData: {
		// 				fileUri: file.fileUri,
		// 				mimeType: file.mimeType,
		// 			},
		// 		})),
		// 	},
		// ];
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
