/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as attachment from './attachment';
import * as page from './page';
import * as search from './search';
import * as space from './space';
import { CONFLUENCE_CREDENTIAL_NAME } from '../transport';

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
	// Bug-bash branch: unhidden + usableAsTool for testing; master keeps the hidden shell until ENT-311
	usableAsTool: true,
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
