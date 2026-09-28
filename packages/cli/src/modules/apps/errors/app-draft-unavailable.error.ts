import { ConflictError } from '@/errors/response-errors/conflict.error';

/** The app's sandbox holds a draft that could not be stored; the stored source must not stand in for it. */
export class AppDraftUnavailableError extends ConflictError {
	constructor(message: string) {
		super(`Could not store the app's draft: ${message}`);
	}
}
