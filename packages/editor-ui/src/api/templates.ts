import {
	ITemplatesCategory,
	ITemplatesCollection,
	ITemplatesCollectionResponse,
	ITemplatesQuery,
	ITemplatesWorkflow,
	ITemplatesWorkflowResponse,
} from '@/Interface';
import { get } from './helpers';

function stringifyArray(arr: number[]) {
	return arr.join(',');
}

export function testHealthEndpoint(apiEndpoint: string) {
	return get(apiEndpoint, '/health');
}

export function getCategories(apiEndpoint: string): Promise<{categories: ITemplatesCategory[]}> {
	return get(apiEndpoint, '/templates/categories');
}

export async function getCollections(apiEndpoint: string, query: ITemplatesQuery): Promise<{collections: ITemplatesCollection[]}> {
	return await get(apiEndpoint, '/templates/collections', {category: stringifyArray(query.categories || []), search: query.search});
}

export async function getCollectionById(apiEndpoint: string, collectionId: string): Promise<{collection: ITemplatesCollectionResponse}> {
	return await get(apiEndpoint, `/templates/collections/${collectionId}`);
}

export async function getTemplateById(apiEndpoint: string, templateId: string): Promise<{workflow: ITemplatesWorkflowResponse}> {
	return await get(apiEndpoint, `/templates/workflows/${templateId}`);
}

export async function getWorkflows(
	apiEndpoint: string,
	query: {skip: number, limit: number, categories: number[], search: string},
): Promise<{totalWorkflows: number, workflows: ITemplatesWorkflow[]}> {
	return get(apiEndpoint, '/templates/workflows', {skip: query.skip, rows: query.limit, category: stringifyArray(query.categories), search: query.search});
}
