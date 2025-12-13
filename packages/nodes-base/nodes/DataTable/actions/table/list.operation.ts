import type {
	IDataObject,
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	ListDataTableOptions,
} from 'n8n-workflow';

import { getDataTableAggregateProxy } from '../../common/utils';

export const FIELD = 'list';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['table'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: [FIELD],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions,
		options: [
			{
				displayName: 'Filter by Name',
				name: 'filterName',
				type: 'string',
				default: '',
				description: 'Filter data tables by name (case-insensitive)',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'name:asc',
				options: [
					{ name: 'Created (Newest)', value: 'createdAt:desc' },
					{ name: 'Created (Oldest)', value: 'createdAt:asc' },
					{ name: 'Name (A-Z)', value: 'name:asc' },
					{ name: 'Name (Z-A)', value: 'name:desc' },
					{ name: 'Size (Largest)', value: 'sizeBytes:desc' },
					{ name: 'Size (Smallest)', value: 'sizeBytes:asc' },
					{ name: 'Updated (Newest)', value: 'updatedAt:desc' },
					{ name: 'Updated (Oldest)', value: 'updatedAt:asc' },
				],
				description: 'How to sort the returned data tables',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const limit = this.getNodeParameter('limit', index, 50) as number;
	const options = this.getNodeParameter('options', index, {}) as {
		filterName?: string;
		sortBy?: ListDataTableOptions['sortBy'];
	};

	const aggregateProxy = await getDataTableAggregateProxy(this);

	const queryOptions: ListDataTableOptions = {};

	if (options.sortBy) {
		queryOptions.sortBy = options.sortBy;
	}

	if (options.filterName) {
		queryOptions.filter = { name: options.filterName.toLowerCase() };
	}

	const results: INodeExecutionData[] = [];

	if (returnAll) {
		let skip = 0;
		const take = 100;
		let hasMore = true;

		while (hasMore) {
			const response = await aggregateProxy.getManyAndCount({
				...queryOptions,
				skip,
				take,
			});

			for (const table of response.data) {
				results.push({ json: table as unknown as IDataObject });
			}

			skip += take;
			hasMore = response.data.length === take && results.length < response.count;
		}
	} else {
		const response = await aggregateProxy.getManyAndCount({
			...queryOptions,
			skip: 0,
			take: limit,
		});

		for (const table of response.data) {
			results.push({ json: table as unknown as IDataObject });
		}
	}

	return results;
}
