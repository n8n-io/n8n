import { defineNode } from '@n8n/node-sdk';
import { compat, credential } from '@n8n/node-sdk/credentials';

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
