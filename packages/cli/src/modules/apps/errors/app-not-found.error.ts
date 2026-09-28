import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class AppNotFoundError extends NotFoundError {
	constructor(appId: string) {
		super(`Could not find the app: '${appId}'`);
	}
}
