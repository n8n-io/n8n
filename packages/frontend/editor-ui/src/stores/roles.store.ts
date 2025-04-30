import { type ProjectRole, type AllRolesMap, ALL_ROLES } from '@n8n/permissions';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { STORES } from '@/constants';
import { useSettingsStore } from './settings.store';

export const useRolesStore = defineStore(STORES.ROLES, () => {
	const settingsStore = useSettingsStore();

	const projectRoleOrder = ref<ProjectRole[]>([
		'project:viewer',
		'project:editor',
		'project:admin',
	]);

	const projectRoleOrderMap = computed<Map<ProjectRole, number>>(
		() => new Map(projectRoleOrder.value.map((role, idx) => [role, idx])),
	);

	Object.values(ALL_ROLES).forEach((entries) => {
		entries.forEach((entry) => {
			const { role } = entry;
			if (role in settingsStore.licensedRoles) {
				// @ts-expect-error blah
				entry.licensed = settingsStore.licensedRoles[role];
			}
		});
	});

	const roles = ref<AllRolesMap>(ALL_ROLES);

	const processedProjectRoles = computed<AllRolesMap['project']>(() =>
		roles.value.project
			.filter((role) => projectRoleOrderMap.value.has(role.role))
			.sort(
				(a, b) =>
					(projectRoleOrderMap.value.get(a.role) ?? 0) -
					(projectRoleOrderMap.value.get(b.role) ?? 0),
			),
	);

	const processedCredentialRoles = computed<AllRolesMap['credential']>(() =>
		roles.value.credential.filter((role) => role.role !== 'credential:owner'),
	);

	const processedWorkflowRoles = computed<AllRolesMap['workflow']>(() =>
		roles.value.workflow.filter((role) => role.role !== 'workflow:owner'),
	);

	return {
		roles,
		processedProjectRoles,
		processedCredentialRoles,
		processedWorkflowRoles,
	};
});
