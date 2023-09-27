import { AxiosRequestConfig } from 'axios';

export namespace ObjectStore {
	export class RequestFailedError extends Error {
		message = 'Request to external object storage failed';

		constructor(error: unknown, details: AxiosRequestConfig) {
			super();
			this.cause = { error, details };
		}
	}
}
