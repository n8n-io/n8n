import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class BindingNotFoundError extends NotFoundError {
	constructor(key: string) {
		super(`Could not find the binding: '${key}'`);
	}
}
