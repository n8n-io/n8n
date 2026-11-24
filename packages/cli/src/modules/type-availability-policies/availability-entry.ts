import type { NodeTypeAvailability } from '@n8n/api-types';

import type { ComposedTypeVerdict } from './type-availability-policy.service';

/**
 * Only unavailable entries carry a reason, so a response for every type stays small on the
 * common path. The node and credential availability shapes are the same.
 */
export function toAvailabilityEntry(verdict: ComposedTypeVerdict): NodeTypeAvailability {
	if (verdict.action === 'allow') return { name: verdict.name, available: true };

	return {
		name: verdict.name,
		available: false,
		scope: verdict.scope,
		...(verdict.matchedRuleId !== null && { matchedRuleId: verdict.matchedRuleId }),
		...(verdict.optInAvailable && { optInAvailable: true }),
	};
}
