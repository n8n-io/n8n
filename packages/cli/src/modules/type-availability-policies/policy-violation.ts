import type { PolicyViolation } from '@n8n/decorators';

import type { PolicyVerdict } from './policy-rule.types';

const CHECK_ID = 'node-type-availability';

/**
 * Turns a `deny` verdict into the violation shape the rest of the policy infrastructure
 * expects. Returns `null` for `allow`/`delegate` — an unmet delegation is a composition-level
 * concern (deciding *which* scope's verdict to report), not this function's call to make.
 */
export function toNodeTypeViolation(
	verdict: PolicyVerdict,
	typeName: string,
	scope: 'instance' | 'project',
): PolicyViolation | null {
	if (verdict.action !== 'deny') return null;

	return {
		kind: 'node-type-unavailable',
		checkId: CHECK_ID,
		message: `${typeName} is not available in this ${scope}`,
		subject: typeName,
		subjectType: 'node-type',
		scope,
		matchedRuleId: verdict.matchedRuleId ?? undefined,
	};
}
