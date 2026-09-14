import { computed, watch, type ComputedRef, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

/**
 * Resolves the display name of a run-as holder from a user id, fetching the
 * user when they are not already cached. Shared by `RunAsCallout` (the
 * Schedule Trigger NDV) and `WorkflowPublishModal` (the publish-blocking
 * callout), so both surfaces show the same name for the same holder.
 */
export function useRunAsHolderName(userId: Ref<string | undefined>): {
	holderName: ComputedRef<string>;
} {
	const i18n = useI18n();
	const usersStore = useUsersStore();

	const holderName = computed(() => {
		const id = userId.value;
		if (!id) return '';
		const user = usersStore.usersById[id];
		return user?.fullName ?? user?.email ?? i18n.baseText('runAs.callout.unknownUser');
	});

	// The name is decorative: fetch it when the holder isn't cached yet, but never
	// let a failed lookup break the caller.
	watch(
		userId,
		async (id) => {
			if (id && !usersStore.usersById[id]) {
				try {
					await usersStore.fetchUsers({ filter: { ids: [id] } });
				} catch {
					// Ignored: holderName already falls back to "another user".
				}
			}
		},
		{ immediate: true },
	);

	return { holderName };
}
