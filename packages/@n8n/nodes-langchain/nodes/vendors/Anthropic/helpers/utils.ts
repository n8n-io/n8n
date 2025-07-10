import FormData from 'form-data';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { apiRequest } from '../transport';
import type { File } from './interfaces';

export async function downloadFile(
	this: IExecuteFunctions,
	url: string,
	fallbackMimeType?: string,
	qs?: IDataObject,
) {
	const downloadResponse = (await this.helpers.httpRequest({
		method: 'GET',
		url,
		qs,
		returnFullResponse: true,
		encoding: 'arraybuffer',
	})) as { body: ArrayBuffer; headers: IDataObject };

	const mimeType =
		(downloadResponse.headers?.['content-type'] as string)?.split(';')?.[0] ?? fallbackMimeType;
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

export async function getBaseUrl(this: IExecuteFunctions) {
	const credentials = await this.getCredentials('anthropicApi');
	return (credentials.url ?? 'https://api.anthropic.com') as string;
}
