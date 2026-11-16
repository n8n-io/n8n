import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useInstancePolicyStore, type InstancePolicySaveResult } from './instance-policy.store';
import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import type { InstancePolicy, InstancePolicyContent } from '../type-availability-policies.api';
import type { RestrictedTypeKind } from '../type-availability-policies.constants';

/**
 * Loads and saves the instance policy for the admin pages, and tells the admin when a load or a
 * save fails or when another admin saved first. It loads only the kinds the user can manage.
 */
export function useInstancePolicy() {
	const store = useInstancePolicyStore();
	const toast = useToast();
	const i18n = useI18n();
	const { manageableKinds } = usePolicyAdminAccess();

	async function load(): Promise<void> {
		const [error] = await store.load(manageableKinds.value);
		if (error !== undefined) {
			toast.showError(error, i18n.baseText('typeAvailabilityPolicies.instancePolicy.loadError'));
		}
	}

	async function save<K extends RestrictedTypeKind>(
		kind: K,
		update: (policy: InstancePolicy<K>) => InstancePolicyContent<K>,
	): Promise<InstancePolicySaveResult> {
		const result = await store.save(kind, update);

		if (result.status === 'changed') {
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('typeAvailabilityPolicies.instancePolicy.changed.title'),
				message: i18n.baseText('typeAvailabilityPolicies.instancePolicy.changed.message'),
			});
		} else if (result.status === 'failed') {
			toast.showError(
				result.error,
				i18n.baseText('typeAvailabilityPolicies.instancePolicy.saveError'),
			);
		}

		return result;
	}

	return { policies: store.policies, loadStates: store.loadStates, load, save };
}
