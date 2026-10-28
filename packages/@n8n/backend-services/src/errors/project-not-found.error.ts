import { NotFoundError } from '@n8n/errors';

export class ProjectNotFoundError extends NotFoundError {
	constructor(readonly projectId: string) {
		super(`Could not find project with ID: ${projectId}`);
	}

	static isDefinedAndNotNull<T>(
		value: T | undefined | null,
		projectId: string,
	): asserts value is T {
		if (value === undefined || value === null) {
			throw new ProjectNotFoundError(projectId);
		}
	}
}
