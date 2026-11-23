import type { PolicyRule } from './policy-rule.types';

type ListedType = { readonly name: string; readonly matchedRuleId: string | null };

type ResolveBaseName = (name: string) => { baseName: string; isSyntheticTool: boolean };

/**
 * Drops a generated tool variant that the same rule, or the default action, decides as its base:
 * it has the access of its base, so it gets no row. A variant that a different rule decides keeps
 * its row, so the admin can see that rule. `matchedRuleId` must come from the instance policy.
 */
export function withoutFollowingToolVariants<T extends ListedType>(
	types: readonly T[],
	resolveBaseName: ResolveBaseName,
): T[] {
	const matchedRuleIdByName = new Map(types.map((type) => [type.name, type.matchedRuleId]));

	return types.filter((type) => {
		const { baseName, isSyntheticTool } = resolveBaseName(type.name);
		return !isSyntheticTool || type.matchedRuleId !== matchedRuleIdByName.get(baseName);
	});
}

/**
 * The node types that the instance policy page lists, so that counts match the page. Mirrors
 * `visibleNodeTypes` in the module's frontend: a hidden type stays only when an instance `name`
 * rule decides it, because the admin must see that rule to undo it.
 */
export function listedNodeTypes<T extends ListedType>(
	types: readonly T[],
	options: {
		resolveBaseName: ResolveBaseName;
		hiddenTypes: ReadonlySet<string>;
		instanceRules: readonly PolicyRule[];
	},
): T[] {
	const nameRuleIds = new Set(
		options.instanceRules.flatMap((rule) => (rule.selector.kind === 'name' ? [rule.id] : [])),
	);

	return withoutFollowingToolVariants(types, options.resolveBaseName).filter(
		(type) =>
			!options.hiddenTypes.has(type.name) ||
			(type.matchedRuleId !== null && nameRuleIds.has(type.matchedRuleId)),
	);
}
