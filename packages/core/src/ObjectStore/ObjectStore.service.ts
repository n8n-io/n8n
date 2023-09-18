import axios from 'axios';
import { Service } from 'typedi';
import { sign } from 'aws4';
import { isStream, DownloadTypeError, RequestToObjectStorageFailed } from './utils';
import type { AxiosPromise, Method } from 'axios';
import type { Request as Aws4Options, Credentials as Aws4Credentials } from 'aws4';

/**
 * `/workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
 */

@Service()
export class ObjectStoreService {
	constructor(
		private bucket: { region: string; name: string },
		private credentials: { accountId: string; secretKey: string },
	) {
		// @TODO: Confirm connection
	}

	async getStream(objectPath: string) {
		const result = await this.request('GET', objectPath, { mode: 'stream' });

		if (isStream(result)) return result;

		throw new DownloadTypeError('stream', typeof result);
	}

	async getBuffer(objectPath: string) {
		const result = await this.request('GET', objectPath, { mode: 'buffer' });

		if (Buffer.isBuffer(result)) return result;

		throw new DownloadTypeError('buffer', typeof result);
	}

	private async request(
		method: Method,
		objectPath: string,
		{ mode }: { mode: 'stream' | 'buffer' },
	) {
		// @TODO Decouple host from AWS
		const host = `${this.bucket.name}.s3.${this.bucket.region}.amazonaws.com`;

		const options: Aws4Options = {
			host,
			path: `/${objectPath}`,
		};

		const credentials: Aws4Credentials = {
			accessKeyId: this.credentials.accountId,
			secretAccessKey: this.credentials.secretKey,
		};

		const signed = sign(options, credentials);

		const response: Awaited<AxiosPromise<unknown>> = await axios(`https://${host}/${objectPath}`, {
			method,
			headers: signed.headers,
			responseType: mode === 'buffer' ? 'arraybuffer' : 'stream',
		});

		if (response.status !== 200) throw new RequestToObjectStorageFailed();

		return response.data;
	}
}
