import { bool, num, obj, record, str, tagOf, variant } from '../helpers';
import type { ActionContract, JsonSchema } from '../types';

/** Operators that test presence or a fixed value. They take no comparison value. */
const UNARY = ['exists', 'notExists', 'empty', 'notEmpty'];

interface OperandType {
	/** Slot type of `left`; an expression that yields another type fails the build. */
	left: JsonSchema;
	/** Operator name to comparison value schema; `undefined` for unary operators. */
	operators: Record<string, JsonSchema | undefined>;
}

const binary = (names: string[], value: JsonSchema) =>
	Object.fromEntries(names.map((name) => [name, value]));
const unary = (names: string[]) => Object.fromEntries(names.map((name) => [name, undefined]));

/** Mirrors `executeFilterCondition` in n8n-workflow filter-parameter.ts. */
const OPERAND_TYPES: Record<string, OperandType> = {
	['string']: {
		left: str(),
		operators: {
			...unary(UNARY),
			...binary(
				[
					'equals',
					'notEquals',
					'contains',
					'notContains',
					'startsWith',
					'notStartsWith',
					'endsWith',
					'notEndsWith',
				],
				str(),
			),
			...binary(['regex', 'notRegex'], str('JavaScript regular expression')),
		},
	},
	['number']: {
		left: num(),
		operators: {
			...unary(UNARY),
			...binary(['equals', 'notEquals', 'gt', 'lt', 'gte', 'lte'], num()),
		},
	},
	dateTime: {
		left: { 'x-n8n-hint': 'ISO 8601 string or DateTime' },
		operators: {
			...unary(UNARY),
			...binary(
				['equals', 'notEquals', 'after', 'before', 'afterOrEquals', 'beforeOrEquals'],
				str('ISO 8601 date or date-time'),
			),
		},
	},
	['boolean']: {
		left: bool(),
		operators: {
			...unary([...UNARY, 'true', 'false']),
			...binary(['equals', 'notEquals'], bool()),
		},
	},
	array: {
		left: { type: 'array' },
		operators: {
			...unary(UNARY),
			...binary(['contains', 'notContains'], {}),
			...binary(
				['lengthEquals', 'lengthNotEquals', 'lengthGt', 'lengthLt', 'lengthGte', 'lengthLte'],
				num(),
			),
		},
	},
	object: { left: { type: 'object' }, operators: unary(UNARY) },
};

const condition = variant(
	'type',
	Object.fromEntries(
		Object.entries(OPERAND_TYPES).map(([type, { left, operators }]) => [
			type,
			{
				properties: {
					left,
					condition: variant(
						'op',
						Object.fromEntries(
							Object.entries(operators).map(([op, value]) => [
								op,
								value ? { properties: { value }, required: ['value'] } : {},
							]),
						),
					),
				},
				required: ['left', 'condition'],
			},
		]),
	),
	{ 'x-n8n-hint': 'type is the type of left; convert with Number() or String() first' },
);

/** The editor's `singleValue` and `rightType` metadata, which the runtime reads. */
function compileOperator(type: string, op: string) {
	const operands = OPERAND_TYPES[type];
	const isUnary = operands !== undefined && op in operands.operators && !operands.operators[op];
	const rightType =
		type === 'array' && op.startsWith('length')
			? 'number'
			: type === 'array' && op.endsWith('ontains')
				? 'any'
				: undefined;
	return {
		type,
		operation: op,
		...(isUnary ? { singleValue: true } : {}),
		...(rightType ? { rightType } : {}),
	};
}

export const ifCondition: ActionContract = {
	id: 'if.condition',
	node: 'if',
	action: 'Route items by condition',
	summary: 'Send each item to the true or the false output. Items pass through unchanged.',
	flow: { effect: 'transform', cardinality: 'per-item', passthrough: 'merge', idempotent: true },
	credentials: [],
	input: obj(
		{
			match: { enum: ['all', 'any'], default: 'all', 'x-n8n-hint': 'all = AND, any = OR' },
			conditions: { type: 'array', minItems: 1, items: condition },
			caseSensitive: bool({ default: true }),
			strictTypes: bool({
				default: true,
				'x-n8n-hint': 'false converts types before comparing, e.g. "120" to 120',
			}),
		},
		['conditions'],
	),
	output: { type: 'object', additionalProperties: true },
	deriveOutput: (_input, upstream) => upstream ?? { type: 'object', additionalProperties: true },
	example: {
		conditions: [
			{ type: 'number', left: '={{ $json.total }}', condition: { op: 'gt', value: 100 } },
		],
	},
	compile: {
		type: 'n8n-nodes-base.if',
		typeVersion: 2.2,
		parameters: (input) => {
			const caseSensitive = input.caseSensitive !== false;
			const strict = input.strictTypes !== false;
			const conditions = Array.isArray(input.conditions) ? input.conditions : [];
			return {
				conditions: {
					options: {
						caseSensitive,
						leftValue: '',
						typeValidation: strict ? 'strict' : 'loose',
						version: 2,
					},
					conditions: conditions.map((item, index) => {
						const { type, left, condition: test } = record(item);
						return {
							id: `condition-${index}`,
							leftValue: left,
							rightValue: record(test).value ?? '',
							operator: compileOperator(String(type), String(tagOf(test, 'op'))),
						};
					}),
					combinator: input.match === 'any' ? 'or' : 'and',
				},
				looseTypeValidation: !strict,
				options: caseSensitive ? {} : { ignoreCase: true },
			};
		},
	},
};
