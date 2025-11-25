import type { IExecuteFunctions, IHttpRequestMethods, IDataObject } from 'n8n-workflow';

import type { NanoBananaCredentials } from './interfaces';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
};

/**
 * Makes an API request to the Gemini API endpoint
 */
export async function apiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, headers } = parameters ?? {};

	const credentials = await this.getCredentials<NanoBananaCredentials>('nanoBananaApi');

	const apiEndpoint = credentials.apiEndpoint || 'aiplatform.googleapis.com';
	const url = `https://${apiEndpoint}${endpoint}?key=${credentials.apiKey}`;

	const options = {
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		method,
		body,
		qs,
		url,
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

/**
 * Downloads an image from a URL and returns it as a Buffer
 */
export async function downloadImage(this: IExecuteFunctions, url: string): Promise<Buffer> {
	const response = await this.helpers.httpRequest({
		method: 'GET',
		url,
		encoding: 'arraybuffer',
		returnFullResponse: false,
	});

	return Buffer.from(response);
}

/**
 * Converts an image Buffer to base64 string
 */
export function imageToBase64(buffer: Buffer): string {
	return buffer.toString('base64');
}

/**
 * Detects MIME type from URL or defaults to image/png
 */
export function getMimeTypeFromUrl(url: string): string {
	const lowerUrl = url.toLowerCase();
	if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
		return 'image/jpeg';
	}
	if (lowerUrl.includes('.webp')) {
		return 'image/webp';
	}
	if (lowerUrl.includes('.gif')) {
		return 'image/gif';
	}
	return 'image/png';
}
