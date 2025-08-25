import {
	NodeOperationError,
	type IDisplayOptions,
	type IExecuteFunctions,
	type INodeProperties,
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
