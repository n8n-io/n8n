import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class ProjectFileNotFoundError extends NotFoundError {
	constructor(fileIdOrName: string) {
		super(`Could not find the file: '${fileIdOrName}'`);
	}
}
