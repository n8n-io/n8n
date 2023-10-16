/* eslint-disable @typescript-eslint/naming-convention */
import type { FilterOperator, FilterOperatorGroup } from './types';

export const DEFAULT_MAX_CONDITIONS = 5;

export const OPERATORS_BY_ID = {
	'any:exists': { id: 'any:exists', name: 'filter.operator.exists', singleValue: true },
	'any:notExists': { id: 'any:notExists', name: 'filter.operator.notExists', singleValue: true },
	'string:equals': { id: 'string:equals', name: 'filter.operator.equals' },
	'string:notEquals': { id: 'string:notEquals', name: 'filter.operator.notEquals' },
	'string:contains': { id: 'string:contains', name: 'filter.operator.contains' },
	'string:notContains': { id: 'string:notContains', name: 'filter.operator.notContains' },
	'string:startsWith': { id: 'string:startsWith', name: 'filter.operator.startsWith' },
	'string:notStartsWith': { id: 'string:notStartsWith', name: 'filter.operator.notStartsWith' },
	'string:endsWith': { id: 'string:endsWith', name: 'filter.operator.endsWith' },
	'string:notEndsWith': { id: 'string:notEndsWith', name: 'filter.operator.notEndsWith' },
	'string:regex': { id: 'string:regex', name: 'filter.operator.regex' },
	'string:notRegex': { id: 'string:notRegex', name: 'filter.operator.notRegex' },
	'number:equals': { id: 'number:equals', name: 'filter.operator.equals' },
	'number:notEquals': { id: 'number:notEquals', name: 'filter.operator.notEquals' },
	'number:gt': { id: 'number:gt', name: 'filter.operator.gt' },
	'number:lt': { id: 'number:lt', name: 'filter.operator.lt' },
	'number:gte': { id: 'number:gte', name: 'filter.operator.gte' },
	'number:lte': { id: 'number:lte', name: 'filter.operator.lte' },
	'date:equals': { id: 'date:equals', name: 'filter.operator.equals' },
	'date:notEquals': { id: 'date:notEquals', name: 'filter.operator.notEquals' },
	'date:after': { id: 'date:after', name: 'filter.operator.after' },
	'date:before': { id: 'date:before', name: 'filter.operator.before' },
	'date:afterOrEquals': { id: 'date:afterOrEquals', name: 'filter.operator.afterOrEquals' },
	'date:beforeOrEquals': { id: 'date:beforeOrEquals', name: 'filter.operator.beforeOrEquals' },
	'boolean:true': { id: 'boolean:true', name: 'filter.operator.true', singleValue: true },
	'boolean:false': { id: 'boolean:false', name: 'filter.operator.false', singleValue: true },
	'boolean:equals': { id: 'boolean:equals', name: 'filter.operator.equals' },
	'boolean:notEquals': { id: 'boolean:notEquals', name: 'filter.operator.notEquals' },
	'array:contains': { id: 'array:contains', name: 'filter.operator.contains' },
	'array:notContains': { id: 'array:notContains', name: 'filter.operator.notContains' },
	'array:lengthEquals': { id: 'array:lengthEquals', name: 'filter.operator.lengthEquals' },
	'array:lengthNotEquals': { id: 'array:lengthNotEquals', name: 'filter.operator.lengthNotEquals' },
	'array:lengthGt': { id: 'array:lengthGt', name: 'filter.operator.lengthGt' },
	'array:lengthLt': { id: 'array:lengthLt', name: 'filter.operator.lengthLt' },
	'array:lengthGte': { id: 'array:lengthGte', name: 'filter.operator.lengthGte' },
	'array:lengthLte': { id: 'array:lengthLte', name: 'filter.operator.lengthLte' },
	'object:empty': { id: 'object:empty', name: 'filter.operator.empty', singleValue: true },
	'object:notEmpty': { id: 'object:notEmpty', name: 'filter.operator.notEmpty', singleValue: true },
} as const satisfies Record<string, FilterOperator>;

export const OPERATORS = Object.values(OPERATORS_BY_ID);

export type FilterOperatorId = keyof typeof OPERATORS_BY_ID;

export const DEFAULT_OPERATOR: FilterOperatorId = 'any:exists';

export const OPERATOR_GROUPS: FilterOperatorGroup[] = [
	{
		name: 'filter.operatorGroup.basic',
		children: OPERATORS.filter((operator) => operator.id.startsWith('any')),
	},
	{
		name: 'filter.operatorGroup.string',
		children: OPERATORS.filter((operator) => operator.id.startsWith('string')),
	},
	{
		name: 'filter.operatorGroup.number',
		children: OPERATORS.filter((operator) => operator.id.startsWith('number')),
	},
	{
		name: 'filter.operatorGroup.date',
		children: OPERATORS.filter((operator) => operator.id.startsWith('date')),
	},
	{
		name: 'filter.operatorGroup.boolean',
		children: OPERATORS.filter((operator) => operator.id.startsWith('boolean')),
	},
	{
		name: 'filter.operatorGroup.array',
		children: OPERATORS.filter((operator) => operator.id.startsWith('array')),
	},
	{
		name: 'filter.operatorGroup.object',
		children: OPERATORS.filter((operator) => operator.id.startsWith('object')),
	},
];
