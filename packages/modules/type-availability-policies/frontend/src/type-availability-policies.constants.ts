import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

/** Must stay the same as the backend module id: `settings.activeModules` is keyed by it. */
export const TYPE_AVAILABILITY_POLICIES_MODULE_ID = 'type-availability-policies';

export const TYPE_AVAILABILITY_POLICIES_STORE_ID = 'typeAvailabilityPolicies';

export const SCOPE_LABEL_KEY: Record<NodeTypeAvailabilityScope, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.restrictedNode.scope.instance',
	project: 'typeAvailabilityPolicies.restrictedNode.scope.project',
};

export function isRestrictionScope(scope: string): scope is NodeTypeAvailabilityScope {
	return Object.hasOwn(SCOPE_LABEL_KEY, scope);
}
