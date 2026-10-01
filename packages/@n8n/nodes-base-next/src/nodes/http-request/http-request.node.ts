import { compat, credential, defineNode } from '@n8n/node-sdk';

export const httpRequest = defineNode({
	id: 'httpRequest',
	displayName: 'HTTP Request',
	credential: credential({
		types: ['httpHeaderAuth', 'httpBearerAuth', 'httpBasicAuth', 'httpQueryAuth', 'oAuth2Api'].map(
			(name) => compat(name),
		),
		optional: true,
	}),
});
