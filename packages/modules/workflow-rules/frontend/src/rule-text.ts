import type { useI18n } from '@n8n/i18n';
import type { CustomRule, RuleFinding } from '@n8n/workflow-rules';

import { CATALOGUE_RULE_TEXT } from './workflow-rules.constants';

type I18n = ReturnType<typeof useI18n>;

/** The title of a catalogue rule from i18n, or the admin's name for a custom rule. */
export function ruleTitle(i18n: I18n, ruleId: string, customRules: readonly CustomRule[] = []) {
	const text = CATALOGUE_RULE_TEXT[ruleId];
	if (text) return i18n.baseText(text.title);
	return customRules.find((rule) => rule.id === ruleId)?.name ?? ruleId;
}

/** Who set the rule, so a builder knows whom to ask. */
export function ruleSourceText(
	i18n: I18n,
	finding: Pick<RuleFinding, 'scope' | 'projectCanExempt'>,
) {
	return finding.scope === 'project'
		? i18n.baseText('workflowRules.source.project')
		: i18n.baseText('workflowRules.source.instance');
}
