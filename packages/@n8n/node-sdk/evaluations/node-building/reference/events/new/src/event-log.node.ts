import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

export const node = defineNode({
	id: 'eventLog',
	displayName: 'Event Log',
	credential: credential({
		types: [
			credentialType({
				id: 'eventLog.apiKey',
				legacyName: 'eventLogApi',
				displayName: 'Event Log API',
				fields: { apiKey: t.secret('API Key') },
				auth: (a) => a.header('X-Events-Key', '{apiKey}'),
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/events/v1',
});

export const events = node.resource('event');
