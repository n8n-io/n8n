import type { PolicyAction } from '@n8n/api-types';

import type { InstancePolicyContent } from '../type-availability-policies.api';

/**
 * Gives the credential type its own rule at the top of the list, so that it wins over a broader
 * `package` or `extends` rule and changes no other type. A `name` rule on a node type also matches
 * its Tool variant, so do not reuse this for node types as is.
 */
export function setCredentialTypeAccess(
	policy: InstancePolicyContent<'credential'>,
	typeName: string,
	action: PolicyAction,
): InstancePolicyContent<'credential'> {
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
