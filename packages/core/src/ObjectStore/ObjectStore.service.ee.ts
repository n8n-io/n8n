/* eslint-disable @typescript-eslint/naming-convention */

import { createHash } from 'node:crypto';
import axios from 'axios';
import { Service } from 'typedi';
import { sign } from 'aws4';
import { isStream, parseXml } from './utils';
import { ExternalStorageRequestFailed } from './errors';

import type { AxiosRequestConfig, Method } from 'axios';
import type { Request as Aws4Options, Credentials as Aws4Credentials } from 'aws4';
import type { ListPage, ObjectStore, RawListPage } from './types';
import type { Readable } from 'stream';
import type { BinaryData } from '..';

@Service()
export class ObjectStoreService {
	private credentials: Aws4Credentials;

	constructor(
		private bucket: { region: string; name: string },
		credentials: { accountId: string; secretKey: string },
	) {
		this.credentials = {
			accessKeyId: credentials.accountId,
			secretAccessKey: credentials.secretKey,
		};
	}

	get host() {
		return `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;
	}

	/**
	 * Confirm that the configured bucket exists and the caller has permission to access it.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html
	 */
	async checkConnection() {
		return this.request('HEAD', this.host);
	}

	/**
	 * Upload an object to the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
	 */
	async put(filename: string, buffer: Buffer, metadata: BinaryData.PreWriteMetadata = {}) {
		const headers: Record<string, string | number> = {
			'Content-Length': buffer.length,
			'Content-MD5': createHash('md5').update(buffer).digest('base64'),
		};

		if (metadata.fileName) headers['x-amz-meta-filename'] = metadata.fileName;
		if (metadata.mimeType) headers['Content-Type'] = metadata.mimeType;

		return this.request('PUT', this.host, `/${filename}`, { headers, body: buffer });
	}

	/**
	 * Download an object as a stream or buffer from the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async get(path: string, { mode }: { mode: 'buffer' }): Promise<Buffer>;
	async get(path: string, { mode }: { mode: 'stream' }): Promise<Readable>;
	async get(path: string, { mode }: { mode: 'stream' | 'buffer' }) {
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
	async getMetadata(path: string) {
		type Response = {
			headers: {
				'content-length': string;
				'content-type'?: string;
				'x-amz-meta-filename'?: string;
			} & Record<string, string | number>;
		};

		const response: Response = await this.request('HEAD', this.host, path);

		return response.headers;
	}

	/**
	 * Delete an object in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async deleteOne(path: string) {
		return this.request('DELETE', this.host, `/${encodeURIComponent(path)}`);
	}

	/**
	 * Delete objects with a common prefix in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
	 */
	async deleteMany(prefix: string) {
		const objects = await this.list(prefix);

		const innerXml = objects.map(({ key }) => `<Object><Key>${key}</Key></Object>`).join('\n');

		const body = ['<Delete>', innerXml, '</Delete>'].join('\n');

		const headers = {
			'Content-Type': 'application/xml',
			'Content-Length': body.length,
			'Content-MD5': createHash('md5').update(body).digest('base64'),
		};

		return this.request('POST', this.host, '/?delete', { headers, body });
	}

	/**
	 * List objects with a common prefix in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
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
	 * Fetch a page of objects with a common prefix in the configured bucket. Max 1000 per page.
	 */
	async getListPage(prefix: string, nextPageToken?: string) {
		const bucketlessHost = this.host.split('.').slice(1).join('.');

		const qs: Record<string, string | number> = { 'list-type': 2, prefix };

		if (nextPageToken) qs['continuation-token'] = nextPageToken;

		const { data } = await this.request('GET', bucketlessHost, `/${this.bucket.name}`, { qs });

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

	private async request<T = unknown>(
		method: Method,
		host: string,
		rawPath = '',
		{ qs, headers, body, responseType }: ObjectStore.RequestOptions = {},
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
			return await axios.request<T>(config);
		} catch (error) {
			throw new ExternalStorageRequestFailed(error, config);
		}
	}
}
