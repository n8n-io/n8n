import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

type AgentMutationKey = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
type AgentPermissionKey = AgentMutationKey | 'execute';

export type AgentPermissions = Record<`can${Capitalize<AgentPermissionKey>}`, ComputedRef<boolean>>;

// The mutating permissions are additionally blocked whenever source control puts
// the instance in a read-only branch. Agents themselves aren't tracked by source
// control, but `branchReadOnly` doubles as the instance-wide "no writes" signal —
// matching how other resource views (workflows, credentials, data tables) combine
// scopes with this flag.
//
// `canExecute` is deliberately outside that: running an agent writes no config, so
// a read-only branch is no reason to stop it — the same reasoning that puts the
// eval run route on `agent:execute` while the rest sit on `agent:update`.
export function useAgentPermissions(
	projectId: MaybeRefOrGetter<string | undefined>,
): AgentPermissions {
	const projectsStore = useProjectsStore();
	const usersStore = useUsersStore();
	const sourceControlStore = useSourceControlStore();

	const projectScopes = computed(
		() =>
			getResourcePermissions(
				projectsStore.myProjects?.find((p) => p.id === toValue(projectId))?.scopes,
			).agent,
	);
	const globalScopes = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).agent,
	);
	const isReadOnly = computed(() => sourceControlStore.preferences.branchReadOnly);

	const hasScope = (key: AgentPermissionKey) =>
		Boolean(globalScopes.value[key] ?? projectScopes.value[key]);

	const pick = (key: AgentMutationKey): ComputedRef<boolean> =>
		computed(() => !isReadOnly.value && hasScope(key));

	return {
		canCreate: pick('create'),
		canUpdate: pick('update'),
		canDelete: pick('delete'),
		canPublish: pick('publish'),
		canUnpublish: pick('unpublish'),
		canExecute: computed(() => hasScope('execute')),
	};
}
