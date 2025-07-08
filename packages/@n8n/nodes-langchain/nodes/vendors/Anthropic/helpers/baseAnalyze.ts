import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { Content } from './interfaces';
import { apiRequest } from '../transport';

export async function baseAnalyze(
	this: IExecuteFunctions,
	i: number,
	urlsPropertyName: string,
	type: 'image' | 'document',
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const inputType = this.getNodeParameter('inputType', i, 'url') as string;
	const text = this.getNodeParameter('text', i, '') as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});
	const credentials = await this.getCredentials('anthropicApi');
	const baseUrl = (credentials.url ?? 'https://api.anthropic.com') as string;
	const fileUrlPrefix = `${baseUrl}/v1/files/`;

	let content: Content[];
	if (inputType === 'url') {
		const urls = this.getNodeParameter(urlsPropertyName, i, '') as string;
		content = urls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url)
			.map((url) => {
				if (url.startsWith(fileUrlPrefix)) {
					return {
						type,
						source: {
							type: 'file',
							file_id: url.replace(fileUrlPrefix, ''),
						},
					} as Content;
				} else {
					return {
						type,
						source: {
							type: 'url',
							url,
						},
					} as Content;
				}
			});
	} else {
		const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
		const promises = binaryPropertyNames
			.split(',')
			.map((binaryPropertyName) => binaryPropertyName.trim())
			.filter((binaryPropertyName) => binaryPropertyName)
			.map(async (binaryPropertyName) => {
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const fileBase64 = buffer.toString('base64');
				return {
					type,
					source: {
						type: 'base64',
						media_type: binaryData.mimeType,
						data: fileBase64,
					},
				} as Content;
			});

		content = await Promise.all(promises);
	}

	content.push({
		type: 'text',
		text,
	});

	const body = {
		model,
		max_tokens: options.maxTokens ?? 1024,
		messages: [
			{
				role: 'user',
				content,
			},
		],
	};

	const response = (await apiRequest.call(this, 'POST', '/v1/messages', {
		body,
	})) as {
		content: Content[];
	};

	if (simplify) {
		return response.content.map((content) => ({
			json: content,
			pairedItem: { item: i },
		}));
	}

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
