import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { outputSchemaField } from '../common/fields';
import { executeRequestWithSessionManagement } from '../common/session.utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['getPaginated'],
			},
		},
		description: 'The prompt to extract data from the pages',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['getPaginated'],
			},
		},
		options: [
			{
				...outputSchemaField,
			},
			{
				displayName: 'Interaction Mode',
				name: 'interactionMode',
				type: 'options',
				default: 'auto',
				hint: "When set to 'Auto', it automatically chooses the most cost-effective mode. With 'Accurate', the AI prioritizes accuracy over cost, and when set to 'Cost Efficient', it focuses on minimizing costs while ensuring effectiveness.",
				options: [
					{
						name: 'Auto',
						value: 'auto',
					},
					{
						name: 'Accurate',
						value: 'accurate',
					},
					{
						name: 'Cost Efficient',
						value: 'cost-efficient',
					},
				],
			},
			{
				displayName: 'Pagination Mode',
				name: 'paginationMode',
				type: 'options',
				default: 'auto',
				hint: "The mode to use for pagination. If set to 'Auto', Airtop AI first looks for pagination links and then tries infinite scrolling. If set to 'Paginated', it uses pagination links. If set to 'Infinite Scroll', it scrolls the page to load more content.",
				options: [
					{
						name: 'Auto',
						value: 'auto',
					},
					{
						name: 'Paginated',
						value: 'paginated',
					},
					{
						name: 'Infinite Scroll',
						value: 'infinite-scroll',
					},
				],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const prompt = this.getNodeParameter('prompt', index, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', index);

	return await executeRequestWithSessionManagement.call(this, index, {
		method: 'POST',
		path: '/sessions/{sessionId}/windows/{windowId}/paginated-extraction',
		body: {
			prompt,
			configuration: {
				...additionalFields,
			},
		},
	});
}
