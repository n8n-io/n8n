import { NodeOperationError } from 'n8n-workflow';
import type {
	DataStoreRowReturn,
	IDataStoreProjectService,
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';

import { ALL_CONDITIONS, ANY_CONDITION, type FilterType } from './constants';
import { DATA_TABLE_ID_FIELD } from './fields';
import { buildGetManyFilter, isFieldArray, isMatchType } from './utils';

export function getSelectFields(
	displayOptions: IDisplayOptions,
	requireCondition = false,
): INodeProperties[] {
	return [
		{
			displayName: 'Must Match',
			name: 'matchType',
			type: 'options',
			options: [
				{
					name: 'Any Condition',
					value: ANY_CONDITION,
				},
				{
					name: 'All Conditions',
					value: ALL_CONDITIONS,
				},
			] satisfies Array<{ value: FilterType; name: string }>,
			displayOptions,
			default: ANY_CONDITION,
		},
		{
			displayName: 'Conditions',
			name: 'filters',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				minRequiredFields: requireCondition ? 1 : 0,
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
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
							displayName: 'Column',
							name: 'keyName',
							type: 'options',
							// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
							description:
								'Choose from the list, or specify using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsDependsOn: [DATA_TABLE_ID_FIELD],
								loadOptionsMethod: 'getDataTableColumns',
							},
							default: 'id',
						},
						{
							// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
							displayName: 'Condition',
							name: 'condition',
							// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-options
							type: 'options',
							typeOptions: {
								loadOptionsDependsOn: ['&keyName'],
								loadOptionsMethod: 'getConditionsForColumn',
							},
							default: 'eq',
						},
						{
							displayName: 'Value',
							name: 'keyValue',
							type: 'string',
							default: '',
							displayOptions: {
								hide: {
									condition: ['isEmpty', 'isNotEmpty'],
								},
							},
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
	const matchType = ctx.getNodeParameter('matchType', index, ANY_CONDITION);
	const node = ctx.getNode();

	if (!isMatchType(matchType)) {
		throw new NodeOperationError(node, 'unexpected match type');
	}
	if (!isFieldArray(fields)) {
		throw new NodeOperationError(node, 'unexpected fields input');
	}

	return buildGetManyFilter(fields, matchType);
}

export async function executeSelectMany(
	ctx: IExecuteFunctions,
	index: number,
	dataStoreProxy: IDataStoreProjectService,
	rejectEmpty = false,
): Promise<Array<{ json: DataStoreRowReturn }>> {
	const filter = getSelectFilter(ctx, index);

	if (rejectEmpty && filter.filters.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'At least one condition is required');
	}

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
