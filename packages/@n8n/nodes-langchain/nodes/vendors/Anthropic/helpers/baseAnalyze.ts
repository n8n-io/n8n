import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { Content, MessagesResponse } from './interfaces';
import { getBaseUrl, splitByComma } from './utils';
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
	const baseUrl = await getBaseUrl.call(this);
	const fileUrlPrefix = `${baseUrl}/v1/files/`;

	let content: Content[];
	if (inputType === 'url') {
		const urls = this.getNodeParameter(urlsPropertyName, i, '') as string;
		content = splitByComma(urls).map((url) => {
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
		const promises = splitByComma(binaryPropertyNames).map(async (binaryPropertyName) => {
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
	})) as MessagesResponse;

	if (simplify) {
		return [
			{
				json: { content: response.content },
				pairedItem: { item: i },
			},
		];
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
