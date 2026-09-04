import type { AgentConfigValidationIssue } from '@n8n/api-types';

/**
 * A warning blocks publishing but not the draft preview: the workflow tool is
 * compatible, its workflow just has no published version yet.
 */
export function isWarningIssue(issue: AgentConfigValidationIssue): boolean {
	return issue.code === 'incompatible_reference' && issue.reason === 'not_published';
}

/** Warning-only issues are resolved by the publish flow itself, so only the rest block it. */
export function hasBlockingIssues(issues: AgentConfigValidationIssue[]): boolean {
	return issues.some((issue) => !isWarningIssue(issue));
}
