import type { PolicyAction } from '@n8n/api-types';

import type { InstancePolicyContent } from '../type-availability-policies.api';
import type { RestrictedTypeKind } from '../type-availability-policies.constants';

/**
 * Gives the type its own rule at the top of the list, so that it wins over a broader `package` or
 * `extends` rule and changes no other type. For a node type, the `name` rule also matches the Tool
 * variants that n8n generates from it, so they follow their base type. A trigger has a name of its
 * own and keeps its access.
 */
export function setTypeAccess<K extends RestrictedTypeKind>(
	policy: InstancePolicyContent<K>,
	typeName: string,
	action: PolicyAction,
): InstancePolicyContent<K> {
	const kept = policy.rules.filter(
		(rule) => !(rule.selector.kind === 'name' && rule.selector.value === typeName),
	);
	const rule = {
		id: crypto.randomUUID(),
		action,
		selector: { kind: 'name' as const, value: typeName },
	};

	return { defaultAction: policy.defaultAction, rules: [rule, ...kept] };
}
