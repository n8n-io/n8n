import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { fetchMyAutomations } from '../provenance/provenance.api';
import { useAssistantSidebarStore } from './assistantSidebar.store';

/** The number of automations that the sidebar shows. */
export const AUTOMATIONS_SHOWN = 5;

/**
 * The workflows that the Assistant built for the current user, newest first.
 * `automations` is undefined until a load succeeds. The list stays in a store: a sidebar that
 * mounts again shows the last list at once and loads a new one in the background.
 * A failed load keeps the last list and shows nothing to the user, because the sidebar list is
 * optional.
 */
export function useMyAutomations(enabled: MaybeRefOrGetter<boolean>) {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const store = useAssistantSidebarStore();

	async function refresh() {
		// After a sign-out the sidebar can still be mounted, but there is no list to ask for.
		if (!toValue(enabled) || !usersStore.currentUserId) return;
		const request = ++store.automationsRequest;
		try {
			const items = await fetchMyAutomations(rootStore.restApiContext, AUTOMATIONS_SHOWN);
			// A newer request, also from a sidebar that mounted later, or a new sign-in started.
			if (request === store.automationsRequest) store.automations = items;
		} catch {
			// Offline, no access or the Assistant is off: keep the last list.
		} finally {
			// The rows below the section wait for this, also when the load failed.
			if (request === store.automationsRequest) store.automationsSettled = true;
		}
	}

	// The store drops the list of the previous user when the user changes.
	watch(
		[() => toValue(enabled), () => usersStore.currentUserId],
		([isOn]) => {
			if (isOn) void refresh();
		},
		{ immediate: true },
	);

	return { automations: computed(() => store.automations), refresh };
}
