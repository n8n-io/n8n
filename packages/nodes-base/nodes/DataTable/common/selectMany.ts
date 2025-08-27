import { NodeOperationError } from 'n8n-workflow';
import type {
	DataStoreRowReturn,
	IDataStoreProjectService,
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';

import type { FilterType } from './constants';
import { DATA_TABLE_ID_FIELD } from './fields';
import { buildGetManyFilter, isFieldArray, isMatchType } from './utils';

export function getSelectFields(displayOptions: IDisplayOptions): INodeProperties[] {
	return [
		{
			displayName: 'Must Match',
			name: 'matchType',
			type: 'options',
			options: [
				{
					name: 'Any Filter',
					value: 'anyFilter',
				},
				{
					name: 'All Filters',
					value: 'allFilters',
				},
			] satisfies Array<{ value: FilterType; name: string }>,
			displayOptions,
			default: 'anyFilter',
		},
		{
			displayName: 'Conditions',
			name: 'filters',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions,
			default: {},
			placeholder: 'Add Condition',
			options: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					values: [
						{
							displayName: 'Field Name or ID',
							name: 'keyName',
							type: 'options',
							description:
								'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsDependsOn: [DATA_TABLE_ID_FIELD],
								loadOptionsMethod: 'getDataTableColumns',
							},
							default: 'id',
						},
						{
							displayName: 'Condition',
							name: 'condition',
							type: 'options',
							options: [
								{
									name: 'Equals',
									value: 'eq',
								},
								{
									name: 'Not Equals',
									value: 'neq',
								},
							],
							default: 'eq',
						},
						{
							displayName: 'Field Value',
							name: 'keyValue',
							type: 'string',
							default: '',
						},
					],
				},
			],
			description: 'Filter to decide which rows get',
		},
	];
}

export function getSelectFilter(ctx: IExecuteFunctions, index: number) {
	const fields = ctx.getNodeParameter('filters.conditions', index, []);
	const matchType = ctx.getNodeParameter('matchType', index, []);

	if (!isMatchType(matchType)) {
		throw new NodeOperationError(ctx.getNode(), 'unexpected match type');
	}
	if (!isFieldArray(fields)) {
		throw new NodeOperationError(ctx.getNode(), 'unexpected fields input');
	}

	return buildGetManyFilter(fields, matchType);
}

export async function executeSelectMany(
	ctx: IExecuteFunctions,
	index: number,
	dataStoreProxy: IDataStoreProjectService,
): Promise<Array<{ json: DataStoreRowReturn }>> {
	const filter = getSelectFilter(ctx, index);

	let take = 1000;
	const result: Array<{ json: DataStoreRowReturn }> = [];
	let totalCount = undefined;
	do {
		const response = await dataStoreProxy.getManyRowsAndCount({
			skip: result.length,
			take,
			filter,
		});
		const data = response.data.map((json) => ({ json }));

		// Optimize common path of <1000 results
		if (response.count === response.data.length) {
			return data;
		}

		if (totalCount !== undefined && response.count !== totalCount) {
			throw new NodeOperationError(
				ctx.getNode(),
				'synchronization error: result count changed during pagination',
			);
		}
		totalCount = response.count;

		result.push.apply(result, data);
		take = Math.min(take, response.count - result.length);
	} while (take > 0);

	return result;
}
