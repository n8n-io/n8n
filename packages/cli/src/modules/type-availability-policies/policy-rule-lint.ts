import type { PackageResolver, PolicedType } from './policy-evaluator';
import type { PolicyRule, PolicySelector } from './policy-rule.types';
import { lintRulesForShadowing, type ShadowWarning } from './policy-shadow-lint';

/**
 * `ruleId` names a package or type this instance has not loaded. The rule still applies by
 * name, for example to an imported workflow. `NODES_EXCLUDE` and `NODES_INCLUDE` count too.
 */
export type NotLoadedWarning = {
	readonly kind: 'notLoaded';
	readonly ruleId: string;
};

export type PolicyRuleWarning = ShadowWarning | NotLoadedWarning;

/**
 * Warns instead of rejecting: a package can be uninstalled after its rule is saved, and the
 * rule must not block later, unrelated writes to the same policy.
 */
export function lintRulesForMissingTypes(
	rules: readonly PolicyRule[],
	isLoaded: (selector: PolicySelector) => boolean,
): NotLoadedWarning[] {
	return rules
		.filter((rule) => !isLoaded(rule.selector))
		.map((rule) => ({ kind: 'notLoaded', ruleId: rule.id }));
}

/**
 * Every warning for a rule list, in rule order. A rule with both kinds lists `shadowed` first,
 * since the sort is stable.
 */
export function lintPolicyRules(
	rules: readonly PolicyRule[],
	resolvers: {
		resolvePackage: PackageResolver;
		policedType: (name: string) => PolicedType;
		isLoaded: (selector: PolicySelector) => boolean;
	},
): PolicyRuleWarning[] {
	const position = new Map(rules.map((rule, index) => [rule.id, index]));
	const warnings: PolicyRuleWarning[] = [
		...lintRulesForShadowing(rules, resolvers.resolvePackage, resolvers.policedType),
		...lintRulesForMissingTypes(rules, resolvers.isLoaded),
	];

	return warnings.sort((a, b) => (position.get(a.ruleId) ?? 0) - (position.get(b.ruleId) ?? 0));
}
