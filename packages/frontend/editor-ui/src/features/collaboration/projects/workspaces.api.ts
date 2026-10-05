/** PROTOTYPE (workspaces) */
import type {
	CreateProjectDto,
	CreateWorkspaceDto,
	UpdateWorkspaceAccessDto,
	WorkspaceListItem,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { ProjectListItem } from './projects.types';

export const getWorkspaces = async (context: IRestApiContext): Promise<WorkspaceListItem[]> => {
	return await makeRestApiRequest(context, 'GET', '/workspaces');
};

export const createWorkspace = async (
	context: IRestApiContext,
	payload: CreateWorkspaceDto,
): Promise<ProjectListItem> => {
	return await makeRestApiRequest(context, 'POST', '/workspaces', payload);
};

export const joinWorkspace = async (context: IRestApiContext, workspaceId: string) => {
	await makeRestApiRequest(context, 'POST', `/workspaces/${workspaceId}/join`);
};

export const leaveWorkspace = async (context: IRestApiContext, workspaceId: string) => {
	await makeRestApiRequest(context, 'POST', `/workspaces/${workspaceId}/leave`);
};

export const createProjectInWorkspace = async (
	context: IRestApiContext,
	workspaceId: string,
	payload: CreateProjectDto,
): Promise<ProjectListItem> => {
	return await makeRestApiRequest(context, 'POST', `/workspaces/${workspaceId}/projects`, payload);
};

export const updateWorkspaceAccess = async (
	context: IRestApiContext,
	workspaceId: string,
	payload: UpdateWorkspaceAccessDto,
) => {
	await makeRestApiRequest(context, 'PATCH', `/workspaces/${workspaceId}/access`, payload);
};
