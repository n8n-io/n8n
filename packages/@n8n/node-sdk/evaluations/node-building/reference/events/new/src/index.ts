import { defineCredential } from '@n8n/node-sdk';

import { getManyEvents } from './actions/event.get-all';

export { node } from './event-log.node';

export const credentials = [
	defineCredential({
		name: 'eventLogApi',
		displayName: 'Event Log API',
		properties: [
			{ name: 'apiKey', displayName: 'API Key', type: 'string', typeOptions: { password: true } },
		],
		authenticate: { headers: { 'X-Events-Key': '={{$credentials.apiKey}}' } },
	}),
];

export const actions = [getManyEvents];
