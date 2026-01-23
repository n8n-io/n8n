import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	ListDataTableOptions,
	ListDataTableOptionsSortByKey,
} from 'n8n-workflow';

import { ROWS_LIMIT_DEFAULT } from '../../common/constants';
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
		default: ROWS_LIMIT_DEFAULT,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				...displayOptions.show,
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
				displayName: 'Sort Field',
				name: 'sortField',
				type: 'options',
				default: 'name',
				options: [
					{ name: 'Created', value: 'createdAt' },
					{ name: 'Name', value: 'name' },
					{ name: 'Size', value: 'sizeBytes' },
					{ name: 'Updated', value: 'updatedAt' },
				] satisfies Array<{ name: string; value: ListDataTableOptionsSortByKey }>,
				description: 'Field to sort by',
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				default: 'asc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const limit = this.getNodeParameter('limit', index, ROWS_LIMIT_DEFAULT) as number;
	const options = this.getNodeParameter('options', index, {}) as {
		filterName?: string;
		sortField?: string;
		sortDirection?: 'asc' | 'desc';
	};

	const aggregateProxy = await getDataTableAggregateProxy(this);

	const queryOptions: ListDataTableOptions = {};

	if (options.sortField && options.sortDirection) {
		queryOptions.sortBy =
			`${options.sortField}:${options.sortDirection}` as ListDataTableOptions['sortBy'];
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
				results.push({ json: table });
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
			results.push({ json: table });
		}
	}

	return results;
}
