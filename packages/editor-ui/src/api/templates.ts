import type {
	ITemplatesCategory,
	ITemplatesCollection,
	ITemplatesQuery,
	ITemplatesWorkflow,
	ITemplatesCollectionResponse,
	ITemplatesWorkflowResponse,
	IWorkflowTemplate,
} from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { get } from '@/utils/apiUtils';

function stringifyArray(arr: number[]) {
	return arr.join(',');
}

export async function testHealthEndpoint(apiEndpoint: string) {
	return get(apiEndpoint, '/health');
}

export async function getCategories(
	apiEndpoint: string,
	headers?: IDataObject,
): Promise<{ categories: ITemplatesCategory[] }> {
	return get(apiEndpoint, '/templates/categories', undefined, headers);
}

export async function getCollections(
	apiEndpoint: string,
	query: ITemplatesQuery,
	headers?: IDataObject,
): Promise<{ collections: ITemplatesCollection[] }> {
	return get(
		apiEndpoint,
		'/templates/collections',
		{ category: stringifyArray(query.categories || []), search: query.search },
		headers,
	);
}

export async function getWorkflows(
	apiEndpoint: string,
	query: { skip: number; limit: number; categories: number[]; search: string },
	headers?: IDataObject,
): Promise<{ totalWorkflows: number; workflows: ITemplatesWorkflow[] }> {
	return get(
		apiEndpoint,
		'/templates/workflows',
		{
			skip: query.skip,
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
	headers?: IDataObject,
): Promise<{ collection: ITemplatesCollectionResponse }> {
	return get(apiEndpoint, `/templates/collections/${collectionId}`, undefined, headers);
}

export async function getTemplateById(
	apiEndpoint: string,
	templateId: string,
	headers?: IDataObject,
): Promise<{ workflow: ITemplatesWorkflowResponse }> {
	return get(apiEndpoint, `/templates/workflows/${templateId}`, undefined, headers);
}

export async function getWorkflowTemplate(
	apiEndpoint: string,
	templateId: string,
	headers?: IDataObject,
): Promise<IWorkflowTemplate> {
	return get(apiEndpoint, `/workflows/templates/${templateId}`, undefined, headers);
}
