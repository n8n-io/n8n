import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type {
	Project,
	ProjectCreateRequest,
	ProjectListItem,
	ProjectUpdateRequest,
	ProjectsCount,
} from '@/types/projects.types';

export const getAllProjects = async (context: IRestApiContext): Promise<ProjectListItem[]> => {
	return await makeRestApiRequest(context, 'GET', '/projects');
};

export const getMyProjects = async (context: IRestApiContext): Promise<ProjectListItem[]> => {
	return await makeRestApiRequest(context, 'GET', '/projects/my-projects', {
		includeScopes: true,
	});
};

export const getPersonalProject = async (context: IRestApiContext): Promise<Project> => {
	return await makeRestApiRequest(context, 'GET', '/projects/personal');
};

export const getProject = async (context: IRestApiContext, id: string): Promise<Project> => {
	return await makeRestApiRequest(context, 'GET', `/projects/${id}`);
};

export const createProject = async (
	context: IRestApiContext,
	req: ProjectCreateRequest,
): Promise<Project> => {
	return await makeRestApiRequest(context, 'POST', '/projects', req);
};

export const updateProject = async (
	context: IRestApiContext,
	req: ProjectUpdateRequest,
): Promise<void> => {
	const { id, name, relations } = req;
	await makeRestApiRequest(context, 'PATCH', `/projects/${id}`, { name, relations });
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
