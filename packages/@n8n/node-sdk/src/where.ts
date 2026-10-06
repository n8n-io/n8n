import { t, type Infer } from './schema';

/** Tests on a value that may be absent. `empty` also holds for an empty string or list. */
const presence = { exists: {}, notExists: {}, empty: {}, notEmpty: {} };

const text = { right: t.str().title('Value') };
const pattern = { right: t.str().title('Pattern').hint('A pattern, or /pattern/flags') };
const stringTest = t.variant('op', {
	equals: text,
	notEquals: text,
	contains: text,
	notContains: text,
	startsWith: text,
	notStartsWith: text,
	endsWith: text,
	notEndsWith: text,
	regex: pattern,
	notRegex: pattern,
	...presence,
});

const amount = { right: t.num().title('Value') };
const numberTest = t.variant('op', {
	equals: amount,
	notEquals: amount,
	gt: amount,
	gte: amount,
	lt: amount,
	lte: amount,
	...presence,
});

const moment = { right: t.str().title('Value').hint('ISO 8601, e.g. 2026-09-01T10:00:00Z') };
const dateTimeTest = t.variant('op', {
	equals: moment,
	notEquals: moment,
	after: moment,
	afterOrEquals: moment,
	before: moment,
	beforeOrEquals: moment,
	...presence,
});

const flag = { right: t.bool().title('Value') };
const booleanTest = t.variant('op', {
	true: {},
	false: {},
	equals: flag,
	notEquals: flag,
	...presence,
});

const member = { right: t.jsonValue().title('Value') };
const length = { right: t.int().with({ minimum: 0 }).title('Length') };
const arrayTest = t.variant('op', {
	contains: member,
	notContains: member,
	lengthEquals: length,
	lengthNotEquals: length,
	lengthGt: length,
	lengthGte: length,
	lengthLt: length,
	lengthLte: length,
	...presence,
});

/** One test on one value. `left` is the tested value, usually an expression such as `={{ $json.age }}`. */
const condition = t.variant('type', {
	['string']: {
		left: t.nullable(t.str()).title('Tested Value').optional(),
		test: stringTest.title('Operator'),
	},
	['number']: {
		left: t.nullable(t.num()).title('Tested Value').optional(),
		test: numberTest.title('Operator'),
	},
	dateTime: {
		left: t.nullable(t.str()).title('Tested Value').optional(),
		test: dateTimeTest.title('Operator'),
	},
	['boolean']: {
		left: t.nullable(t.bool()).title('Tested Value').optional(),
		test: booleanTest.title('Operator'),
	},
	array: {
		left: t.nullable(t.arr(t.jsonValue())).title('Tested Value').optional(),
		test: arrayTest.title('Operator'),
	},
});

/**
 * Conditions on item values, as the n8n filter has them: each test, its type and operation have
 * the names of the filter. The `filter` widget edits a field of this schema.
 *
 * @example
 * ```ts
 * input: { where },
 * ui: { fields: { where: { widget: 'filter' } } },
 * ```
 */
export const where = t
	.obj({
		match: t.oneOf('all', 'any').default('all').title('Match'),
		conditions: t.arr(condition).title('Conditions'),
		ignoreCase: t.bool().default(false).title('Ignore Case'),
	})
	.title('Conditions');

/** One condition of `where`. */
export type Condition = Infer<typeof condition>;

/** The value of a `where` field. */
export type Where = Infer<typeof where>;
