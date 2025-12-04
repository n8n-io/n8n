import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { Project, ProjectListItem, ProjectsCount } from './projects.types';
import type { CreateProjectDto, UpdateProjectDto } from '@n8n/api-types';
import type { AssignableProjectRole } from '@n8n/permissions';

export const getAllProjects = async (context: IRestApiContext): Promise<ProjectListItem[]> => {
	return await makeRestApiRequest(context, 'GET', '/projects');
};

export const getMyProjects = async (context: IRestApiContext): Promise<ProjectListItem[]> => {
	return await makeRestApiRequest(context, 'GET', '/projects/my-projects');
};

export const getPersonalProject = async (context: IRestApiContext): Promise<Project> => {
	return await makeRestApiRequest(context, 'GET', '/projects/personal');
};

export const getProject = async (context: IRestApiContext, id: string): Promise<Project> => {
	return await makeRestApiRequest(context, 'GET', `/projects/${id}`);
};

export const createProject = async (
	context: IRestApiContext,
	payload: CreateProjectDto,
): Promise<Project> => {
	return await makeRestApiRequest(context, 'POST', '/projects', payload);
};

export const updateProject = async (
	context: IRestApiContext,
	id: Project['id'],
	payload: UpdateProjectDto,
): Promise<void> => {
	await makeRestApiRequest(context, 'PATCH', `/projects/${id}`, payload);
};

export const deleteProject = async (
	context: IRestApiContext,
	projectId: string,
	transferId?: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}`,
		transferId ? { transferId } : {},
	);
};

export const getProjectsCount = async (context: IRestApiContext): Promise<ProjectsCount> => {
	return await makeRestApiRequest(context, 'GET', '/projects/count');
};

export const addProjectMembers = async (
	context: IRestApiContext,
	projectId: string,
	relations: Array<{ userId: string; role: AssignableProjectRole }>,
): Promise<void> => {
	await makeRestApiRequest(context, 'POST', `/projects/${projectId}/users`, { relations });
};

export const updateProjectMemberRole = async (
	context: IRestApiContext,
	projectId: string,
	userId: string,
	role: AssignableProjectRole,
): Promise<void> => {
	await makeRestApiRequest(context, 'PATCH', `/projects/${projectId}/users/${userId}`, { role });
};

export const deleteProjectMember = async (
	context: IRestApiContext,
	projectId: string,
	userId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/users/${userId}`);
};
