import { IN8nTemplateResponse } from '@/Interface';
import { post } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

export async function getTemplateById(templateId: string): Promise<IN8nTemplateResponse> {
	const query = `query {
		workflow(id:"${templateId}"){
			id
			name
			description
			image{
				id
				url
			}
			mainImage{
				url
				 metadata: provider_metadata
			}
			nodes{
				defaults
				name
				displayName
				icon
				iconData
				typeVersion: version
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

	return await post(TEMPLATES_BASE_URL, `/graphql`, { query });
}
