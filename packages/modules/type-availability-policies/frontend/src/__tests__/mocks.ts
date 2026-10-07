import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { vi } from 'vitest';

import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/**
 * Makes the active pinia's policy store report these node types as restricted. Call after
 * `setActivePinia` (or after rendering with the pinia the component uses).
 */
export function mockRestrictedNodeTypes(
	restricted: Record<string, NodeTypeAvailabilityScope> = {},
): void {
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'getNodeTypeAvailability').mockImplementation(
		(name) => {
			const scope = restricted[name];
			return scope ? { name, available: false, scope } : { name, available: true };
		},
	);
}
