import { defineNode } from '@n8n/node-sdk';

export const httpRequest = defineNode({
	id: 'httpRequest',
	displayName: 'HTTP Request',
	credentials: ['httpHeaderAuth', 'httpBearerAuth', 'httpBasicAuth', 'httpQueryAuth', 'oAuth2Api'],
	authOptional: true,
});
