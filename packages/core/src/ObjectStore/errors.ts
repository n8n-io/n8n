import { AxiosRequestConfig } from 'axios';

export namespace ObjectStore {
	export class RequestFailedError extends Error {
		constructor(error: unknown, config: AxiosRequestConfig) {
			super(`Request to external object storage failed. Config: ${JSON.stringify(config)}`);
			this.cause = { error };
		}
	}
}
