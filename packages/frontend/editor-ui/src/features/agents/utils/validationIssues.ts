import type { AgentConfigValidationIssue } from '@n8n/api-types';

/**
 * A warning blocks publishing but not the draft preview: the workflow tool is
 * compatible, its workflow just has no published version yet.
 */
export function isWarningIssue(issue: AgentConfigValidationIssue): boolean {
	return issue.code === 'incompatible_reference' && issue.reason === 'not_published';
}
