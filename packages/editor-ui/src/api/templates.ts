import { ISearchPayload } from '@/Interface';
import { post } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

const stagingHost = 'https://api-staging.n8n.io';

export async function getTemplates(
	limit: number,
	skip: number,
	category: number[] | null,
	search: string,
	allData = true,
	searchQuery = false,
): Promise<ISearchPayload> {
	const queryCategory = category && category.length ? `${ '[' + category + ']'}` : null;
	const query = `query {
		categories: getTemplateCategories @include(if: ${allData}) @skip(if: ${searchQuery}){
			id
			name
		}
		collections: searchCollection(rows: ${limit},
			skip: ${skip},
			# search parameter in string,default: null
			search: "${search}",
			# array of category id eg: [1,2] ,default: null
			category: ${queryCategory}) @include(if: ${allData}){
			id
			name
			nodes{
				defaults
				name
				displayName
				icon
				iconData
				typeVersion: version
			}
			workflows
			totalViews: views
		}
		totalworkflow: getWorkflowCount(search: "${search}", category: ${queryCategory})
		workflows: searchWorkflow(rows: ${limit},
			skip: ${skip},
			# search parameter in string,default: null
			search: "${search}",
			# array of category id eg: [1,2] ,default: null
			category: ${queryCategory}){
			id
			name
			description
			nodes{
				defaults
				name
				displayName
				icon
				iconData
				typeVersion: version
			}
			totalViews: views
			user{
				username
			}
			created_at
		}
	}`;
	console.log(query);
	return await post(stagingHost, `/graphql`, { query });
}
