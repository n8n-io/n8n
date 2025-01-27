import { S3Config } from '@n8n/config';
import { Service } from '@n8n/di';
import { sign } from 'aws4';
import type { Request as Aws4Options } from 'aws4';
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, Method } from 'axios';
import { ApplicationError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import type { Readable } from 'stream';

import { Logger } from '@/logging/logger';

import type { ListPage, MetadataResponseHeaders, RawListPage, RequestOptions } from './types';
import { isStream, parseXml, writeBlockedMessage } from './utils';
import type { BinaryData } from '../types';

@Service()
export class ObjectStoreService {
	private baseUrl: URL;

	private isReady = false;

	private isReadOnly = false;

	constructor(
		private readonly logger: Logger,
		private readonly s3Config: S3Config,
	) {
		const { host, bucket, protocol } = s3Config;

		if (host === '') {
			throw new ApplicationError(
				'External storage host not configured. Please set `N8N_EXTERNAL_STORAGE_S3_HOST`.',
			);
		}

		if (bucket.name === '') {
			throw new ApplicationError(
				'External storage bucket name not configured. Please set `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME`.',
			);
		}

		this.baseUrl = new URL(`${protocol}://${host}/${bucket.name}`);
	}

	async init() {
		await this.checkConnection();
		this.setReady(true);
	}

	setReadonly(newState: boolean) {
		this.isReadOnly = newState;
	}

	setReady(newState: boolean) {
		this.isReady = newState;
	}

	/**
	 * Confirm that the configured bucket exists and the caller has permission to access it.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html
	 */
	async checkConnection() {
		if (this.isReady) return;

		return await this.request('HEAD', '');
	}

	/**
	 * Upload an object to the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
	 */
	async put(filename: string, buffer: Buffer, metadata: BinaryData.PreWriteMetadata = {}) {
		if (this.isReadOnly) return await this.blockWrite(filename);

		const headers: Record<string, string | number> = {
			'Content-Length': buffer.length,
			'Content-MD5': createHash('md5').update(buffer).digest('base64'),
		};

		if (metadata.fileName) headers['x-amz-meta-filename'] = metadata.fileName;
		if (metadata.mimeType) headers['Content-Type'] = metadata.mimeType;

		return await this.request('PUT', filename, { headers, body: buffer });
	}

	/**
	 * Download an object as a stream or buffer from the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async get(fileId: string, { mode }: { mode: 'buffer' }): Promise<Buffer>;
	async get(fileId: string, { mode }: { mode: 'stream' }): Promise<Readable>;
	async get(fileId: string, { mode }: { mode: 'stream' | 'buffer' }) {
		const { data } = await this.request('GET', fileId, {
			responseType: mode === 'buffer' ? 'arraybuffer' : 'stream',
		});

		if (mode === 'stream' && isStream(data)) return data;

		if (mode === 'buffer' && Buffer.isBuffer(data)) return data;

		throw new TypeError(`Expected ${mode} but received ${typeof data}.`);
	}

	/**
	 * Retrieve metadata for an object in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html
	 */
	async getMetadata(fileId: string) {
		const response = await this.request('HEAD', fileId);

		return response.headers as MetadataResponseHeaders;
	}

	/**
	 * Delete a single object in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async deleteOne(fileId: string) {
		return await this.request('DELETE', fileId);
	}

	/**
	 * Delete objects with a common prefix in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
	 */
	async deleteMany(prefix: string) {
		const objects = await this.list(prefix);

		if (objects.length === 0) return;

		const innerXml = objects.map(({ key }) => `<Object><Key>${key}</Key></Object>`).join('\n');

		const body = ['<Delete>', innerXml, '</Delete>'].join('\n');

		const headers = {
			'Content-Type': 'application/xml',
			'Content-Length': body.length,
			'Content-MD5': createHash('md5').update(body).digest('base64'),
		};

		return await this.request('POST', '', { headers, body, qs: { delete: '' } });
	}

	/**
	 * List objects with a common prefix in the configured bucket.
	 */
	async list(prefix: string) {
		const items = [];

		let isTruncated;
		let nextPageToken;

		do {
			const listPage = await this.getListPage(prefix, nextPageToken);

			if (listPage.contents?.length > 0) items.push(...listPage.contents);

			isTruncated = listPage.isTruncated;
			nextPageToken = listPage.nextContinuationToken;
		} while (isTruncated && nextPageToken);

		return items;
	}

	/**
	 * Fetch a page of objects with a common prefix in the configured bucket.
	 *
	 * Max 1000 objects per page - set by AWS.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
	 */
	async getListPage(prefix: string, nextPageToken?: string) {
		const qs: Record<string, string | number> = { 'list-type': 2, prefix };

		if (nextPageToken) qs['continuation-token'] = nextPageToken;

		const { data } = await this.request('GET', '', { qs });

		if (typeof data !== 'string') {
			throw new TypeError(`Expected XML string but received ${typeof data}`);
		}

		const { listBucketResult: page } = await parseXml<RawListPage>(data);

		if (!page.contents) return { ...page, contents: [] };

		// `explicitArray: false` removes array wrapper on single item array, so restore it

		if (!Array.isArray(page.contents)) page.contents = [page.contents];

		// remove null prototype - https://github.com/Leonidas-from-XIV/node-xml2js/issues/670

		page.contents.forEach((item) => {
			Object.setPrototypeOf(item, Object.prototype);
		});

		return page as ListPage;
	}

	private async blockWrite(filename: string): Promise<AxiosResponse> {
		const logMessage = writeBlockedMessage(filename);

		this.logger.warn(logMessage);

		return {
			status: 403,
			statusText: 'Forbidden',
			data: logMessage,
			headers: {},
			config: {} as InternalAxiosRequestConfig,
		};
	}

	private async request<T>(
		method: Method,
		rawPath = '',
		{ qs, headers, body, responseType }: RequestOptions = {},
	) {
		const url = new URL(this.baseUrl);
		if (rawPath && rawPath !== '/') {
			url.pathname = `${url.pathname}/${rawPath}`;
		}
		Object.entries(qs ?? {}).forEach(([key, value]) => {
			url.searchParams.set(key, String(value));
		});

		const optionsToSign: Aws4Options = {
			method,
			service: 's3',
			region: this.s3Config.bucket.region,
			host: this.s3Config.host,
			path: `${url.pathname}${url.search}`,
		};

		if (headers) optionsToSign.headers = headers;
		if (body) optionsToSign.body = body;

		const { accessKey, accessSecret } = this.s3Config.credentials;
		const signedOptions = sign(optionsToSign, {
			accessKeyId: accessKey,
			secretAccessKey: accessSecret,
		});

		const config: AxiosRequestConfig = {
			method,
			url: url.toString(),
			headers: signedOptions.headers,
		};

		if (body) config.data = body;
		if (responseType) config.responseType = responseType;

		try {
			this.logger.debug('Sending request to S3', { config });

			return await axios.request<T>(config);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);

			const message = `Request to S3 failed: ${error.message}`;

			this.logger.error(message, { config });

			throw new ApplicationError(message, { cause: error, extra: { config } });
		}
	}
}
