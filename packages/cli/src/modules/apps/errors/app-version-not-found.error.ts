import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class AppVersionNotFoundError extends NotFoundError {
	constructor(versionId: string) {
		super(`Could not find the app version: '${versionId}'`);
	}
}
