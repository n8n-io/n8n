import { ConflictError } from '@/errors/response-errors/conflict.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type { BlockingIssue } from '../n8n-packages.types';

export function toImportBlockedError(
	issues: BlockingIssue[],
): ConflictError | UnprocessableRequestError {
	const message =
		`Import blocked: ${issues.length} issue(s) must be resolved before the package ` +
		'can be imported.';

	if (issues.some((issue) => issue.type === 'workflow-conflict')) {
		return new ConflictError(message, undefined, { issues });
	}

	const error = new UnprocessableRequestError(message);
	Object.assign(error, { meta: { issues } });
	return error;
}
