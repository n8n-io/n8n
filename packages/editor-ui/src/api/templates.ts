import { ITemplatesCategory, ITemplatesCollection, ITemplatesQuery, ITemplatesWorkflow, ITemplatesCollectionResponse, ITemplatesWorkflowResponse } from '@/Interface';
import { graphql, get } from './helpers';

export function testHealthEndpoint(apiEndpoint: string) {
	console.log('sup', apiEndpoint);
	return get(apiEndpoint, '/health');
}

export function getCategories(apiEndpoint: string): Promise<{categories: ITemplatesCategory[]}> {
	return get(apiEndpoint, '/templates/categories');
}

export async function getCollections(apiEndpoint: string, query: ITemplatesQuery): Promise<{collections: ITemplatesCollection[]}> {
	return await get(apiEndpoint, '/templates/collections', query);
}

export async function getWorkflows(
	apiEndpoint: string,
	query: {skip: number, limit: number, categories: number[], search: string},
): Promise<{totalWorkflows: number, workflows: ITemplatesWorkflow[]}> {
	return get(apiEndpoint, '/templates/workflows', {skip: query.skip, rows: query.limit, category: query.categories, search: query.search});
}

export async function getCollectionById(apiEndpoint: string, collectionId: string): Promise<{data: {collection: ITemplatesCollectionResponse}}> {
	const query = `query getCollection($id: ID!){
		collection(id:$id){
			id
			name
			description
			image{
				id
				url
			}
			nodes{
				defaults
				name
				displayName
				icon
				iconData
				typeVersion: version
			}
			workflows(sort:"recentViews:desc,views:desc,name:asc"){
				id
				name
				nodes{
					defaults
					name
					displayName
					icon
					iconData
					typeVersion: version
					categories{
						id
						name
					}
				}
				categories{
					id
					name
				}
				user{
					username
				}
				totalViews: views
				created_at
			}
			totalViews: views
			categories{
				id
				name
			}
			created_at
		}
	}`;

	return await graphql(apiEndpoint, query, {id: collectionId});
}

export async function getTemplateById(apiEndpoint: string, templateId: string): Promise<{data: {workflow: ITemplatesWorkflowResponse}}> {
	const query = `query getWorkflow($id: ID!) {
		workflow(id: $id) {
			id
			name
			description
			image{
				id
				url
			}
			workflow
			nodes{
				defaults
				name
				displayName
				icon
				iconData
				typeVersion: version
				categories{
					id
					name
				}
			}
			totalViews: views
			categories{
				id
				name
			}
			user{
				username
			}
			created_at
		}
	}`;

	return await graphql(apiEndpoint, query, {id: templateId});
}
