import { ResponseError } from './abstract/response.error';

export class FailedDependencyError extends ResponseError {
	constructor(message: string, errorCode = 424) {
		super(message, 424, errorCode);
	}
}
