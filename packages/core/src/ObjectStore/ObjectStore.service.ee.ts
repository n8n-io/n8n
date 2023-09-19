/* eslint-disable @typescript-eslint/naming-convention */

import axios from 'axios';
import { Service } from 'typedi';
import { sign } from 'aws4';
import { isStream } from './utils';
import { ObjectStorageError } from './errors';
import { createHash } from 'node:crypto';
import type { AxiosRequestConfig, Method, ResponseType } from 'axios';
import type { Request as Aws4Options, Credentials as Aws4Credentials } from 'aws4';

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
	 * Confirm that the configured bucket exists and that the caller has permission to access it.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html
	 */
	async checkConnection() {
		const host = `s3.${this.bucket.region}.amazonaws.com`;

		return this.request('HEAD', host, this.bucket.name); // @TODO: Not working with Axios
	}

	/**
	 * Upload an object to the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
	 */
	async put(filename: string, buffer: Buffer) {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const headers = {
			'Content-Length': buffer.length,
			'Content-Type': 'image/jpg', // @TODO: Derive
			'Content-MD5': createHash('md5').update(buffer).digest('base64'),
		};

		return this.request('PUT', host, `/${filename}`, { body: buffer, headers });
	}

	/**
	 * Download an object as a stream from the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async getStream(path: string) {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const { data } = await this.request('GET', host, path, { responseType: 'stream' });

		if (isStream(data)) return data;

		throw new ObjectStorageError.TypeMismatch('stream', typeof data);
	}

	/**
	 * Download an object as a buffer from the configured bucket.
	 *
	 * @doc https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
	 */
	async getBuffer(path: string) {
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const { data } = await this.request('GET', host, path, { responseType: 'arraybuffer' });

		if (Buffer.isBuffer(data)) return data;

		throw new ObjectStorageError.TypeMismatch('buffer', typeof data);
	}

	private async request(
		method: Method,
		host: string,
		path: string,
		{
			headers,
			responseType,
		}: {
			headers?: Record<string, string | number>;
			body?: Buffer;
			responseType?: ResponseType;
		} = {},
	) {
		const slashPath = path.startsWith('/') ? path : `/${path}`;

		const optionsToSign: Aws4Options = {
			host,
			path: slashPath,
			...headers,
		};

		const signedOptions = sign(optionsToSign, this.credentials);

		const config: AxiosRequestConfig = {
			method,
			url: `https://${host}${slashPath}`,
			headers: signedOptions.headers,
		};

		if (responseType) config.responseType = responseType;

		console.log('Axios request config', config); // @TODO: Remove

		try {
			return await axios.request<unknown>(config);
		} catch (error) {
			if (error instanceof Error) console.log(error.message); // @TODO: Remove
			// throw new ObjectStorageError.RequestFailed(config); // @TODO: Restore
			throw error;
		}
	}
}
