import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

export const node = defineNode({
	id: 'inventory',
	displayName: 'Inventory',
	credential: credential({
		types: [
			defineCredential({
				id: 'inventory.apiKey',
				legacyName: 'inventoryApi',
				displayName: 'Inventory API',
				fields: { apiKey: field.secret('API Key') },
				auth: (a) => a.header('Authorization', 'ApiKey {apiKey}'),
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/inventory/v1',
});

export const items = node.resource('item');
