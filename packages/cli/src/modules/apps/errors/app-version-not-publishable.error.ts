import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export class AppVersionNotPublishableError extends BadRequestError {
	constructor(versionId: string, reason: string) {
		super(`Cannot serve app version '${versionId}': ${reason}`);
	}
}
