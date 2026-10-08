import { defineStore } from 'pinia';
import { ref, shallowRef, watch } from 'vue';
import type { InstanceAiProvenanceListItem } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import type { ThreadGroup } from './groupThreads';

/**
 * The state of the Assistant sections in the sidebar that must outlive one sidebar. Each layout
 * (overview, workflow editor, Assistant) mounts its own sidebar, so each move between these pages
 * mounts the sections again. The state belongs to the signed-in user.
 */
export const useAssistantSidebarStore = defineStore('instanceAiSidebar', () => {
	const usersStore = useUsersStore();

	/** The last list of automations. Undefined until a load succeeds. */
	const automations = shallowRef<readonly InstanceAiProvenanceListItem[] | undefined>();

	/** Increments on each automations request, so that an older answer cannot replace a newer list. */
	const automationsRequest = ref(0);

	/** The Power mode groups that show all of their chats. */
	const expandedGroups = shallowRef<ReadonlySet<ThreadGroup>>(new Set());

	/** True when the first chat list request of the sidebar ended, with or without success. */
	const chatListSettled = ref(false);

	/** True when the first automations request ended, with or without success. */
	const automationsSettled = ref(false);

	// A sign-in or a sign-out does not reload the page. `sync` makes sure that no render and no
	// late answer can show the state of the previous user.
	watch(
		() => usersStore.currentUserId,
		() => {
			automations.value = undefined;
			automationsRequest.value++;
			expandedGroups.value = new Set();
			chatListSettled.value = false;
			automationsSettled.value = false;
		},
		{ flush: 'sync' },
	);

	return {
		automations,
		automationsRequest,
		expandedGroups,
		chatListSettled,
		automationsSettled,
	};
});
