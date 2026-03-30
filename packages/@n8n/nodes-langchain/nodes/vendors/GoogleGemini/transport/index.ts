import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { GenerateContentRequest, GenerateContentResponse } from '../helpers/interfaces';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	option?: IDataObject;
};

type GooglePalmApiCredentials = {
	host: string;
	apiKey: string;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option, headers } = parameters ?? {};

	const credentials = await this.getCredentials<GooglePalmApiCredentials>('googlePalmApi');

	let url = `https://generativelanguage.googleapis.com${endpoint}`;

	if (credentials.host) {
		url = `${credentials.host}${endpoint}`;
	}

	const options = {
		headers,
		method,
		body,
		qs,
		url,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'googlePalmApi', options);
}
async function apiRequestStream(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
): Promise<any> {
	const { body, qs, option, headers } = parameters ?? {};

	const credentials = await this.getCredentials<GooglePalmApiCredentials>('googlePalmApi');

	let url = `https://generativelanguage.googleapis.com${endpoint}`;

	if (credentials.host) {
		url = `${credentials.host}${endpoint}`;
	}

	const streamingQs = { ...qs, alt: 'sse' };

	const options = {
		headers: {
			...headers,
			Accept: 'text/event-stream',
		},
		method,
		body,
		qs: streamingQs,
		url,
		json: false,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'googlePalmApi',
		options,
	);

	return parseStreamingResponse(response);
}

function parseStreamingResponse(streamData: string): any {
	const lines = streamData.split('\n');
	const chunks = [];
	for (const line of lines) {
		if (line.startsWith('data: ')) {
			const data = line.slice(6);
			if (data === '[DONE]') {
				break;
			}
			try {
				const parsed = JSON.parse(data);
				chunks.push(parsed);
			} catch (e) {
				continue;
			}
		}
	}
	if (chunks.length === 0) {
		throw new NodeOperationError(
			null as any,
			'No valid response chunks received from streaming API',
		);
	}

	const combinedResponse = {
		candidates: [
			{
				content: {
					parts: [
						{
							//TODO: combine other fields
							text: chunks
								.filter((chunk) => chunk.candidates?.[0]?.content?.parts?.[0]?.text)
								.map((chunk) => chunk.candidates[0].content.parts[0].text)
								.join(''),
						},
					],
					role: 'model',
				},
			},
		],
	};
	return combinedResponse;
}

export async function streamingRequestWithFallback(
	this: IExecuteFunctions,
	model: string,
	body: GenerateContentRequest,
) {
	try {
		return (await apiRequestStream.call(this, 'POST', `/v1beta/${model}:streamGenerateContent`, {
			body,
		})) as GenerateContentResponse;
	} catch (streamError: any) {
		return (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
			body,
		})) as GenerateContentResponse;
	}
}
