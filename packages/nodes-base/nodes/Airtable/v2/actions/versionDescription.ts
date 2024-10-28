/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as record from './record/Record.resource';
import * as base from './base/Base.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Airtable',
	name: 'airtable',
	icon: 'file:airtable.svg',
	group: ['input'],
	version: [2, 2.1],
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
			displayOptions: {
				show: {
					authentication: ['airtableTokenApi'],
				},
			},
		},
		{
			name: 'airtableOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['airtableOAuth2Api'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Access Token',
					value: 'airtableTokenApi',
				},
				{
					name: 'OAuth2',
					value: 'airtableOAuth2Api',
				},
			],
			default: 'airtableTokenApi',
		},
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
				// {
				// 	name: 'Table',
				// 	value: 'table',
				// },
			],
			default: 'record',
		},
		...record.description,
		...base.description,
	],
};
