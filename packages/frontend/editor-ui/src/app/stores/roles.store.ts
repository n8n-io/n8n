import {
	type AllRolesMap,
	type Role,
	GLOBAL_OWNER_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_CHAT_USER_ROLE_SLUG,
} from '@n8n/permissions';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as rolesApi from '@n8n/rest-api-client/api/roles';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	CreateRoleDto,
	RoleAssignmentsResponse,
	RoleMembersResponse,
	RoleProjectMembersResponse,
	UpdateRoleDto,
} from '@n8n/api-types';
import { useSettingsStore } from './settings.store';

function sortByOrderThenName(orderMap: Map<string, number>) {
	return (a: { slug: string; displayName: string }, b: { slug: string; displayName: string }) => {
		const orderA = orderMap.get(a.slug);
		const orderB = orderMap.get(b.slug);
		// Roles with an explicit order come first; the rest sort alphabetically by name.
		if (orderA !== undefined || orderB !== undefined) {
			return (orderA ?? Number.MAX_SAFE_INTEGER) - (orderB ?? Number.MAX_SAFE_INTEGER);
		}
		return a.displayName.localeCompare(b.displayName);
	};
}

export const useRolesStore = defineStore('roles', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const roles = ref<AllRolesMap>({
		global: [],
		project: [],
		credential: [],
		workflow: [],
		secretsProviderConnection: [],
	});
	const projectRoleOrder = ref<string[]>([
		'project:viewer',
		'project:chatUser',
		'project:editor',
		'project:admin',
	]);
	const projectRoleOrderMap = computed<Map<string, number>>(
		() => new Map(projectRoleOrder.value.map((role, idx) => [role, idx])),
	);

	const globalRoleOrder = ref<string[]>(['global:admin', 'global:member']);
	const globalRoleOrderMap = computed<Map<string, number>>(
		() => new Map(globalRoleOrder.value.map((role, idx) => [role, idx])),
	);

	const processedInstanceRoles = computed<AllRolesMap['global']>(() =>
		roles.value.global
			.filter((role) => role.slug !== GLOBAL_OWNER_ROLE_SLUG)
			.sort(sortByOrderThenName(globalRoleOrderMap.value)),
	);

	const processedProjectRoles = computed<AllRolesMap['project']>(() =>
		roles.value.project
			.filter((role) => role.slug !== PROJECT_OWNER_ROLE_SLUG)
			.filter(
				(role) => settingsStore.isChatFeatureEnabled || role.slug !== PROJECT_CHAT_USER_ROLE_SLUG,
			)
			.sort(sortByOrderThenName(projectRoleOrderMap.value)),
	);

	const processedCredentialRoles = computed<AllRolesMap['credential']>(() =>
		roles.value.credential.filter((role) => role.slug !== 'credential:owner'),
	);

	const processedWorkflowRoles = computed<AllRolesMap['workflow']>(() =>
		roles.value.workflow.filter((role) => role.slug !== 'workflow:owner'),
	);

	const fetchRoles = async () => {
		roles.value = await rolesApi.getRoles(rootStore.restApiContext);
	};

	const createRole = async (body: CreateRoleDto): Promise<Role> => {
		return await rolesApi.createRole(rootStore.restApiContext, body);
	};

	const fetchRoleBySlug = async (payload: { slug: string }): Promise<Role> => {
		return await rolesApi.getRoleBySlug(rootStore.restApiContext, payload);
	};

	const deleteRole = async (slug: string): Promise<Role> => {
		return await rolesApi.deleteRole(rootStore.restApiContext, slug);
	};

	const updateRole = async (slug: string, body: UpdateRoleDto): Promise<Role> => {
		return await rolesApi.updateRole(rootStore.restApiContext, slug, body);
	};

	const fetchRoleAssignments = async (slug: string): Promise<RoleAssignmentsResponse> => {
		return await rolesApi.getRoleAssignments(rootStore.restApiContext, slug);
	};

	const fetchRoleProjectMembers = async (
		slug: string,
		projectId: string,
	): Promise<RoleProjectMembersResponse> => {
		return await rolesApi.getRoleProjectMembers(rootStore.restApiContext, slug, projectId);
	};

	const fetchRoleMembers = async (slug: string): Promise<RoleMembersResponse> => {
		return await rolesApi.getRoleMembers(rootStore.restApiContext, slug);
	};

	return {
		roles,
		processedProjectRoles,
		processedInstanceRoles,
		processedCredentialRoles,
		processedWorkflowRoles,
		fetchRoles,
		createRole,
		fetchRoleBySlug,
		updateRole,
		deleteRole,
		fetchRoleAssignments,
		fetchRoleProjectMembers,
		fetchRoleMembers,
	};
});
