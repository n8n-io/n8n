import type { PolicyAction } from '@n8n/api-types';

import type { InstancePolicyContent } from '../type-availability-policies.api';
import type { RestrictedTypeKind } from '../type-availability-policies.constants';

/**
 * Gives the type its own `name` rule and replaces the earlier one. The first matching rule decides,
 * so the new rule goes directly before the rule that decides the type now (`decidingRuleId`):
 * - The rules before it do not match the type, so they stay in front. A rule on a generated Tool
 *   variant, such as `slackTool`, keeps deciding that variant.
 * - When no rule matches the type (`null`), the new rule goes last.
 * - When the deciding rule is not known (`undefined`) or not in the list, the new rule goes first,
 *   which always gives the type its access. It can then also decide a Tool variant that had a rule
 *   of its own. This happens only when a save runs before the access list reloads, until GOV-362
 *   moves the write to the server.
 *
 * A `name` rule on a node type also matches the Tool variants that no earlier rule decides, so they
 * follow their base type. A trigger has a name of its own and keeps its access.
 */
export function setTypeAccess<K extends RestrictedTypeKind>(
	policy: InstancePolicyContent<K>,
	typeName: string,
	action: PolicyAction,
	decidingRuleId?: string | null,
): InstancePolicyContent<K> {
	const rule = {
		id: crypto.randomUUID(),
		action,
		selector: { kind: 'name' as const, value: typeName },
	};
	const isOwnRule = (existing: (typeof policy.rules)[number]) =>
		existing.selector.kind === 'name' && existing.selector.value === typeName;

	let at = policy.rules.length;
	if (decidingRuleId !== null) {
		at = Math.max(
			0,
			policy.rules.findIndex((existing) => existing.id === decidingRuleId),
		);
	}

	const rules = [...policy.rules];
	rules.splice(at, 0, rule);
	return {
		defaultAction: policy.defaultAction,
		rules: rules.filter((existing) => existing === rule || !isOwnRule(existing)),
	};
}
