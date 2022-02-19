import { IN8nCollectionResponse, IN8nTemplateResponse, ITemplateCategory, IN8nCollection, ITemplatesQuery, ITemplatesSearchQuery, IN8nTemplate } from '@/Interface';
import { post, graphql } from './helpers';

export async function getCategories(apiEndpoint: string): Promise<{data: {categories: ITemplateCategory[]}}> {
	const query = `query {
		categories: getTemplateCategories {
			id
			name
		}
	}`;
	return await post(apiEndpoint, `/graphql`, { query });
}

export async function getCollections(apiEndpoint: string, query: ITemplatesQuery): Promise<{data: {collections: IN8nCollection[]}}> {
	const gqlQuery = `query search($limit: Int,
		$skip: Int,
		$category: [Int],
		$search: String){
		collections: searchCollections(rows: $limit,
			skip: $skip,
			search: $search,
			category: $category) {
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
					name
				}
			}
			workflows{
				id
			}
			totalViews: views
		}
	}`;
	return await graphql(apiEndpoint, gqlQuery, {search: query.search, category: query.categories && query.categories.length ? query.categories : null});
}

export async function getWorkflows(
	apiEndpoint: string,
	query: ITemplatesSearchQuery,
): Promise<{data: {totalWorkflows: number, workflows: IN8nTemplate[]}}> {
	const gqlQuery = `query search($limit: Int,
		$skip: Int,
		$category: [Int],
		$search: String){
		totalWorkflows: getWorkflowCount(search: $search, category: $category)
		workflows: searchWorkflows(rows: $limit,
			skip: $skip,
			search: $search,
			category: $category){
			id
			name
			description
			nodes{
				defaults
				name
				displayName
				icon
				iconData
				typeVersion: version,
				categories{
					name
				}
			}
			totalViews: views
			user{
				username
			}
			created_at
		}
	}`;
	return await graphql(apiEndpoint, gqlQuery, {search: query.search, category: query.categories && query.categories.length? query.categories.map((id: string) => parseInt(id)) : null, limit: query.limit, skip: query.skip});
}

export async function getCollectionById(apiEndpoint: string, collectionId: string): Promise<{data: {collection: IN8nCollection}}> {
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

export async function getTemplateById(apiEndpoint: string, templateId: string): Promise<{data: {workflow: IN8nTemplate}}> {
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
			workflowInfo
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
