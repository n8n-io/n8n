/* eslint-disable @typescript-eslint/naming-convention */
import type { FilterConditionValue, FilterOptionsValue } from 'n8n-workflow';
import type { FilterOperator, FilterOperatorGroup } from './types';

export const DEFAULT_MAX_CONDITIONS = 10;

export const DEFAULT_FILTER_OPTIONS: FilterOptionsValue = {
	caseSensitive: true,
	leftValue: '',
	typeValidation: 'strict',
	version: 1,
};

export const OPERATORS_BY_ID = {
	'string:exists': {
		type: 'string',
		operation: 'exists',
		name: 'filter.operator.exists',
		singleValue: true,
	},
	'string:notExists': {
		type: 'string',
		operation: 'notExists',
		name: 'filter.operator.notExists',
		singleValue: true,
	},
	'string:empty': {
		type: 'string',
		operation: 'empty',
		name: 'filter.operator.empty',
		singleValue: true,
	},
	'string:notEmpty': {
		type: 'string',
		operation: 'notEmpty',
		name: 'filter.operator.notEmpty',
		singleValue: true,
	},
	'string:equals': { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
	'string:notEquals': { type: 'string', operation: 'notEquals', name: 'filter.operator.notEquals' },
	'string:contains': { type: 'string', operation: 'contains', name: 'filter.operator.contains' },
	'string:notContains': {
		type: 'string',
		operation: 'notContains',
		name: 'filter.operator.notContains',
	},
	'string:startsWith': {
		type: 'string',
		operation: 'startsWith',
		name: 'filter.operator.startsWith',
	},
	'string:notStartsWith': {
		type: 'string',
		operation: 'notStartsWith',
		name: 'filter.operator.notStartsWith',
	},
	'string:endsWith': { type: 'string', operation: 'endsWith', name: 'filter.operator.endsWith' },
	'string:notEndsWith': {
		type: 'string',
		operation: 'notEndsWith',
		name: 'filter.operator.notEndsWith',
	},
	'string:regex': { type: 'string', operation: 'regex', name: 'filter.operator.regex' },
	'string:notRegex': { type: 'string', operation: 'notRegex', name: 'filter.operator.notRegex' },
	'number:exists': {
		type: 'number',
		operation: 'exists',
		name: 'filter.operator.exists',
		singleValue: true,
	},
	'number:notExists': {
		type: 'number',
		operation: 'notExists',
		name: 'filter.operator.notExists',
		singleValue: true,
	},
	'number:empty': {
		type: 'number',
		operation: 'empty',
		name: 'filter.operator.empty',
		singleValue: true,
	},
	'number:notEmpty': {
		type: 'number',
		operation: 'notEmpty',
		name: 'filter.operator.notEmpty',
		singleValue: true,
	},
	'number:equals': { type: 'number', operation: 'equals', name: 'filter.operator.equals' },
	'number:notEquals': { type: 'number', operation: 'notEquals', name: 'filter.operator.notEquals' },
	'number:gt': { type: 'number', operation: 'gt', name: 'filter.operator.gt' },
	'number:lt': { type: 'number', operation: 'lt', name: 'filter.operator.lt' },
	'number:gte': { type: 'number', operation: 'gte', name: 'filter.operator.gte' },
	'number:lte': { type: 'number', operation: 'lte', name: 'filter.operator.lte' },
	'dateTime:exists': {
		type: 'dateTime',
		operation: 'exists',
		name: 'filter.operator.exists',
		singleValue: true,
	},
	'dateTime:notExists': {
		type: 'dateTime',
		operation: 'notExists',
		name: 'filter.operator.notExists',
		singleValue: true,
	},
	'dateTime:empty': {
		type: 'dateTime',
		operation: 'empty',
		name: 'filter.operator.empty',
		singleValue: true,
	},
	'dateTime:notEmpty': {
		type: 'dateTime',
		operation: 'notEmpty',
		name: 'filter.operator.notEmpty',
		singleValue: true,
	},
	'dateTime:equals': { type: 'dateTime', operation: 'equals', name: 'filter.operator.equals' },
	'dateTime:notEquals': {
		type: 'dateTime',
		operation: 'notEquals',
		name: 'filter.operator.notEquals',
	},
	'dateTime:after': { type: 'dateTime', operation: 'after', name: 'filter.operator.after' },
	'dateTime:before': { type: 'dateTime', operation: 'before', name: 'filter.operator.before' },
	'dateTime:afterOrEquals': {
		type: 'dateTime',
		operation: 'afterOrEquals',
		name: 'filter.operator.afterOrEquals',
	},
	'dateTime:beforeOrEquals': {
		type: 'dateTime',
		operation: 'beforeOrEquals',
		name: 'filter.operator.beforeOrEquals',
	},
	'boolean:exists': {
		type: 'boolean',
		operation: 'exists',
		name: 'filter.operator.exists',
		singleValue: true,
	},
	'boolean:notExists': {
		type: 'boolean',
		operation: 'notExists',
		name: 'filter.operator.notExists',
		singleValue: true,
	},
	'boolean:empty': {
		type: 'boolean',
		operation: 'empty',
		name: 'filter.operator.empty',
		singleValue: true,
	},
	'boolean:notEmpty': {
		type: 'boolean',
		operation: 'notEmpty',
		name: 'filter.operator.notEmpty',
		singleValue: true,
	},
	'boolean:true': {
		type: 'boolean',
		operation: 'true',
		name: 'filter.operator.true',
		singleValue: true,
	},
	'boolean:false': {
		type: 'boolean',
		operation: 'false',
		name: 'filter.operator.false',
		singleValue: true,
	},
	'boolean:equals': { type: 'boolean', operation: 'equals', name: 'filter.operator.equals' },
	'boolean:notEquals': {
		type: 'boolean',
		operation: 'notEquals',
		name: 'filter.operator.notEquals',
	},
	'array:exists': {
		type: 'array',
		operation: 'exists',
		name: 'filter.operator.exists',
		singleValue: true,
	},
	'array:notExists': {
		type: 'array',
		operation: 'notExists',
		name: 'filter.operator.notExists',
		singleValue: true,
	},
	'array:empty': {
		type: 'array',
		operation: 'empty',
		name: 'filter.operator.empty',
		singleValue: true,
	},
	'array:notEmpty': {
		type: 'array',
		operation: 'notEmpty',
		name: 'filter.operator.notEmpty',
		singleValue: true,
	},
	'array:contains': {
		type: 'array',
		operation: 'contains',
		name: 'filter.operator.contains',
		rightType: 'any',
	},
	'array:notContains': {
		type: 'array',
		operation: 'notContains',
		name: 'filter.operator.notContains',
		rightType: 'any',
	},
	'array:lengthEquals': {
		type: 'array',
		operation: 'lengthEquals',
		name: 'filter.operator.lengthEquals',
		rightType: 'number',
	},
	'array:lengthNotEquals': {
		type: 'array',
		operation: 'lengthNotEquals',
		name: 'filter.operator.lengthNotEquals',
		rightType: 'number',
	},
	'array:lengthGt': {
		type: 'array',
		operation: 'lengthGt',
		name: 'filter.operator.lengthGt',
		rightType: 'number',
	},
	'array:lengthLt': {
		type: 'array',
		operation: 'lengthLt',
		name: 'filter.operator.lengthLt',
		rightType: 'number',
	},
	'array:lengthGte': {
		type: 'array',
		operation: 'lengthGte',
		name: 'filter.operator.lengthGte',
		rightType: 'number',
	},
	'array:lengthLte': {
		type: 'array',
		operation: 'lengthLte',
		name: 'filter.operator.lengthLte',
		rightType: 'number',
	},
	'object:exists': {
		type: 'object',
		operation: 'exists',
		name: 'filter.operator.exists',
		singleValue: true,
	},
	'object:notExists': {
		type: 'object',
		operation: 'notExists',
		name: 'filter.operator.notExists',
		singleValue: true,
	},
	'object:empty': {
		type: 'object',
		operation: 'empty',
		name: 'filter.operator.empty',
		singleValue: true,
	},
	'object:notEmpty': {
		type: 'object',
		operation: 'notEmpty',
		name: 'filter.operator.notEmpty',
		singleValue: true,
	},
} as const satisfies Record<string, FilterOperator>;

export const OPERATORS = Object.values(OPERATORS_BY_ID);

export type FilterOperatorId = keyof typeof OPERATORS_BY_ID;

export const DEFAULT_OPERATOR_VALUE: FilterConditionValue['operator'] =
	OPERATORS_BY_ID['string:equals'];

export const OPERATOR_GROUPS: FilterOperatorGroup[] = [
	{
		id: 'string',
		name: 'type.string',
		icon: 'case-upper',
		children: OPERATORS.filter((operator) => operator.type === 'string'),
	},
	{
		id: 'number',
		name: 'type.number',
		icon: 'hash',
		children: OPERATORS.filter((operator) => operator.type === 'number'),
	},
	{
		id: 'dateTime',
		name: 'type.dateTime',
		icon: 'calendar',
		children: OPERATORS.filter((operator) => operator.type === 'dateTime'),
	},
	{
		id: 'boolean',
		name: 'type.boolean',
		icon: 'square-check',
		children: OPERATORS.filter((operator) => operator.type === 'boolean'),
	},
	{
		id: 'array',
		name: 'type.array',
		icon: 'list',
		children: OPERATORS.filter((operator) => operator.type === 'array'),
	},
	{
		id: 'object',
		name: 'type.object',
		icon: 'box',
		children: OPERATORS.filter((operator) => operator.type === 'object'),
	},
];
