/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as attachment from './attachment';
import * as page from './page';
import * as search from './search';
import * as space from './space';
import { CONFLUENCE_CREDENTIAL_NAME, SERVICE_ACCOUNT_CREDENTIAL_NAME } from '../transport';

export const confluenceNodeDescription: INodeTypeDescription = {
	displayName: 'Confluence',
	name: 'confluence',
	icon: 'file:confluence.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Interact with the Confluence Cloud API',
	defaults: {
		name: 'Confluence',
	},
	// Hidden shell: operations land per-ticket; unhide + usableAsTool + docs at ENT-311
	hidden: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: CONFLUENCE_CREDENTIAL_NAME,
			required: true,
			displayOptions: {
				show: {
					authentication: ['cloudOAuth2'],
				},
			},
		},
		{
			name: SERVICE_ACCOUNT_CREDENTIAL_NAME,
			required: true,
			displayOptions: {
				show: {
					authentication: ['serviceAccount'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Cloud OAuth2',
					value: 'cloudOAuth2',
				},
				{
					name: 'Service Account',
					value: 'serviceAccount',
					description:
						"OAuth 2.0 client credentials for an Atlassian service account. The credential's scopes are fixed when it is created, and space permissions apply on top, like for any other user.",
				},
			],
			default: 'cloudOAuth2',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Attachment',
					value: 'attachment',
				},
				{
					name: 'Page',
					value: 'page',
				},
				{
					name: 'Search',
					value: 'search',
				},
				{
					name: 'Space',
					value: 'space',
				},
			],
			default: 'page',
		},
		...attachment.description,
		...page.description,
		...search.description,
		...space.description,
	],
};
