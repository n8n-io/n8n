import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	uri?: string;
	option?: IDataObject;
};

function resolveUri(credentials: ICredentialDataDecryptedObject, endpoint: string) {
	return credentials.url ? `${credentials.url}${endpoint}` : `https://api.openai.com/v1${endpoint}`;
}

function withCustomHeader(credentials: ICredentialDataDecryptedObject, headers: IDataObject) {
	if (
		credentials.header &&
		typeof credentials.headerName === 'string' &&
		credentials.headerName &&
		typeof credentials.headerValue === 'string'
	) {
		return { ...headers, [credentials.headerName]: credentials.headerValue };
	}

	return headers;
}

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option } = parameters ?? {};

	const credentials = await this.getCredentials('openAiApi');

	const uri = resolveUri(credentials, endpoint);
	const headers = withCustomHeader(credentials, parameters?.headers ?? {});

	const options = {
		headers,
		method,
		body,
		qs,
		uri,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	const response = await this.helpers.requestWithAuthentication.call(this, 'openAiApi', options);

	if (response && response.error === null) {
		response.error = undefined;
	}

	return response;
}

async function readStream(stream: Readable) {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk as Buffer));
	}

	return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Same request as `apiRequest`, but keeps the response body as a stream so the caller can
 * consume Server-Sent Events. Error responses are read back and reported as usual.
 */
export async function apiRequestStream(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters & { abortSignal?: AbortSignal },
): Promise<Readable> {
	const { body, qs, abortSignal } = parameters ?? {};

	const credentials = await this.getCredentials('openAiApi');

	const uri = resolveUri(credentials, endpoint);
	const headers = withCustomHeader(credentials, {
		Accept: 'text/event-stream',
		...(parameters?.headers ?? {}),
	});

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'openAiApi', {
		method,
		url: uri,
		headers,
		body,
		qs,
		json: true,
		encoding: 'stream',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		// Propagate execution cancellation to the network layer so a cancelled
		// run closes the upstream connection instead of leaking it.
		abortSignal,
	})) as { statusCode: number; body: Readable };

	if (response.statusCode >= 400) {
		const payload = await readStream(response.body);

		throw new NodeApiError(
			this.getNode(),
			jsonParse<JsonObject>(payload, { fallbackValue: { message: payload } }),
			{ httpCode: String(response.statusCode) },
		);
	}

	return response.body;
}
