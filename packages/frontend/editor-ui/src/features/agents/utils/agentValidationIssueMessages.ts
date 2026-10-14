import type { AgentConfigValidationIssue } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import { GENERIC_ISSUE_KEYS, SPECIFIC_ISSUE_KEYS } from './validationIssues';
import { workflowToolTriggerLabel } from './workflowToolTriggers';

const REASON_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	incompatible_nodes:
		'agents.builder.validation.issue.tool.workflow.incompatibleNodes' as BaseTextKey,
	no_supported_trigger:
		'agents.builder.validation.issue.tool.workflow.noSupportedTrigger' as BaseTextKey,
	not_published: 'agents.builder.validation.issue.tool.workflow.notPublished' as BaseTextKey,
};

export function resolveAgentValidationIssueMessageKey(
	issue: AgentConfigValidationIssue,
): BaseTextKey {
	const { kind, toolType } = issue.capability;
	return (
		(issue.code === 'invalid_value' && issue.path.endsWith('.node.nodeParameters.url')
			? ('agents.builder.validation.issue.httpRequestUrlFromAi' as BaseTextKey)
			: undefined) ??
		(issue.reason ? REASON_SPECIFIC_KEYS[issue.reason] : undefined) ??
		(kind === 'tool' && toolType
			? SPECIFIC_ISSUE_KEYS[`tool.${toolType}.${issue.code}`]
			: undefined) ??
		SPECIFIC_ISSUE_KEYS[`${kind}.${issue.code}`] ??
		GENERIC_ISSUE_KEYS[issue.code]
	);
}

export function getAgentValidationIssueInterpolation(issue: AgentConfigValidationIssue) {
	return {
		id: issue.capability.id ?? '',
		trigger: workflowToolTriggerLabel(),
	};
}
