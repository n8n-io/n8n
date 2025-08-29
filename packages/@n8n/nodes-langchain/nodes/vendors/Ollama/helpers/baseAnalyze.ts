import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { OllamaChatResponse, OllamaMessage } from './interfaces';
import { apiRequest } from '../transport';

export async function baseAnalyze(
	this: IExecuteFunctions,
	i: number,
	urlsPropertyName: string,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const inputType = this.getNodeParameter('inputType', i, 'binary') as string;
	const text = this.getNodeParameter('text', i, '') as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});

	let images: string[] = [];

	if (inputType === 'url') {
		const urls = this.getNodeParameter(urlsPropertyName, i, '') as string;
		const urlList = urls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url);

		// For URL inputs, we need to download and convert to base64
		const imagePromises = urlList.map(async (url) => {
			const response = await this.helpers.httpRequest({
				method: 'GET',
				url,
				encoding: 'arraybuffer',
			});
			return Buffer.from(response.body as Buffer).toString('base64');
		});

		images = await Promise.all(imagePromises);
	} else {
		// Handle binary input
		const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
		const propertyNames = binaryPropertyNames
			.split(',')
			.map((name: string) => name.trim())
			.filter((name: string) => name);

		const imagePromises = propertyNames.map(async (binaryPropertyName: string) => {
			const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
			return buffer.toString('base64');
		});

		images = await Promise.all(imagePromises);
	}

	// Construct the message for Ollama's chat API
	const messages: OllamaMessage[] = [
		{
			role: 'user',
			content: text,
			images,
		},
	];

	const body = {
		model,
		messages,
		stream: false,
		options: {
			temperature: options.temperature,
			top_p: options.top_p,
		},
	};

	const response = (await apiRequest.call(this, 'POST', '/api/chat', {
		body,
	})) as OllamaChatResponse;

	if (simplify) {
		return [
			{
				json: { content: response.message.content },
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
