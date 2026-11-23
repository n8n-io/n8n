import type { InstanceTypeAccess, PolicyRule } from '@n8n/api-types';

import type { NodeTypeSummary } from '../type-availability-policies.api';

/**
 * The node types that the admin page lists. A hidden node type is left out, unless a `name` rule
 * decides it: the admin must see that rule to undo it. The default action or a broader rule, such
 * as one for its package, keeps it hidden.
 */
export function visibleNodeTypes<T extends Pick<InstanceTypeAccess, 'name' | 'matchedRuleId'>>(
	types: readonly T[],
	summaries: ReadonlyMap<string, Pick<NodeTypeSummary, 'hidden'>>,
	rules: ReadonlyArray<Pick<PolicyRule, 'id' | 'selector'>>,
): T[] {
	// The access list reloads after a save, so it can name a rule that the policy no longer has.
	// Only a known broader rule hides a type, so such a rule keeps the type until the reload.
	const broaderRuleIds = new Set(
		rules.flatMap((rule) => (rule.selector.kind === 'name' ? [] : [rule.id])),
	);

	return types.filter(
		(type) =>
			!summaries.get(type.name)?.hidden ||
			(type.matchedRuleId !== null && !broaderRuleIds.has(type.matchedRuleId)),
	);
}
