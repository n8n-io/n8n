import type { ProjectDependencyGraph } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface GetProjectDependencyGraphParams {
	folderId?: string;
	explode?: boolean;
	draft?: boolean;
	relationshipTypes?: string;
}

export async function getProjectDependencyGraph(
	context: IRestApiContext,
	projectId: string,
	params?: GetProjectDependencyGraphParams,
): Promise<ProjectDependencyGraph> {
	const query = new URLSearchParams();
	if (params?.folderId) query.set('folderId', params.folderId);
	if (params?.explode) query.set('explode', 'true');
	if (params?.draft) query.set('draft', 'true');
	if (params?.relationshipTypes) query.set('relationshipTypes', params.relationshipTypes);

	const queryString = query.toString();
	const endpoint = `/projects/${projectId}/dependency-graph${queryString ? `?${queryString}` : ''}`;

	return await makeRestApiRequest<ProjectDependencyGraph>(context, 'GET', endpoint);
}
