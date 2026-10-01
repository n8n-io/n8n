import { defineCredential } from '@n8n/node-sdk';

import { createItem } from './actions/item.create';

export { node } from './inventory.node';

export const credentials = [
	defineCredential({
		name: 'inventoryApi',
		displayName: 'Inventory API',
		properties: [
			{ name: 'apiKey', displayName: 'API Key', type: 'string', typeOptions: { password: true } },
		],
		authenticate: { headers: { Authorization: '=ApiKey {{$credentials.apiKey}}' } },
	}),
];

export const actions = [createItem];
