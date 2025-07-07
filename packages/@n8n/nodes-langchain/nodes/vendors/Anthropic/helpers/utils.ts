import FormData from 'form-data';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { filesApiRequest } from '../transport';
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
	fileName: string,
) {
	const form = new FormData();
	form.append('file', fileContent, {
		filename: fileName,
		contentType: mimeType,
	});
	return (await filesApiRequest.call(this, 'POST', '/v1/files', {
		headers: form.getHeaders(),
		body: form,
	})) as File;
}
