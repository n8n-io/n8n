import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import {
	bookingFields,
	bookingOperations,
	eventTypeFields,
	eventTypeOperations,
} from './descriptions';

export class Cal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cal.com',
		name: 'cal',
		icon: { light: 'file:cal.svg', dark: 'file:cal.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Consume the Cal.com API',
		defaults: {
			name: 'Cal.com',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'calApi',
				required: true,
			},
		],
		requestDefaults: {
			// `host` is part of the existing Cal credential, so the same node
			// serves Cal.com cloud and self-hosted instances. The trailing slash
			// is stripped because `/v2` is appended here rather than passed as a
			// relative URL, so a host saved as `https://cal.example.com/` would
			// otherwise request `//v2/...` and 404 on some installations.
			baseURL:
				'={{ $credentials.host.endsWith("/") ? $credentials.host.slice(0, -1) : $credentials.host }}/v2',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			// `cal-api-version` is deliberately not set here. The stamp differs
			// per endpoint, so each operation sets its own.
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Booking',
						value: 'booking',
					},
					{
						name: 'Event Type',
						value: 'eventType',
					},
				],
				default: 'booking',
			},
			...bookingOperations,
			...bookingFields,
			...eventTypeOperations,
			...eventTypeFields,
		],
	};
}
