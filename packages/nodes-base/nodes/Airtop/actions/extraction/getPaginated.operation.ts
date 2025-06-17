import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { outputSchemaField, parseJsonOutputField } from '../common/fields';
import { parseJsonIfPresent } from '../common/output.utils';
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
		placeholder: 'e.g. Extract all the product names and prices',
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
				...parseJsonOutputField,
			},
			{
				displayName: 'Interaction Mode',
				name: 'interactionMode',
				type: 'options',
				default: 'auto',
				description: 'The strategy for interacting with the page',
				options: [
					{
						name: 'Auto',
						description: 'Automatically choose the most cost-effective mode',
						value: 'auto',
					},
					{
						name: 'Accurate',
						description: 'Prioritize accuracy over cost',
						value: 'accurate',
					},
					{
						name: 'Cost Efficient',
						description: 'Minimize costs while ensuring effectiveness',
						value: 'cost-efficient',
					},
				],
			},
			{
				displayName: 'Pagination Mode',
				name: 'paginationMode',
				type: 'options',
				default: 'auto',
				description: 'The pagination approach to use',
				options: [
					{
						name: 'Auto',
						description: 'Look for pagination links first, then try infinite scrolling',
						value: 'auto',
					},
					{
						name: 'Paginated',
						description: 'Only use pagination links',
						value: 'paginated',
					},
					{
						name: 'Infinite Scroll',
						description: 'Scroll the page to load more content',
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

	const configFields = ['paginationMode', 'interactionMode', 'outputSchema'];
	const configuration = configFields.reduce(
		(config, key) => (additionalFields[key] ? { ...config, [key]: additionalFields[key] } : config),
		{},
	);

	const result = await executeRequestWithSessionManagement.call(this, index, {
		method: 'POST',
		path: '/sessions/{sessionId}/windows/{windowId}/paginated-extraction',
		body: {
			prompt,
			configuration,
		},
	});

	const nodeOutput = parseJsonIfPresent.call(this, index, result);
	return this.helpers.returnJsonArray(nodeOutput);
}
