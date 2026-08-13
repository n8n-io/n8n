import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class ProjectFileNotFoundError extends NotFoundError {
	constructor(fileId: string) {
		super(`Could not find the project file: '${fileId}'`);
	}
}
