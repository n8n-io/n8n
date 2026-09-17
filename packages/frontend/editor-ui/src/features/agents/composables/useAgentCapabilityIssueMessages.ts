import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { workflowToolTriggerLabel } from '../utils/workflowToolTriggers';

const GENERIC_ISSUE_KEYS: Record<AgentConfigValidationIssue['code'], BaseTextKey> = {
	missing_required: 'agents.builder.validation.issue.missingRequired' as BaseTextKey,
	invalid_value: 'agents.builder.validation.issue.invalidValue' as BaseTextKey,
	missing_credential: 'agents.builder.validation.issue.missingCredential' as BaseTextKey,
	invalid_credential: 'agents.builder.validation.issue.invalidCredential' as BaseTextKey,
	incompatible_credential: 'agents.builder.validation.issue.incompatibleCredential' as BaseTextKey,
	missing_reference: 'agents.builder.validation.issue.missingReference' as BaseTextKey,
	incompatible_reference: 'agents.builder.validation.issue.incompatibleReference' as BaseTextKey,
};

const SPECIFIC_ISSUE_KEYS: Record<string, BaseTextKey> = {
	'subAgent.missing_reference':
		'agents.builder.validation.issue.subAgent.missingReference' as BaseTextKey,
	'subAgent.incompatible_reference':
		'agents.builder.validation.issue.subAgent.incompatibleReference' as BaseTextKey,
	'skill.missing_reference':
		'agents.builder.validation.issue.skill.missingReference' as BaseTextKey,
	'tool.workflow.missing_reference':
		'agents.builder.validation.issue.tool.workflow.missingReference' as BaseTextKey,
	'tool.workflow.incompatible_reference':
		'agents.builder.validation.issue.tool.workflow.incompatibleReference' as BaseTextKey,
	'tool.custom.missing_reference':
		'agents.builder.validation.issue.tool.custom.missingReference' as BaseTextKey,
	'tool.node.missing_reference':
		'agents.builder.validation.issue.tool.node.missingReference' as BaseTextKey,
	'mcpServer.incompatible_credential':
		'agents.builder.validation.issue.mcpServer.incompatibleCredential' as BaseTextKey,
};

const REASON_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	incompatible_nodes:
		'agents.builder.validation.issue.tool.workflow.incompatibleNodes' as BaseTextKey,
	no_supported_trigger:
		'agents.builder.validation.issue.tool.workflow.noSupportedTrigger' as BaseTextKey,
	not_published: 'agents.builder.validation.issue.tool.workflow.notPublished' as BaseTextKey,
};

export function useAgentCapabilityIssueMessages(
	getValidationIssues: () => AgentConfigValidationIssue[],
) {
	const i18n = useI18n();

	function issueMessage(issue: AgentConfigValidationIssue): string {
		const { kind, toolType, id } = issue.capability;
		const key =
			(issue.reason ? REASON_SPECIFIC_KEYS[issue.reason] : undefined) ??
			(kind === 'tool' && toolType
				? SPECIFIC_ISSUE_KEYS[`tool.${toolType}.${issue.code}`]
				: undefined) ??
			SPECIFIC_ISSUE_KEYS[`${kind}.${issue.code}`] ??
			GENERIC_ISSUE_KEYS[issue.code];
		return i18n.baseText(key, {
			interpolate: { id: id ?? '', trigger: workflowToolTriggerLabel() },
		});
	}

	function issueMessages(issues: AgentConfigValidationIssue[]): string[] {
		return [...new Set(issues.map(issueMessage))];
	}

	function groupIssueMessages<TKey>(
		kind: AgentConfigValidationIssue['capability']['kind'],
		keyOf: (issue: AgentConfigValidationIssue) => TKey | undefined,
		include: (issue: AgentConfigValidationIssue) => boolean = () => true,
	): Map<TKey, string[]> {
		const byKey = new Map<TKey, AgentConfigValidationIssue[]>();
		for (const issue of getValidationIssues()) {
			if (issue.capability.kind !== kind || !include(issue)) continue;
			const key = keyOf(issue);
			if (key === undefined) continue;
			const existing = byKey.get(key);
			if (existing) existing.push(issue);
			else byKey.set(key, [issue]);
		}
		return new Map([...byKey].map(([key, issues]) => [key, issueMessages(issues)]));
	}

	return { groupIssueMessages };
}
