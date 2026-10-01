import { defineNode } from '@n8n/node-sdk';

export const node = defineNode({
	id: 'eventLog',
	displayName: 'Event Log',
	credentials: ['eventLogApi'],
	baseUrl: 'http://127.0.0.1:18090/events/v1',
});

export const events = node.resource('event');
