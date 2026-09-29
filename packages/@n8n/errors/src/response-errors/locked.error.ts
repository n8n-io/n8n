import { ResponseError } from './response.error';

export class LockedError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 423, 423, hint);
	}
}
