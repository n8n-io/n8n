/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as record from './record/Record.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Airtable',
	name: 'airtable',
	icon: 'file:airtable.svg',
	group: ['input'],
	version: 2,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Read, update, write and delete data from Airtable',
	defaults: {
		name: 'Airtable',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'airtableTokenApi',
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
					name: 'Base',
					value: 'base',
				},
				{
					name: 'Record',
					value: 'record',
				},
				{
					name: 'Table',
					value: 'table',
				},
			],
			default: 'record',
		},
		...record.description,
	],
};
