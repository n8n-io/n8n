import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@/features/settings/users/users.store';

type AgentPermissionKey = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';

export type AgentPermissions = Record<`can${Capitalize<AgentPermissionKey>}`, ComputedRef<boolean>>;

export function useAgentPermissions(
	projectId: MaybeRefOrGetter<string | undefined>,
): AgentPermissions {
	const projectsStore = useProjectsStore();
	const usersStore = useUsersStore();

	const projectScopes = computed(
		() =>
			getResourcePermissions(
				projectsStore.myProjects?.find((p) => p.id === toValue(projectId))?.scopes,
			).agent,
	);
	const globalScopes = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).agent,
	);

	const pick = (key: AgentPermissionKey): ComputedRef<boolean> =>
		computed(() => Boolean(globalScopes.value[key] ?? projectScopes.value[key]));

	return {
		canCreate: pick('create'),
		canUpdate: pick('update'),
		canDelete: pick('delete'),
		canPublish: pick('publish'),
		canUnpublish: pick('unpublish'),
	};
}
