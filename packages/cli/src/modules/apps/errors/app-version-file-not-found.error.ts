import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class AppVersionFileNotFoundError extends NotFoundError {
	constructor(filePath: string) {
		super(`Could not find the file: '${filePath}'`);
	}
}
