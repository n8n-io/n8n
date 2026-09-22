import { nodeTypePackageResolver, type PackageResolver } from './policy-evaluator';
import type { PolicyRule } from './policy-rule.types';

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

/**
 * `resolvePackage` returns `null` for a type whose package is unknown, but the map it looks
 * up in is keyed by `string` — so a `null` short-circuits to "no earlier occurrence" instead
 * of becoming a lookup key.
 */
function resolvePackageOrUndefined(
	firstByPackage: ReadonlyMap<string, FirstOccurrence>,
	resolvePackage: PackageResolver,
	typeName: string,
): FirstOccurrence | undefined {
	const packageName = resolvePackage(typeName);
	return packageName === null ? undefined : firstByPackage.get(packageName);
}

/**
 * Finds rules in an ordered rule list that can never match, because an earlier rule in the
 * same list already matches every type the later rule would match.
 *
 * A name selector matches exactly one type, so it is shadowed only by an earlier, identical
 * name selector. A package selector matches every type in that package, so it also shadows a
 * later name selector scoped to that same package. A name selector never shadows a package
 * selector: one type can't cover a whole package.
 *
 * Runs in one O(n) pass: instead of comparing each rule against every rule before it, it
 * keeps, per selector kind, only the earliest rule seen so far for each selector value, and
 * looks that up once per rule.
 *
 * Pure and synchronous, like `evaluateType` — it never throws and never blocks the write.
 * Callers decide what to do with the warnings (e.g. return them alongside the saved policy).
 *
 * `resolvePackage` must resolve the same way `evaluateType` will for this policy's `kind`
 * (see `packageResolverFor` in `package-resolver.ts`), so a shadow this lint warns about is
 * exactly one evaluation would also produce. Defaults to the `node-types` convention.
 */
export function lintRulesForShadowing(
	rules: readonly PolicyRule[],
	resolvePackage: PackageResolver = nodeTypePackageResolver,
): ShadowWarning[] {
	const warnings: ShadowWarning[] = [];

	const firstByName = new Map<string, FirstOccurrence>();
	const firstByPackage = new Map<string, FirstOccurrence>();

	for (let index = 0; index < rules.length; index++) {
		const rule = rules[index];
		const { selector } = rule;

		const shadowedBy =
			selector.kind === 'package'
				? firstByPackage.get(selector.value)
				: earlierOccurrence(
						firstByName.get(selector.value),
						resolvePackageOrUndefined(firstByPackage, resolvePackage, selector.value),
					);

		if (shadowedBy) {
			warnings.push({ ruleId: rule.id, shadowedByRuleId: shadowedBy.rule.id });
		}

		const firstOccurrenceByValue = selector.kind === 'package' ? firstByPackage : firstByName;
		if (!firstOccurrenceByValue.has(selector.value)) {
			firstOccurrenceByValue.set(selector.value, { rule, index });
		}
	}

	return warnings;
}
