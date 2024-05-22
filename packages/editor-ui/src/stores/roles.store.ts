import type { ProjectRole, RoleMap } from '@/types/roles.types';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as rolesApi from '@/api/roles.api';
import { useRootStore } from './n8nRoot.store';

export const useRolesStore = defineStore('roles', () => {
	const rootStore = useRootStore();

	const roles = ref<RoleMap>({
		global: [],
		project: [],
		credential: [],
		workflow: [],
	});
	const projectRoleOrder = ref<ProjectRole[]>(['project:editor', 'project:admin']);
	const projectRoleOrderMap = computed<Map<ProjectRole, number>>(
		() => new Map(projectRoleOrder.value.map((role, idx) => [role, idx])),
	);

	const processedProjectRoles = computed<RoleMap['project']>(() =>
		roles.value.project
			.sort(
				(a, b) =>
					(projectRoleOrderMap.value.get(a.role) ?? 0) -
					(projectRoleOrderMap.value.get(b.role) ?? 0),
			)
			.filter((role) => role.role !== 'project:personalOwner'),
	);

	const processedCredentialRoles = computed<RoleMap['credential']>(() =>
		roles.value.credential.filter((role) => role.role !== 'credential:owner'),
	);

	const processedWorkflowRoles = computed<RoleMap['workflow']>(() =>
		roles.value.workflow.filter((role) => role.role !== 'workflow:owner'),
	);

	const fetchRoles = async () => {
		roles.value = await rolesApi.getRoles(rootStore.getRestApiContext);
	};

	return {
		roles,
		processedProjectRoles,
		processedCredentialRoles,
		processedWorkflowRoles,
		fetchRoles,
	};
});
