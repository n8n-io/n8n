import { ResponseError } from './abstract/response.error';

export class UnsupportedMediaTypeError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 415, 415, hint);
	}
}
