import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { Content, GenerateContentResponse } from './interfaces';
import { downloadFile, uploadFile } from './utils';
import { apiRequest } from '../transport';

export async function baseAnalyze(
	this: IExecuteFunctions,
	i: number,
	urlsPropertyName: string,
	fallbackMimeType: string,
): Promise<INodeExecutionData[]> {
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
		const urls = this.getNodeParameter(urlsPropertyName, i, '') as string;
		const filesDataPromises = urls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url)
			.map(async (url) => {
				if (url.startsWith('https://generativelanguage.googleapis.com')) {
					const { mimeType } = (await apiRequest.call(this, 'GET', '', {
						option: { url },
					})) as { mimeType: string };
					return { fileUri: url, mimeType };
				} else {
					const { fileContent, mimeType } = await downloadFile.call(this, url, fallbackMimeType);
					return await uploadFile.call(this, fileContent, mimeType);
				}
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
		const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
		const promises = binaryPropertyNames
			.split(',')
			.map((binaryPropertyName) => binaryPropertyName.trim())
			.filter((binaryPropertyName) => binaryPropertyName)
			.map(async (binaryPropertyName) => {
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				return await uploadFile.call(this, buffer, binaryData.mimeType);
			});

		const filesData = await Promise.all(promises);
		contents = [
			{
				role: 'user',
				parts: filesData.map((fileData) => ({
					fileData,
				})),
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
