import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

export const node = defineNode({
	id: 'acmeTasks',
	displayName: 'Acme Tasks',
	credential: credential({
		types: [
			credentialType({
				id: 'acmeTasks.apiKey',
				legacyName: 'acmeTasksApi',
				displayName: 'Acme Tasks API',
				fields: { apiKey: t.secret('API Key') },
				auth: (a) => a.header('X-Acme-Key', '{apiKey}'),
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/acme-tasks/v1',
});

export const tasks = node.resource('task');
