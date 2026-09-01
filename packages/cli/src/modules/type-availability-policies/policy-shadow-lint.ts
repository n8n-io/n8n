import type { PolicyRule, PolicySelector } from './policy-rule.types';

/**
 * One case of an unreachable rule: `ruleId` can never match, because `shadowedByRuleId`
 * appears earlier in the same rule list and matches every type that `ruleId` would match.
 */
export type ShadowWarning = {
	readonly ruleId: string;
	readonly shadowedByRuleId: string;
};

/**
 * Package selectors match the segment of the type name before the first dot (a full type
 * name is always `<packageName>.<nodeName>`). Same convention as `policy-evaluator.ts`.
 */
function packageOf(typeName: string): string {
	return typeName.split('.')[0];
}

/**
 * True when every node type matched by `later` is already matched by `earlier`, so a rule
 * using `later` can never be reached once a rule using `earlier` sits ahead of it.
 *
 * A name selector matches exactly one type, so it is a superset of another selector only
 * when both selectors are identical. A package selector matches every type in that package,
 * so it is also a superset of a later name selector scoped to that same package. A name
 * selector is never a superset of a package selector: one type can't cover a whole package.
 */
function selectorIsSupersetOf(earlier: PolicySelector, later: PolicySelector): boolean {
	if (earlier.kind === later.kind) {
		return earlier.value === later.value;
	}

	if (earlier.kind === 'package' && later.kind === 'name') {
		return packageOf(later.value) === earlier.value;
	}

	return false;
}

/**
 * Finds rules in an ordered rule list that can never match, because an earlier rule in the
 * same list already matches every type the later rule would match.
 *
 * Pure and synchronous, like `evaluateType` — it never throws and never blocks the write.
 * Callers decide what to do with the warnings (e.g. return them alongside the saved policy).
 */
export function lintRulesForShadowing(rules: readonly PolicyRule[]): ShadowWarning[] {
	const warnings: ShadowWarning[] = [];

	for (let laterIndex = 0; laterIndex < rules.length; laterIndex++) {
		const laterRule = rules[laterIndex];

		for (let earlierIndex = 0; earlierIndex < laterIndex; earlierIndex++) {
			const earlierRule = rules[earlierIndex];

			if (selectorIsSupersetOf(earlierRule.selector, laterRule.selector)) {
				warnings.push({ ruleId: laterRule.id, shadowedByRuleId: earlierRule.id });
				break;
			}
		}
	}

	return warnings;
}
