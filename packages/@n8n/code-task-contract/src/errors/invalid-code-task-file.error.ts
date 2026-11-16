import { UnexpectedError } from '@n8n/errors';

/** Thrown when a task input or result file has another version, or does not match its schema. */
export class InvalidCodeTaskFileError extends UnexpectedError {
	constructor(
		fileKind: string,
		readonly problems: string[],
	) {
		super(`Invalid code ${fileKind} file. ${problems.join(' ')}`);
	}
}
