import type { ImportedSkillSummary } from '@n8n/api-types';
import { ConflictError, ResponseError, UnprocessableRequestError, UserError } from '@n8n/errors';

import { countSkillOutcomes } from '../entities/skill/skill-import.types';
import type { BlockingIssue } from '../n8n-packages.types';

/** Keep the failure and the committed changes in the same response. */
export class SkillImportFailedError extends ResponseError {
	override readonly meta: Record<string, unknown>;

	constructor(cause: unknown, skills: ImportedSkillSummary[]) {
		const response = cause instanceof ResponseError ? cause : undefined;
		super(
			response && response.httpStatusCode < 500
				? response.message
				: cause instanceof UserError
					? cause.message
					: 'Package import failed after Skill changes were saved.',
			response?.httpStatusCode ?? (cause instanceof UserError ? 400 : 500),
			response?.errorCode,
			response?.hint,
			cause,
		);
		this.meta = {
			issues: [],
			...(response?.metaIsInternal ? {} : response?.meta),
			skills,
			counts: { skills: countSkillOutcomes(skills) },
		};
	}
}

export function toImportBlockedError(
	issues: BlockingIssue[],
): ConflictError | UnprocessableRequestError {
	const message =
		`Import blocked: ${issues.length} issue(s) must be resolved before the package ` +
		'can be imported.';

	if (
		issues.some(
			(issue) =>
				issue.type === 'skill-conflict' ||
				issue.type === 'agent-conflict' ||
				issue.type === 'workflow-conflict' ||
				issue.type === 'workflow-lineage-conflict' ||
				issue.type === 'workflow-id-conflict' ||
				issue.type === 'workflow-folder-conflict' ||
				issue.type === 'workflow-removal-conflict' ||
				issue.type === 'project-conflict' ||
				issue.type === 'folder-conflict' ||
				issue.type === 'variable-conflict' ||
				issue.type === 'credential-conflict' ||
				(issue.type === 'data-table-unresolved' &&
					(issue.kind === 'id-conflict' || issue.kind === 'name-conflict')) ||
				(issue.type === 'tag-unresolved' &&
					(issue.kind === 'rename-drift' || issue.kind === 'name-collision')),
		)
	) {
		return new ConflictError(message, undefined, { issues });
	}

	return new UnprocessableRequestError(message, undefined, { issues });
}
