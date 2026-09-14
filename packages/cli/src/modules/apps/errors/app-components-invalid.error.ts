import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/** Thrown by publish when the App's shared components module does not compile. */
export class AppComponentsInvalidError extends BadRequestError {
	constructor(readonly reason: string) {
		super(`This app's components do not compile; fix them before publishing: ${reason}`);
		this.name = 'AppComponentsInvalidError';
	}
}
