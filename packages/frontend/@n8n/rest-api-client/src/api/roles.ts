import type {
	CreateRoleDto,
	RoleAssignmentsResponse,
	RoleProjectMembersResponse,
	UpdateRoleDto,
} from '@n8n/api-types';
import type { AllRolesMap, Role } from '@n8n/permissions';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getRoles = async (context: IRestApiContext): Promise<AllRolesMap> => {
	return await makeRestApiRequest(context, 'GET', '/roles?withUsageCount=true');
};

export const createProjectRole = async (
	context: IRestApiContext,
	body: CreateRoleDto,
): Promise<Role> => {
	return await makeRestApiRequest(context, 'POST', '/roles', body);
};

export const getRoleBySlug = async (
	context: IRestApiContext,
	body: { slug: string },
): Promise<Role> => {
	return await makeRestApiRequest(context, 'GET', `/roles/${body.slug}?withUsageCount=true`);
};

export const updateProjectRole = async (
	context: IRestApiContext,
	slug: string,
	body: UpdateRoleDto,
): Promise<Role> => {
	return await makeRestApiRequest(context, 'PATCH', `/roles/${slug}`, body);
};

export const deleteProjectRole = async (context: IRestApiContext, slug: string): Promise<Role> => {
	return await makeRestApiRequest(context, 'DELETE', `/roles/${slug}`);
};

export const getRoleAssignments = async (
	context: IRestApiContext,
	slug: string,
): Promise<RoleAssignmentsResponse> => {
	return await makeRestApiRequest(context, 'GET', `/roles/${slug}/assignments`);
};

export const getRoleProjectMembers = async (
	context: IRestApiContext,
	slug: string,
	projectId: string,
): Promise<RoleProjectMembersResponse> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/roles/${slug}/assignments/${projectId}/members`,
	);
};
