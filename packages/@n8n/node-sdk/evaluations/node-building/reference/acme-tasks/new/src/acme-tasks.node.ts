import { apiKey, credential, defineNode } from '@n8n/node-sdk';

export const node = defineNode({
	id: 'acmeTasks',
	displayName: 'Acme Tasks',
	credential: credential({
		types: [apiKey({ name: 'acmeTasksApi', displayName: 'Acme Tasks API', key: 'X-Acme-Key' })],
	}),
	baseUrl: 'http://127.0.0.1:18090/acme-tasks/v1',
});

export const tasks = node.resource('task');
