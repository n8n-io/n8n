/**
 * @deprecated Import from `@n8n/stores/cloudPlan.store` instead. This store moved to
 * `@n8n/stores` (N8N-67); this re-export is a temporary shim kept so existing
 * importers keep working and will be removed once call sites migrate.
 *
 * The shim also injects the `isInstanceOwner` check that the package store
 * needs but cannot import from the app layer.
 */
import { useCloudPlanStore as _useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

export type { CloudPlanState } from '@n8n/stores/cloudPlan.store';

export function useCloudPlanStore() {
	const store = _useCloudPlanStore();
	store.setIsInstanceOwner(() => hasPermission(['instanceOwner']));
	return store;
}
