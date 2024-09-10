import { createHash } from 'node:crypto';
import axios from 'axios';
import { Service } from 'typedi';
import { sign } from 'aws4';
import { isStream, parseXml, writeBlockedMessage } from './utils';
import { ApplicationError, LoggerProxy as Logger } from 'n8n-workflow';

import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, Method } from 'axios';
import type { Request as Aws4Options, Credentials as Aws4Credentials } from 'aws4';
import type {
	Bucket,
	ConfigSchemaCredentials,
	ListPage,
	MetadataResponseHeaders,
	RawListPage,
	RequestOptions,
} from './types';
import type { Readable } from 'stream';
import type { BinaryData } from '../BinaryData/types';

@Service()
export class ObjectStoreService {
	private host = '';

	private bucket: Bucket = { region: '', name: '' };

	private credentials: Aws4Credentials = { accessKeyId: '', secretAccessKey: '' };

	private isReady = false;

	private isReadOnly = false;

	private logger = Logger;

	async init(host: string, bucket: Bucket, credentials: ConfigSchemaCredentials) {
		this.host = host;
		this.bucket.name = bucket.name;
		this.bucket.region = bucket.region;

		this.credentials = {
			accessKeyId: credentials.accessKey,
			secretAccessKey: credentials.accessSecret,
		};

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

		return await this.request('HEAD', this.host, this.bucket.name);
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

		const path = `/${this.bucket.name}/${filename}`;

		return await this.request('PUT', this.host, path, { headers, body: buffer });
	}

	/**
	 * Download an object as a stream or buffer from the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async get(fileId: string, { mode }: { mode: 'buffer' }): Promise<Buffer>;
	async get(fileId: string, { mode }: { mode: 'stream' }): Promise<Readable>;
	async get(fileId: string, { mode }: { mode: 'stream' | 'buffer' }) {
		const path = `${this.bucket.name}/${fileId}`;

		const { data } = await this.request('GET', this.host, path, {
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
		const path = `${this.bucket.name}/${fileId}`;

		const response = await this.request('HEAD', this.host, path);

		return response.headers as MetadataResponseHeaders;
	}

	/**
	 * Delete a single object in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async deleteOne(fileId: string) {
		const path = `${this.bucket.name}/${fileId}`;

		return await this.request('DELETE', this.host, path);
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

		const path = `${this.bucket.name}/?delete`;

		return await this.request('POST', this.host, path, { headers, body });
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

		const { data } = await this.request('GET', this.host, this.bucket.name, { qs });

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

	private toPath(rawPath: string, qs?: Record<string, string | number>) {
		const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

		if (!qs) return path;

		const qsParams = Object.entries(qs)
			.map(([key, value]) => `${key}=${value}`)
			.join('&');

		return path.concat(`?${qsParams}`);
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
		host: string,
		rawPath = '',
		{ qs, headers, body, responseType }: RequestOptions = {},
	) {
		const path = this.toPath(rawPath, qs);

		const optionsToSign: Aws4Options = {
			method,
			service: 's3',
			region: this.bucket.region,
			host,
			path,
		};

		if (headers) optionsToSign.headers = headers;
		if (body) optionsToSign.body = body;

		const signedOptions = sign(optionsToSign, this.credentials);

		const config: AxiosRequestConfig = {
			method,
			url: `https://${host}${path}`,
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
