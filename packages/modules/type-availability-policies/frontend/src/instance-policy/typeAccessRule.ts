import type { InstanceTypeAccess } from '@n8n/api-types';

/**
 * False when a rule leaves the type open to project opt-in. The admin page sets only Allowed and
 * Restricted, so it cannot change such a type without removing what that rule decides.
 */
export function isTypeAccessEditable({
	access,
	matchedRuleId,
}: Pick<InstanceTypeAccess, 'access' | 'matchedRuleId'>): boolean {
	return !(access === 'delegate' && matchedRuleId !== null);
}
