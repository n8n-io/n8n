import { ResponseError } from './response.error';

export class ServiceUnavailableError extends ResponseError {
	constructor(message: string, errorCode = 503) {
		super(message, 503, errorCode);
	}
}
