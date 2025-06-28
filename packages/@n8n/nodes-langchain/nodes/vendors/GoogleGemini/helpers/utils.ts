import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { apiRequest } from '../transport';

export async function downloadFile(
	this: IExecuteFunctions,
	url: string,
	fallbackMimeType?: string,
) {
	const downloadResponse = (await this.helpers.httpRequest({
		method: 'GET',
		url,
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

export async function uploadFile(this: IExecuteFunctions, fileContent: Buffer, mimeType: string) {
	const numBytes = fileContent.length.toString();
	const uploadInitResponse = (await apiRequest.call(this, 'POST', '/upload/v1beta/files', {
		headers: {
			'X-Goog-Upload-Protocol': 'resumable',
			'X-Goog-Upload-Command': 'start',
			'X-Goog-Upload-Header-Content-Length': numBytes,
			'X-Goog-Upload-Header-Content-Type': mimeType,
			'Content-Type': 'application/json',
		},
		option: {
			resolveWithFullResponse: true,
		},
	})) as { headers: IDataObject };
	const uploadUrl = uploadInitResponse.headers['x-goog-upload-url'] as string;

	const uploadResponse = (await this.helpers.httpRequest({
		method: 'POST',
		url: uploadUrl,
		headers: {
			'Content-Length': numBytes,
			'X-Goog-Upload-Offset': '0',
			'X-Goog-Upload-Command': 'upload, finalize',
		},
		body: fileContent,
	})) as { file: { uri: string; mimeType: string } };

	return { fileUri: uploadResponse.file.uri, mimeType: uploadResponse.file.mimeType };
}
