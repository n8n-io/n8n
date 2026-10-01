import { defineCredential } from '@n8n/node-sdk';

import { createTask } from './actions/task.create';
import { getManyTasks } from './actions/task.get-all';

export { node } from './acme-tasks.node';

export const credentials = [
	defineCredential({
		name: 'acmeTasksApi',
		displayName: 'Acme Tasks API',
		properties: [
			{ name: 'apiKey', displayName: 'API Key', type: 'string', typeOptions: { password: true } },
		],
		authenticate: { headers: { 'X-Acme-Key': '={{$credentials.apiKey}}' } },
	}),
];

export const actions = [getManyTasks, createTask];
