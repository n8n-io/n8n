import { toResourcePath, type PageResourceType } from '@n8n/api-types';
import { getFullApiResponse, makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { ResourceDetails, ResourceFetchers, WorkflowOutline } from './resourceNameResolver';
import { getPageById } from '../page.api';

type Named = { id: string; name: string; updatedAt?: string };
type NamedCredential = Named & { homeProject?: { id: string } };

/** A resource that the user can link to: its name and its instance-relative editor path. */
export type ResourceSearchResult = {
	resourceType: Exclude<PageResourceType, 'node'>;
	id: string;
	name: string;
	path: string;
};

async function fetchWorkflow(context: IRestApiContext, workflowId: string) {
	return await makeRestApiRequest<WorkflowOutline>(context, 'GET', `/workflows/${workflowId}`);
}

function toDetails({ name, updatedAt }: Named): ResourceDetails {
	return { name, updatedAt };
}

async function fetchCredential(context: IRestApiContext, credentialId: string) {
	return toDetails(await makeRestApiRequest<Named>(context, 'GET', `/credentials/${credentialId}`));
}

/** Gives `undefined` when no data table that the user can read has this id. */
async function fetchDataTable(context: IRestApiContext, dataTableId: string) {
	const { data } = await makeRestApiRequest<{ data: Named[] }>(
		context,
		'GET',
		'/data-tables-global',
		{ filter: { id: dataTableId }, take: 1 },
	);
	const dataTable = data.at(0);
	return dataTable ? toDetails(dataTable) : undefined;
}

async function fetchPage(context: IRestApiContext, pageId: string): Promise<ResourceDetails> {
	const { title, updatedAt } = await getPageById(context, pageId);
	return { name: title, updatedAt };
}

/** The REST requests that read the current name and details of each resource type. */
export function createRestResourceFetchers(getContext: () => IRestApiContext): ResourceFetchers {
	return {
		workflow: async (id) => await fetchWorkflow(getContext(), id),
		credential: async (id) => await fetchCredential(getContext(), id),
		dataTable: async (id) => await fetchDataTable(getContext(), id),
		page: async (id) => await fetchPage(getContext(), id),
	};
}

/** An empty name gives the most recent resources. */
function toNameFilter(name: string): { filter?: { name: string } } {
	return name ? { filter: { name } } : {};
}

/** The workflow list matches names through `query`. It ignores a `name` filter. */
function toWorkflowNameFilter(name: string): { filter?: { query: string } } {
	return name ? { filter: { query: name } } : {};
}

/** Lists the workflows that the user can read and whose name contains `name`. */
export async function searchWorkflows(
	context: IRestApiContext,
	name: string,
	limit: number,
): Promise<ResourceSearchResult[]> {
	const { data } = await getFullApiResponse<Named[]>(context, 'GET', '/workflows', {
		...toWorkflowNameFilter(name),
		take: limit,
		skip: 0,
	});
	return data.map(({ id, name: workflowName }) => ({
		resourceType: 'workflow',
		id,
		name: workflowName,
		path: toResourcePath({ resourceType: 'workflow', resourceId: id }),
	}));
}

/** Lists the credentials that the user can read and whose name contains `name`. */
export async function searchCredentials(
	context: IRestApiContext,
	name: string,
	limit: number,
): Promise<ResourceSearchResult[]> {
	const credentials = await makeRestApiRequest<NamedCredential[]>(context, 'GET', '/credentials', {
		...toNameFilter(name),
		take: limit,
		skip: 0,
		includeGlobal: true,
	});
	return credentials.map(({ id, name: credentialName, homeProject }) => ({
		resourceType: 'credential',
		id,
		name: credentialName,
		path: toResourcePath({
			resourceType: 'credential',
			resourceId: id,
			projectId: homeProject?.id,
		}),
	}));
}

/** Lists the data tables of a project whose name contains `name`. */
export async function searchDataTables(
	context: IRestApiContext,
	projectId: string,
	name: string,
	limit: number,
): Promise<ResourceSearchResult[]> {
	const { data } = await makeRestApiRequest<{ data: Named[] }>(
		context,
		'GET',
		`/projects/${projectId}/data-tables`,
		{ ...toNameFilter(name), take: limit, skip: 0 },
	);
	return data.map(({ id, name: dataTableName }) => ({
		resourceType: 'dataTable',
		id,
		name: dataTableName,
		path: toResourcePath({ resourceType: 'dataTable', resourceId: id, projectId }),
	}));
}
