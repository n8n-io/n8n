import { custom, oauth2, str } from '@n8n/node-sdk';

/**
 * The legacy `notionApi`, as a value. `custom` because the credential sets `Notion-Version` only
 * when the request has none, which a generic header template cannot express.
 */
export const notionApi = custom({
	name: 'notionApi',
	displayName: 'Notion API',
	documentationUrl: 'notion',
	secrets: { apiKey: str().with({ title: 'Internal Integration Secret' }) },
	async authenticate({ apiKey }, request) {
		const headers = { ...request.headers };
		return await Promise.resolve({
			...request,
			headers: {
				...headers,
				// The legacy credential sends a trailing space. Keep the header byte for byte.
				Authorization: `Bearer ${apiKey} `,
				'Notion-Version': headers['Notion-Version'] ?? '2022-02-22',
			},
		});
	},
	test: { request: { baseURL: 'https://api.notion.com/v1', url: '/users/me' } },
});

/** The legacy `notionOAuth2Api`: config only. n8n core runs the OAuth2 flow. */
export const notionOAuth2Api = oauth2({
	name: 'notionOAuth2Api',
	displayName: 'Notion OAuth2 API',
	documentationUrl: 'notion',
	authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
	tokenUrl: 'https://api.notion.com/v1/oauth/token',
	clientAuth: 'header',
});
