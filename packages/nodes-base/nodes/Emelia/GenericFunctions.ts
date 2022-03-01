import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IHookFunctions,
	INodePropertyOptions,
	NodeApiError,
} from 'n8n-workflow';

/**
 * Make an authenticated GraphQL request to Emelia.
 */
export async function emeliaGraphqlRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	body: object = {},
) {
	const response = await emeliaApiRequest.call(this, 'POST', '/graphql', body);

	if (response.errors) {
		throw new NodeApiError(this.getNode(), response);
	}

	return response;
}

/**
 * Make an authenticated REST API request to Emelia, used for trigger node.
 */
export async function emeliaApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	endpoint: string,
	body: object = {},
	qs: object = {},
) {
	const { apiKey } = await this.getCredentials('emeliaApi') as { apiKey: string };

	const options = {
		headers: {
			Authorization: apiKey,
		},
		method,
		body,
		qs,
		uri: `https://graphql.emelia.io${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Load resources so that the user can select them easily.
 */
export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: 'campaign' | 'contactList',
): Promise<INodePropertyOptions[]> {
	const mapping: { [key in 'campaign' | 'contactList']: { query: string, key: string } } = {
		campaign: {
			query: `
				query GetCampaigns {
					campaigns {
						_id
						name
					}
				}`,
			key: 'campaigns',
		},
		contactList: {
			query: `
			query GetContactLists {
				contact_lists {
					_id
					name
				}
			}`,
			key: 'contact_lists',
		},
	};

	const responseData = await emeliaGraphqlRequest.call(this, { query: mapping[resource].query });

	return responseData.data[mapping[resource].key].map((campaign: { name: string, _id: string }) => ({
		name: campaign.name,
		value: campaign._id,
	}));

}
