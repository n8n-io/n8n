import { ConflictError } from '@/errors/response-errors/conflict.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type { BlockingIssue } from '../n8n-packages.types';

export function toImportBlockedError(
	issues: BlockingIssue[],
): ConflictError | UnprocessableRequestError {
	const message =
		`Import blocked: ${issues.length} issue(s) must be resolved before the package ` +
		'can be imported.';

	if (
		issues.some(
			(issue) =>
				issue.type === 'workflow-conflict' ||
				issue.type === 'workflow-id-conflict' ||
				issue.type === 'workflow-folder-conflict' ||
				issue.type === 'folder-conflict',
		)
	) {
		return new ConflictError(message, undefined, { issues });
	}

	return new UnprocessableRequestError(message, undefined, { issues });
}
