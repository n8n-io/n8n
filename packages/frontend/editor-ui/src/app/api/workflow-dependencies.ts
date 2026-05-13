import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	DependenciesBatchResponse,
	DependencyCountsBatchResponse,
	DependencyResourceType,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function getResourceDependencyCounts(
	context: IRestApiContext,
	resourceIds: string[],
	resourceType: DependencyResourceType,
) {
	return await makeRestApiRequest<DependencyCountsBatchResponse>(
		context,
		'POST',
		'/workflow-dependencies/counts',
		{ resourceIds, resourceType },
	);
}

export async function getResourceDependencies(
	context: IRestApiContext,
	resourceIds: string[],
	resourceType: DependencyResourceType,
) {
	return await makeRestApiRequest<DependenciesBatchResponse>(
		context,
		'POST',
		'/workflow-dependencies/details',
		{ resourceIds, resourceType },
	);
}

export interface GraphNode {
	id: string;
	label: string;
	type: 'workflow' | 'credential' | 'dataTable';
	projectId?: string;
	projectName?: string;
	restricted?: boolean;
}

export interface GraphLink {
	source: string;
	target: string;
	label: string;
}

export interface DependencyGraph {
	nodes: GraphNode[];
	links: GraphLink[];
}

export async function getDependencyGraph(context: IRestApiContext): Promise<DependencyGraph> {
	return await makeRestApiRequest<DependencyGraph>(context, 'GET', '/workflow-dependencies/graph');
}
