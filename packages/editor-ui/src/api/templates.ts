import type { RawAxiosRequestHeaders } from 'axios';
import type {
	ITemplatesCategory,
	ITemplatesCollection,
	ITemplatesQuery,
	ITemplatesWorkflow,
	ITemplatesCollectionResponse,
	ITemplatesWorkflowResponse,
	IWorkflowTemplate,
	TemplateSearchFacet,
} from '@/Interface';
import { get } from '@/utils/apiUtils';

function stringifyArray(arr: number[]) {
	return arr.join(',');
}

export async function testHealthEndpoint(apiEndpoint: string) {
	return await get(apiEndpoint, '/health');
}

export async function getCategories(
	apiEndpoint: string,
	headers?: RawAxiosRequestHeaders,
): Promise<{ categories: ITemplatesCategory[] }> {
	return await get(apiEndpoint, '/templates/categories', undefined, headers);
}

export async function getCollections(
	apiEndpoint: string,
	query: ITemplatesQuery,
	headers?: RawAxiosRequestHeaders,
): Promise<{ collections: ITemplatesCollection[] }> {
	return await get(
		apiEndpoint,
		'/templates/collections',
		{ category: query.categories, search: query.search },
		headers,
	);
}

export async function getWorkflows(
	apiEndpoint: string,
	query: { page: number; limit: number; categories: number[]; search: string },
	headers?: RawAxiosRequestHeaders,
): Promise<{
	totalWorkflows: number;
	workflows: ITemplatesWorkflow[];
	filters: TemplateSearchFacet[];
}> {
	return await get(
		apiEndpoint,
		'/templates/search',
		{
			page: query.page,
			rows: query.limit,
			category: stringifyArray(query.categories),
			search: query.search,
		},
		headers,
	);
}

export async function getCollectionById(
	apiEndpoint: string,
	collectionId: string,
	headers?: RawAxiosRequestHeaders,
): Promise<{ collection: ITemplatesCollectionResponse }> {
	return await get(apiEndpoint, `/templates/collections/${collectionId}`, undefined, headers);
}

export async function getTemplateById(
	apiEndpoint: string,
	templateId: string,
	headers?: RawAxiosRequestHeaders,
): Promise<{ workflow: ITemplatesWorkflowResponse }> {
	return await get(apiEndpoint, `/templates/workflows/${templateId}`, undefined, headers);
}

export async function getWorkflowTemplate(
	apiEndpoint: string,
	templateId: string,
	headers?: RawAxiosRequestHeaders,
): Promise<IWorkflowTemplate> {
	return await get(apiEndpoint, `/workflows/templates/${templateId}`, undefined, headers);
}
