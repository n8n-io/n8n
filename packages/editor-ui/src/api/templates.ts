import { ISearchPayload } from '@/Interface';
import { post } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

const stagingHost = 'https://api-staging.n8n.io';

export async function getTemplates(
	limit: number,
	skip: number,
	category: number[] | null,
	search: string | null,
	allData = true,
	searchQuery = false,
): Promise<ISearchPayload> {
	const query = `query {
		categories(sort:"name") @include(if: ${allData}) @skip(if: ${searchQuery}){
			id
			name
		}
		collections: getFilteredCollection(
			rows: ${limit},
			skip: ${skip},
			search: "${search}"
			category: ${category ? "[" + category + "]" : null}) @include(if: ${allData}){
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
			workflows{
				id
			}
			totalViews: views
		}
		totalworkflow: getWorkflowCount(search: "${search}", category: ${category ? "[" + category + "]" : null})
		workflows(
			limit: ${limit},
			start: ${skip},
			where:{nodes:{name_contains:"${search}"},categories:{id: ${category ? "[" + category + "]" : undefined}}},
			sort:"views:DESC,created_at:DESC"){
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
