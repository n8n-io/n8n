import { readonly, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { InstanceAiProvenanceListItem } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { fetchMyAutomations } from '../provenance/provenance.api';

/** The number of automations that the sidebar shows. */
export const AUTOMATIONS_SHOWN = 5;

/**
 * The workflows that the Assistant built for the current user, newest first.
 * `automations` is undefined until a load succeeds. A failed load keeps the last list and
 * shows nothing to the user, because the sidebar list is optional.
 */
export function useMyAutomations(enabled: MaybeRefOrGetter<boolean>) {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const automations = ref<InstanceAiProvenanceListItem[] | undefined>();

	// Increments on each load, so that a slow answer to an earlier load cannot replace a newer list.
	let generation = 0;

	async function refresh() {
		if (!toValue(enabled)) return;
		generation++;
		const current = generation;
		try {
			const items = await fetchMyAutomations(rootStore.restApiContext, AUTOMATIONS_SHOWN);
			if (current === generation) automations.value = items;
		} catch {
			// Offline, no access or the Assistant is off: keep the last list.
		}
	}

	watch(
		[() => toValue(enabled), () => usersStore.currentUserId],
		([isOn, userId], [, previousUserId]) => {
			// A new sign-in does not reload the page, and the list of another user must not show.
			if (userId !== previousUserId) {
				generation++;
				automations.value = undefined;
			}
			if (isOn) void refresh();
		},
		{ immediate: true },
	);

	return { automations: readonly(automations), refresh };
}
