import type { IRestApiContext } from '@/Interface';
import { get, post, patch, makeRestApiRequest } from '@/utils/apiUtils';
import type {
	Project,
	ProjectCreateRequest,
	ProjectListItem,
	ProjectUpdateRequest,
} from '@/features/projects/projects.types';

export const getAllProjects = async (context: IRestApiContext): Promise<ProjectListItem[]> => {
	const { data } = await get(context.baseUrl, '/projects');
	return data;
};

export const getMyProjects = async (context: IRestApiContext): Promise<ProjectListItem[]> => {
	const { data } = await get(context.baseUrl, '/projects/my-projects', {
		includeScopes: true,
	});
	return data;
};

export const getPersonalProject = async (context: IRestApiContext): Promise<Project> => {
	const { data } = await get(context.baseUrl, '/projects/personal');
	return data;
};

export const getProject = async (context: IRestApiContext, id: string): Promise<Project> => {
	const { data } = await get(context.baseUrl, `/projects/${id}`);
	return data;
};

export const createProject = async (
	context: IRestApiContext,
	req: ProjectCreateRequest,
): Promise<Project> => {
	const { data } = await post(context.baseUrl, '/projects', req);
	return data;
};

export const updateProject = async (
	context: IRestApiContext,
	req: ProjectUpdateRequest,
): Promise<void> => {
	const { id, name, relations } = req;
	await patch(context.baseUrl, `/projects/${id}`, { name, relations });
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
