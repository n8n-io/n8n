import { ITemplatesCategory, ITemplatesCollection, ITemplatesQuery, ITemplatesWorkflow, ITemplatesCollectionResponse, ITemplatesWorkflowResponse } from '@/Interface';
import { get } from './helpers';

import {
	IDataObject,
} from 'n8n-workflow';

export function testHealthEndpoint(apiEndpoint: string) {
	return get(apiEndpoint, '/health');
}

export function getCategories(apiEndpoint: string): Promise<{categories: ITemplatesCategory[]}> {
	return get(apiEndpoint, '/templates/categories');
}

export async function getCollections(apiEndpoint: string, query: ITemplatesQuery): Promise<{collections: ITemplatesCollection[]}> {
	return await get(apiEndpoint, '/templates/collections', query as unknown as IDataObject);
}

export async function getWorkflows(
	apiEndpoint: string,
	query: {skip: number, limit: number, categories: number[], search: string},
): Promise<{totalWorkflows: number, workflows: ITemplatesWorkflow[]}> {
	return get(apiEndpoint, '/templates/workflows', {skip: query.skip, rows: query.limit, category: query.categories, search: query.search});
}

export async function getCollectionById(apiEndpoint: string, collectionId: string): Promise<{collection: ITemplatesCollectionResponse}> {
	return await get(apiEndpoint, `/templates/collections/${collectionId}`);
}

export async function getTemplateById(apiEndpoint: string, templateId: string): Promise<{workflow: ITemplatesWorkflowResponse}> {
	return await get(apiEndpoint, `/templates/workflows/${templateId}`);
}
