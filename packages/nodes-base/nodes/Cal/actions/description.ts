/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as booking from './booking';
import * as eventType from './eventType';
import * as schedule from './schedule';
import * as slot from './slot';

export const calNodeDescription: INodeTypeDescription = {
	displayName: 'Cal.com',
	name: 'cal',
	icon: { light: 'file:cal.svg', dark: 'file:cal.dark.svg' },
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Consume the Cal.com API v2',
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
				{
					name: 'Schedule',
					value: 'schedule',
				},
				{
					name: 'Slot',
					value: 'slot',
				},
			],
			default: 'booking',
		},
		...booking.description,
		...eventType.description,
		...schedule.description,
		...slot.description,
	],
};
