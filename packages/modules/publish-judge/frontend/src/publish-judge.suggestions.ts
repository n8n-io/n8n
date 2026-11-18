import type { BaseTextKey } from '@n8n/i18n';

/** A rule an admin can start from: a short title, and the rule text sent to the Assistant. */
export type JudgeRuleSuggestion = { id: string; title: BaseTextKey; rule: BaseTextKey };

export type JudgeRuleGroup = {
	id: 'exact' | 'judgment';
	title: BaseTextKey;
	hint: BaseTextKey;
	suggestions: JudgeRuleSuggestion[];
};

const suggestion = (id: string): JudgeRuleSuggestion => ({
	id,
	title: `publishJudge.create.suggestion.${id}.title` as BaseTextKey,
	rule: `publishJudge.create.suggestion.${id}.rule` as BaseTextKey,
});

/** Exact rules come first: a judge checks them with code, so they are fast and free to run. */
export const JUDGE_RULE_GROUPS: JudgeRuleGroup[] = [
	{
		id: 'exact',
		title: 'publishJudge.create.group.exact.title',
		hint: 'publishJudge.create.group.exact.hint',
		suggestions: [
			suggestion('errorWorkflow'),
			suggestion('namingConvention'),
			suggestion('webhookAuth'),
			suggestion('triggerFrequency'),
			suggestion('blockCodeNode'),
			suggestion('httpDestinations'),
		],
	},
	{
		id: 'judgment',
		title: 'publishJudge.create.group.judgment.title',
		hint: 'publishJudge.create.group.judgment.hint',
		suggestions: [suggestion('secrets'), suggestion('customerData'), suggestion('aiModels')],
	},
];
