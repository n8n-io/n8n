import FormData from 'form-data';
import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { apiRequest } from '../transport';
import type { File } from './interfaces';

export function getMimeType(contentType?: string) {
	return contentType?.split(';')?.[0];
}

export async function downloadFile(this: IExecuteFunctions, url: string, qs?: IDataObject) {
	const downloadResponse = (await this.helpers.httpRequest({
		method: 'GET',
		url,
		qs,
		returnFullResponse: true,
		encoding: 'arraybuffer',
	})) as { body: ArrayBuffer; headers: IDataObject };

	const mimeType =
		getMimeType(downloadResponse.headers?.['content-type'] as string) ?? 'application/octet-stream';
	const fileContent = Buffer.from(downloadResponse.body);
	return {
		fileContent,
		mimeType,
	};
}

export async function uploadFile(
	this: IExecuteFunctions,
	fileContent: Buffer,
	mimeType: string,
	fileName?: string,
) {
	const form = new FormData();
	form.append('file', fileContent, {
		filename: fileName ?? 'file',
		contentType: mimeType,
	});
	return (await apiRequest.call(this, 'POST', '/v1/files', {
		headers: form.getHeaders(),
		body: form,
	})) as File;
}

export function splitByComma(str: string) {
	return str
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s);
}

export async function getBaseUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('anthropicApi');
	return (credentials.url ?? 'https://api.anthropic.com') as string;
}
