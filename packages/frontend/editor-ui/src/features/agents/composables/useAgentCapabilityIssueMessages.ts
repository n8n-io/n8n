import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import {
	getAgentValidationIssueInterpolation,
	resolveAgentValidationIssueMessageKey,
} from '../utils/agentValidationIssueMessages';

export function useAgentCapabilityIssueMessages(
	getValidationIssues: () => AgentConfigValidationIssue[],
) {
	const i18n = useI18n();

	function issueMessage(issue: AgentConfigValidationIssue): string {
		return i18n.baseText(resolveAgentValidationIssueMessageKey(issue), {
			interpolate: getAgentValidationIssueInterpolation(issue),
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
