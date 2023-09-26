import { AxiosRequestConfig } from 'axios';

export namespace ObjectStore {
	export class RequestFailedError extends Error {
		message = 'Request to external object storage failed';

		constructor(error: unknown, details: AxiosRequestConfig) {
			super();
			this.cause = { error, details };
		}
	}

	export class WriteBlockedError extends Error {
		constructor(filename: string) {
			super(
				`Request to write file "${filename}" to object storage was blocked. This is likely because storing binary data in S3 is not available with your current license. Please upgrade to a license that supports this feature, or set N8N_DEFAULT_BINARY_DATA_MODE to an option other than "s3".`,
			);
		}
	}
}
