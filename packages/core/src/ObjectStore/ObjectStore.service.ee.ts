/* eslint-disable @typescript-eslint/naming-convention */

import { createHash } from 'node:crypto';
import axios from 'axios';
import { Service } from 'typedi';
import { sign } from 'aws4';
import { isStream, parseXml } from './utils';

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

	/**
	 * Confirm that the configured bucket exists and the caller has permission to access it.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html
	 */
	async checkConnection() {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		return this.request('HEAD', host);
	}

	/**
	 * Upload an object to the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
	 */
	async put(filename: string, buffer: Buffer, metadata: BinaryData.PreWriteMetadata = {}) {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const headers: Record<string, string | number> = {
			'Content-Length': buffer.length,
			'Content-MD5': createHash('md5').update(buffer).digest('base64'),
		};

		if (metadata.fileName) headers['x-amz-meta-filename'] = metadata.fileName;
		if (metadata.mimeType) headers['Content-Type'] = metadata.mimeType;

		return this.request('PUT', host, `/${filename}`, { headers, body: buffer });
	}

	/**
	 * Download an object as a stream or buffer from the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async get(path: string, { mode }: { mode: 'buffer' }): Promise<Buffer>;
	async get(path: string, { mode }: { mode: 'stream' }): Promise<Readable>;
	async get(path: string, { mode }: { mode: 'stream' | 'buffer' }) {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const { data } = await this.request('GET', host, path, {
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
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		type Response = {
			headers: {
				'content-length': string;
				'content-type'?: string;
				'x-amz-meta-filename'?: string;
			} & Record<string, string | number>;
		};

		const response: Response = await this.request('HEAD', host, path);

		return response.headers;
	}

	/**
	 * Delete an object in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async deleteOne(path: string) {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		return this.request('DELETE', host, `/${encodeURIComponent(path)}`);
	}

	/**
	 * Delete objects with a common prefix in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
	 */
	async deleteMany(prefix: string) {
		const objects = await this.list(prefix);

		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const innerXml = objects.map(({ key }) => `<Object><Key>${key}</Key></Object>`).join('\n');

		const body = ['<Delete>', innerXml, '</Delete>'].join('\n');

		const headers = {
			'Content-Type': 'application/xml',
			'Content-Length': body.length,
			'Content-MD5': createHash('md5').update(body).digest('base64'),
		};

		return this.request('POST', host, '/?delete', { headers, body });
	}

	/**
	 * List objects with a common prefix in the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
	 */
	async list(prefix: string) {
		const items = [];

		let isTruncated;
		let token; // for next page

		do {
			const listPage = await this.getListPage(prefix, token);

			if (listPage.contents?.length > 0) items.push(...listPage.contents);

			isTruncated = listPage.isTruncated;
			token = listPage.nextContinuationToken;
		} while (isTruncated && token);

		return items;
	}

	/**
	 * Fetch a page of objects with a common prefix in the configured bucket. Max 1000 per page.
	 */
	async getListPage(prefix: string, nextPageToken?: string) {
		const host = `s3.${this.bucket.region}.amazonaws.com`;

		const qs: Record<string, string | number> = { 'list-type': 2, prefix };

		if (nextPageToken) qs['continuation-token'] = nextPageToken;

		const response = await this.request('GET', host, `/${this.bucket.name}`, { qs });

		if (typeof response.data !== 'string') {
			throw new TypeError('Expected string');
		}

		const { listBucketResult: page } = await parseXml<RawListPage>(response.data);

		if (!page.contents) return { ...page, contents: [] };

		// restore array wrapper removed by `explicitArray: false` on single item array

		if (!Array.isArray(page.contents)) {
			page.contents = [page.contents];
		}

		// remove null prototype - https://github.com/Leonidas-from-XIV/node-xml2js/issues/670

		page.contents.forEach((item) => {
			Object.setPrototypeOf(item, Object.prototype);
		});

		return page as ListPage;
	}

	private toRequestPath(rawPath: string, qs?: Record<string, string | number>) {
		const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

		if (!qs) return path;

		const qsParams = Object.keys(qs)
			.map((key) => `${key}=${qs[key]}`)
			.join('&');

		return path.concat(`?${qsParams}`);
	}

	private async request<T = unknown>(
		method: Method,
		host: string,
		rawPath = '',
		{ qs, headers, body, responseType }: ObjectStore.RequestOptions = {},
	) {
		const path = this.toRequestPath(rawPath, qs);

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

		// console.log(config);

		try {
			return await axios.request<T>(config);
		} catch (error) {
			// console.log(error);
			throw new Error('Request to external object storage failed', {
				cause: { error: error as unknown, details: config },
			});
		}
	}
}
