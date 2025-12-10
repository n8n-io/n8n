import axios from 'axios';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import type Stream from 'node:stream';

import { apiRequest } from '../transport';

interface File {
	name: string;
	uri: string;
	mimeType: string;
	state: string;
	error?: { message: string };
}

const CHUNK_SIZE = 256 * 1024;

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
	const uploadInitResponse = (await apiRequest.call(this, 'POST', '/upload/v1beta/files', {
		headers: {
			'X-Goog-Upload-Protocol': 'resumable',
			'X-Goog-Upload-Command': 'start',
			'X-Goog-Upload-Header-Content-Length': numBytes,
			'X-Goog-Upload-Header-Content-Type': mimeType,
			'Content-Type': 'application/json',
		},
		option: {
			returnFullResponse: true,
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
	})) as { file: File };

	while (uploadResponse.file.state !== 'ACTIVE' && uploadResponse.file.state !== 'FAILED') {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		uploadResponse.file = (await apiRequest.call(
			this,
			'GET',
			`/v1beta/${uploadResponse.file.name}`,
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

interface FileStreamData {
	stream: Stream;
	mimeType: string;
}

async function getFileStreamFromUrlOrBinary(
	this: IExecuteFunctions,
	i: number,
	downloadUrl?: string,
	fallbackMimeType?: string,
	qs?: IDataObject,
): Promise<FileStreamData | { buffer: Buffer; mimeType: string }> {
	if (downloadUrl) {
		const downloadResponse = await axios.get(downloadUrl, {
			params: qs,
			responseType: 'stream',
		});

		const contentType = downloadResponse.headers['content-type'] as string | undefined;
		const mimeType = contentType?.split(';')?.[0] ?? fallbackMimeType ?? 'application/octet-stream';

		return {
			stream: downloadResponse.data as Stream,
			mimeType,
		};
	}

	// Get binary data
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
	if (!binaryPropertyName) {
		throw new NodeOperationError(this.getNode(), 'Binary property name is required', {
			description: 'Error uploading file',
		});
	}

	const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
	if (!binaryData.id) {
		// Small file - return buffer for direct upload
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		return {
			buffer,
			mimeType: binaryData.mimeType,
		};
	}

	// Large file - return stream
	return {
		stream: await this.helpers.getBinaryStream(binaryData.id, CHUNK_SIZE),
		mimeType: binaryData.mimeType,
	};
}

interface ResumableUploadConfig {
	endpoint: string;
	mimeType: string;
	body?: IDataObject;
	headers?: IDataObject;
	fileSize?: number;
}

async function performResumableUpload(
	this: IExecuteFunctions,
	stream: Stream,
	config: ResumableUploadConfig,
): Promise<{ body: IDataObject }> {
	const { endpoint, mimeType, body, headers = {}, fileSize } = config;

	// Initialize the upload
	const uploadInitResponse = (await apiRequest.call(this, 'POST', endpoint, {
		headers: {
			'X-Goog-Upload-Protocol': 'resumable',
			'X-Goog-Upload-Command': 'start',
			'X-Goog-Upload-Header-Content-Type': mimeType,
			'Content-Type': 'application/json',
			...headers,
		},
		body,
		option: { returnFullResponse: true },
	})) as { headers: IDataObject };

	const uploadUrl = uploadInitResponse.headers['x-goog-upload-url'] as string;
	if (!uploadUrl) {
		throw new NodeOperationError(this.getNode(), 'Failed to get upload URL');
	}

	// Upload the file
	return (await this.helpers.httpRequest({
		method: 'POST',
		url: uploadUrl,
		headers: {
			'X-Goog-Upload-Offset': '0',
			'X-Goog-Upload-Command': 'upload, finalize',
			'Content-Type': mimeType,
			...(fileSize && fileSize > 0 && { 'Content-Length': fileSize.toString() }),
		},
		body: stream,
		returnFullResponse: true,
	})) as { body: IDataObject };
}

export async function transferFile(
	this: IExecuteFunctions,
	i: number,
	downloadUrl?: string,
	fallbackMimeType?: string,
	qs?: IDataObject,
) {
	const fileData = await getFileStreamFromUrlOrBinary.call(
		this,
		i,
		downloadUrl,
		fallbackMimeType,
		qs,
	);

	// Handle small binary files (buffer) - use uploadFile which handles resumable upload
	if ('buffer' in fileData) {
		return await uploadFile.call(this, fileData.buffer, fileData.mimeType);
	}

	// Handle URL or large binary files (stream)
	const { stream, mimeType } = fileData;

	const uploadResponse = (await performResumableUpload.call(this, stream, {
		endpoint: '/upload/v1beta/files',
		mimeType,
	})) as { body: { file: File } };

	let file = uploadResponse.body.file;

	while (file.state !== 'ACTIVE' && file.state !== 'FAILED') {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		file = (await apiRequest.call(this, 'GET', `/v1beta/${file.name}`)) as File;
	}

	if (file.state === 'FAILED') {
		throw new NodeOperationError(this.getNode(), file.error?.message ?? 'Unknown error', {
			description: 'Error uploading file',
		});
	}

	return { fileUri: file.uri, mimeType: file.mimeType };
}

interface Operation {
	name: string;
	done: boolean;
	error?: { message: string };
	response?: IDataObject;
}

export async function createFileSearchStore(
	this: IExecuteFunctions,
	displayName: string,
): Promise<IDataObject> {
	return (await apiRequest.call(this, 'POST', '/v1beta/fileSearchStores', {
		body: { displayName },
	})) as IDataObject;
}

export async function uploadToFileSearchStore(
	this: IExecuteFunctions,
	i: number,
	fileSearchStoreName: string,
	displayName: string,
	downloadUrl?: string,
	fallbackMimeType?: string,
	qs?: IDataObject,
) {
	const fileData = await getFileStreamFromUrlOrBinary.call(
		this,
		i,
		downloadUrl,
		fallbackMimeType,
		qs,
	);

	// Handle small binary files (buffer) - convert to stream
	let stream: Stream;
	let mimeType: string;

	if ('buffer' in fileData) {
		stream = Readable.from(fileData.buffer);
		mimeType = fileData.mimeType;
	} else {
		// Handle URL or large binary files (stream)
		stream = fileData.stream;
		mimeType = fileData.mimeType;
	}

	const uploadResponse = (await performResumableUpload.call(this, stream, {
		endpoint: `/upload/v1beta/${fileSearchStoreName}:uploadToFileSearchStore`,
		mimeType,
		body: { displayName, mimeType },
	})) as { body: { name: string } };

	const operationName = uploadResponse.body.name;
	let operation = (await apiRequest.call(this, 'GET', `/v1beta/${operationName}`)) as Operation;

	while (!operation.done) {
		await new Promise((resolve) => setTimeout(resolve, 3000));
		operation = (await apiRequest.call(this, 'GET', `/v1beta/${operationName}`)) as Operation;
	}

	if (operation.error) {
		throw new NodeOperationError(this.getNode(), operation.error.message ?? 'Unknown error', {
			description: 'Error uploading file to File Search store',
		});
	}

	return operation.response ?? { name: uploadResponse.body.name };
}
