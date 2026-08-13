/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { CONFLUENCE_CREDENTIAL_NAME } from '../transport';
import * as page from './page';

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
	// hidden: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: CONFLUENCE_CREDENTIAL_NAME,
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
					name: 'Page',
					value: 'page',
				},
			],
			default: 'page',
		},
		...page.description,
	],
};
