import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';

import { apiRequest, resourcePath } from '../transport';

import axios from 'axios';
import type Stream from 'node:stream';

interface File {
	name: string;
	uri: string;
	mimeType: string;
	state: string;
	error?: { message: string };
}

const CHUNK_SIZE = 256 * 1024;

export function getCredentialHostname(this: IExecuteFunctions, host: string): string {
	try {
		return new URL(host).hostname;
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			"The Google Gemini credential host isn't a valid URL",
			{
				description: "Enter a valid URL in the credential's Host field",
			},
		);
	}
}

export function isGeminiFileUrl(url: string): boolean {
	try {
		const { protocol, hostname } = new URL(url);
		return protocol === 'https:' && hostname === 'generativelanguage.googleapis.com';
	} catch {
		return false;
	}
}

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

export async function uploadFile(this: IExecuteFunctions, fileContent: Buffer, mimeType: string) {
	const numBytes = fileContent.length.toString();
	const uploadInitResponse = (await apiRequest.call(
		this,
		'POST',
		requestPath`/upload/v1beta/files`,
		{
			headers: {
				'X-Goog-Upload-Protocol': 'resumable',
				'X-Goog-Upload-Command': 'start',
				'X-Goog-Upload-Header-Content-Length': numBytes,
				'X-Goog-Upload-Header-Content-Type': mimeType,
				'Content-Type': 'application/json',
			},
			returnFullResponse: true,
		},
	)) as { headers: IDataObject };
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
	})) as { file: File };

	while (uploadResponse.file.state !== 'ACTIVE' && uploadResponse.file.state !== 'FAILED') {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		uploadResponse.file = (await apiRequest.call(
			this,
			'GET',
			requestPath`/v1beta${resourcePath(uploadResponse.file.name)}`,
		)) as File;
	}

	if (uploadResponse.file.state === 'FAILED') {
		throw new NodeOperationError(
			this.getNode(),
			uploadResponse.file.error?.message ?? 'Unknown error',
			{
				description: 'Error uploading file',
			},
		);
	}

	return { fileUri: uploadResponse.file.uri, mimeType: uploadResponse.file.mimeType };
}

export async function transferFile(
	this: IExecuteFunctions,
	i: number,
	downloadUrl?: string,
	fallbackMimeType?: string,
	qs?: IDataObject,
) {
	let stream: Stream;
	let mimeType: string;

	if (downloadUrl) {
		const downloadResponse = await axios.get(downloadUrl, {
			params: qs,
			responseType: 'stream',
		});

		const contentType = downloadResponse.headers['content-type'] as string | undefined;
		mimeType = contentType?.split(';')?.[0] ?? fallbackMimeType ?? 'application/octet-stream';
		stream = downloadResponse.data;
	} else {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
		if (!binaryPropertyName) {
			throw new NodeOperationError(this.getNode(), 'Binary property name is required', {
				description: 'Error uploading file',
			});
		}
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		if (!binaryData.id) {
			const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
			return await uploadFile.call(this, buffer, binaryData.mimeType);
		} else {
			stream = await this.helpers.getBinaryStream(binaryData.id, CHUNK_SIZE);
			mimeType = binaryData.mimeType;
		}
	}

	const uploadInitResponse = (await apiRequest.call(
		this,
		'POST',
		requestPath`/upload/v1beta/files`,
		{
			headers: {
				'X-Goog-Upload-Protocol': 'resumable',
				'X-Goog-Upload-Command': 'start',
				'X-Goog-Upload-Header-Content-Type': mimeType,
				'Content-Type': 'application/json',
			},
			returnFullResponse: true,
		},
	)) as { headers: IDataObject };

	const uploadUrl = uploadInitResponse.headers['x-goog-upload-url'] as string;
	if (!uploadUrl) {
		throw new NodeOperationError(this.getNode(), 'Failed to get upload URL');
	}

	const uploadResponse = (await this.helpers.httpRequest({
		method: 'POST',
		url: uploadUrl,
		headers: {
			'X-Goog-Upload-Offset': '0',
			'X-Goog-Upload-Command': 'upload, finalize',
			'Content-Type': mimeType,
		},
		body: stream,
		returnFullResponse: true,
	})) as { body: { file: File } };

	let file = uploadResponse.body.file;

	while (file.state !== 'ACTIVE' && file.state !== 'FAILED') {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		file = (await apiRequest.call(
			this,
			'GET',
			requestPath`/v1beta${resourcePath(file.name)}`,
		)) as File;
	}

	if (file.state === 'FAILED') {
		throw new NodeOperationError(this.getNode(), file.error?.message ?? 'Unknown error', {
			description: 'Error uploading file',
		});
	}

	return { fileUri: file.uri, mimeType: file.mimeType };
}
