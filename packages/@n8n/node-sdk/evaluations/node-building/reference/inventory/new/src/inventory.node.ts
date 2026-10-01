import { apiKey, credential, defineNode } from '@n8n/node-sdk';

export const node = defineNode({
	id: 'inventory',
	displayName: 'Inventory',
	credential: credential({
		types: [
			apiKey({
				name: 'inventoryApi',
				displayName: 'Inventory API',
				key: 'Authorization',
				prefix: 'ApiKey ',
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/inventory/v1',
});

export const items = node.resource('item');
