import type { InstanceTypeAccessResponse, PolicyAction } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, reactive, ref, shallowRef, toRaw, watch } from 'vue';

import { useInstancePolicy } from './useInstancePolicy';
import { fetchInstanceAccess, type InstancePolicyContent } from '../type-availability-policies.api';
import type { RestrictedTypeKind } from '../type-availability-policies.constants';

export type InstanceTypeAccessRow = {
	name: string;
	access: PolicyAction;
	/** False when a rule leaves the type open to project opt-in, which the admin page cannot set. */
	editable: boolean;
};

/** Changes the rules so that one type gets the given access, and no other type changes. */
export type SetTypeAccess<K extends RestrictedTypeKind> = (
	policy: InstancePolicyContent<K>,
	typeName: string,
	access: PolicyAction,
) => InstancePolicyContent<K>;

type PendingChange = { access: PolicyAction; savedVersion?: number };

/** The access of every type of one kind under the instance policy, for a tab of the admin page. */
export function useInstanceTypeAccess<K extends RestrictedTypeKind>(
	kind: K,
	setTypeAccess: SetTypeAccess<K>,
) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const instancePolicy = useInstancePolicy();

	const response = shallowRef<InstanceTypeAccessResponse | null>(null);
	const loadingAccess = ref(false);
	const latestLoad = useLatestFetch();

	// A save that does not apply drops its entry, so the row goes back to the server value.
	const pending = reactive(new Map<string, PendingChange>());

	const types = computed<InstanceTypeAccessRow[]>(() =>
		(response.value?.types ?? []).map((type) => ({
			name: type.name,
			access: pending.get(type.name)?.access ?? type.access,
			editable: !(type.access === 'delegate' && type.matchedRuleId !== null),
		})),
	);

	const loading = computed(
		() => loadingAccess.value || instancePolicy.loadStates[kind] === 'loading',
	);

	async function load() {
		const isLatest = latestLoad.next();
		loadingAccess.value = true;
		try {
			const loaded = await fetchInstanceAccess(rootStore.restApiContext, kind);
			if (!isLatest()) return;
			response.value = loaded;
			for (const [name, change] of pending) {
				if (change.savedVersion !== undefined && loaded.version >= change.savedVersion) {
					pending.delete(name);
				}
			}
		} catch (error) {
			if (isLatest()) {
				toast.showError(error, i18n.baseText('typeAvailabilityPolicies.instancePolicy.loadError'));
			}
		} finally {
			if (isLatest()) loadingAccess.value = false;
		}
	}

	// The store holds the version that a save sends back. Reloading whenever it differs from the
	// access list keeps the rows on the policy that the next save edits.
	watch(
		() => instancePolicy.policies[kind]?.version,
		(version) => {
			if (version !== undefined && version !== response.value?.version) void load();
		},
		{ immediate: true },
	);

	async function changeAccess(typeName: string, access: PolicyAction) {
		const change: PendingChange = { access };
		pending.set(typeName, change);
		const result = await instancePolicy.save(kind, (policy) =>
			setTypeAccess(policy, typeName, access),
		);

		// A later pick on the same row owns the entry now.
		if (toRaw(pending.get(typeName)) !== change) return;
		const savedVersion = instancePolicy.policies[kind]?.version;
		if (result.status === 'saved' && savedVersion !== undefined) {
			if ((response.value?.version ?? -1) >= savedVersion) pending.delete(typeName);
			else change.savedVersion = savedVersion;
		} else {
			pending.delete(typeName);
		}
	}

	return { types, loading, changeAccess };
}
