import type { PolicyAction } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useInstancePolicyStore, type InstancePolicySaveResult } from './instance-policy.store';
import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import type { RestrictedTypeKind } from '../type-availability-policies.constants';

export function useInstancePolicy() {
	const store = useInstancePolicyStore();
	const toast = useToast();
	const i18n = useI18n();
	const { manageableKinds } = usePolicyAdminAccess();

	async function load(): Promise<void> {
		const {
			errors: [error],
			accessErrors: [accessError],
		} = await store.load(manageableKinds.value);
		if (error !== undefined) {
			toast.showError(error, i18n.baseText('typeAvailabilityPolicies.instancePolicy.loadError'));
		}
		if (accessError !== undefined) showAccessError(accessError);
	}

	/** Reads the access of the types again, for example after an earlier read failed. */
	async function loadAccess(): Promise<void> {
		const [error] = await store.loadAccess(manageableKinds.value);
		if (error !== undefined) showAccessError(error);
	}

	/** Reads the usage counts of each manageable kind that has none yet, for an access dialog. */
	async function loadMissingUsage(): Promise<void> {
		await store.loadMissingUsage(manageableKinds.value);
	}

	function showAccessError(error: unknown) {
		toast.showError(
			error,
			i18n.baseText('typeAvailabilityPolicies.instancePolicy.accessLoadError'),
		);
	}

	/**
	 * Gives every type in `typeNames` the same access in one write, so either all of them change or
	 * none does. Tells the admin when the write did not save.
	 */
	async function setAccessMany(
		kind: RestrictedTypeKind,
		typeNames: readonly string[],
		action: PolicyAction,
	): Promise<InstancePolicySaveResult> {
		const result = await store.setAccess(
			kind,
			typeNames.map((type) => ({ type, access: action })),
		);

		if (result.status === 'changed') {
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('typeAvailabilityPolicies.instancePolicy.changed.title'),
				message: i18n.baseText('typeAvailabilityPolicies.instancePolicy.changed.message'),
			});
		} else if (result.status === 'notEditable' && result.sent) {
			// Not `showError`: it adds the server message, which names attachments that this page
			// does not show.
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('typeAvailabilityPolicies.instancePolicy.saveError'),
				message: i18n.baseText('typeAvailabilityPolicies.instancePolicy.notEditable.message'),
				duration: 0,
			});
		} else if (result.status === 'failed') {
			toast.showError(
				result.error,
				i18n.baseText('typeAvailabilityPolicies.instancePolicy.saveError'),
			);
		}

		if (
			(result.status === 'saved' || result.status === 'changed') &&
			result.accessError !== undefined
		) {
			showAccessError(result.accessError);
		}

		return result;
	}

	async function setAccess(
		kind: RestrictedTypeKind,
		typeName: string,
		action: PolicyAction,
	): Promise<InstancePolicySaveResult> {
		return await setAccessMany(kind, [typeName], action);
	}

	return {
		policies: store.policies,
		loadStates: store.loadStates,
		notEditable: store.notEditable,
		typeAccess: store.typeAccess,
		accessLoading: store.accessLoading,
		load,
		loadAccess,
		loadUsage: store.loadUsage,
		loadMissingUsage,
		usageOf: store.usageOf,
		setAccess,
		setAccessMany,
	};
}
