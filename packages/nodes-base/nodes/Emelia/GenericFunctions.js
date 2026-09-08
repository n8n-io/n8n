import { NodeApiError } from 'n8n-workflow';
/**
 * Make an authenticated REST API request to Emelia, used for trigger node.
 */
export async function emeliaApiRequest(method, endpoint, body = {}, qs = {}) {
    const { apiKey } = await this.getCredentials('emeliaApi');
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
        return await this.helpers.request.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an authenticated GraphQL request to Emelia.
 */
export async function emeliaGraphqlRequest(body = {}) {
    const response = await emeliaApiRequest.call(this, 'POST', '/graphql', body);
    if (response.errors) {
        throw new NodeApiError(this.getNode(), response);
    }
    return response;
}
/**
 * Load resources so that the user can select them easily.
 */
export async function loadResource(resource) {
    const mapping = {
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
    return responseData.data[mapping[resource].key].map((campaign) => ({
        name: campaign.name,
        value: campaign._id,
    }));
}
export async function emeliaApiTest(credential) {
    const credentials = credential.data;
    const body = {
        query: `
				query all_campaigns {
					all_campaigns {
						_id
						name
						status
						createdAt
						stats {
							mailsSent
						}
					}
				}`,
        operationName: 'all_campaigns',
    };
    const options = {
        headers: {
            Authorization: credentials?.apiKey,
        },
        method: 'POST',
        body,
        uri: 'https://graphql.emelia.io/graphql',
        json: true,
    };
    try {
        await this.helpers.request(options);
    }
    catch (error) {
        return {
            status: 'Error',
            message: `Connection details not valid: ${error.message}`,
        };
    }
    return {
        status: 'OK',
        message: 'Authentication successful!',
    };
}
//# sourceMappingURL=GenericFunctions.js.map