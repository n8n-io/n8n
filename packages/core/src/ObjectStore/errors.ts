import { AxiosRequestConfig } from 'axios';

export class ExternalStorageRequestFailed extends Error {
	constructor(error: unknown, details: AxiosRequestConfig) {
		super('Request to external object storage failed');
		this.cause = { error, details };
	}
}
