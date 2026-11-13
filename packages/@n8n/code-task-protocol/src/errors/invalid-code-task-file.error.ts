import { UnexpectedError } from '@n8n/errors';

/** n8n and the runtime come from the same release, so an invalid file is a bug. */
export class InvalidCodeTaskFileError extends UnexpectedError {
	constructor(
		fileKind: string,
		readonly problems: string[],
	) {
		super(`Invalid code ${fileKind} file. ${problems.join(' ')}`);
	}
}
