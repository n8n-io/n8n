import type { PolicyKindDefinition } from './policy-kind';
import type { PolicyRule, PolicySelector } from './policy-rule.types';

/**
 * One case of an unreachable rule: `ruleId` can never match, because `shadowedByRuleId`
 * appears earlier in the same rule list and matches every type that `ruleId` would match.
 */
export type ShadowWarning = {
	readonly ruleId: string;
	readonly shadowedByRuleId: string;
};

/** The earliest rule (by position) that first used a given selector value. */
type FirstOccurrence = { readonly rule: PolicyRule; readonly index: number };

/**
 * The earlier of two candidate occurrences, or whichever one is defined. Used to pick, among
 * several selectors that could each shadow a rule, the one that actually appears first.
 */
function earlierOccurrence(
	a: FirstOccurrence | undefined,
	b: FirstOccurrence | undefined,
): FirstOccurrence | undefined {
	if (!a) return b;
	if (!b) return a;
	return a.index <= b.index ? a : b;
}

const selectorKey = (selector: PolicySelector) => `${selector.kind}:${selector.value}`;

/**
 * Finds rules that can never match because an earlier rule already matches every type they
 * would. The kind says which selectors cover a rule. One pass: it keeps the earliest rule per
 * selector. It never throws, so it never blocks a write.
 */
export function lintRulesForShadowing(
	rules: readonly PolicyRule[],
	kind: Pick<PolicyKindDefinition, 'coveringSelectors'>,
): ShadowWarning[] {
	const warnings: ShadowWarning[] = [];
	const firstBySelector = new Map<string, FirstOccurrence>();

	for (let index = 0; index < rules.length; index++) {
		const rule = rules[index];

		const shadowedBy = kind
			.coveringSelectors(rule.selector)
			.map((selector) => firstBySelector.get(selectorKey(selector)))
			.reduce(earlierOccurrence, undefined);

		if (shadowedBy) {
			warnings.push({ ruleId: rule.id, shadowedByRuleId: shadowedBy.rule.id });
		}

		const key = selectorKey(rule.selector);
		if (!firstBySelector.has(key)) firstBySelector.set(key, { rule, index });
	}

	return warnings;
}
