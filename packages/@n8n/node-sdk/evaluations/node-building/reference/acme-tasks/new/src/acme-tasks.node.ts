import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

export const node = defineNode({
	id: 'acmeTasks',
	displayName: 'Acme Tasks',
	credential: credential({
		types: [
			defineCredential({
				id: 'acmeTasks.apiKey',
				version: '1.0.0',
				legacyName: 'acmeTasksApi',
				displayName: 'Acme Tasks API',
				fields: { apiKey: field.secret('API Key') },
				auth: (a) => a.header('X-Acme-Key', '{apiKey}'),
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/acme-tasks/v1',
});

export const tasks = node.resource('task');
