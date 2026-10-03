import { t, UserError, type Infer } from '@n8n/node-sdk';
import { safeRegex } from 'n8n-workflow';

/** Tests on a value that may be absent. `empty` also holds for an empty string or list. */
const presence = { exists: {}, notExists: {}, empty: {}, notEmpty: {} };

const text = { right: t.str() };
const pattern = { right: t.str().hint('A pattern, or /pattern/flags') };
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

const amount = { right: t.num() };
const numberTest = t.variant('op', {
	equals: amount,
	notEquals: amount,
	gt: amount,
	gte: amount,
	lt: amount,
	lte: amount,
	...presence,
});

const moment = { right: t.str().hint('ISO 8601, e.g. 2026-09-01T10:00:00Z') };
const dateTimeTest = t.variant('op', {
	equals: moment,
	notEquals: moment,
	after: moment,
	afterOrEquals: moment,
	before: moment,
	beforeOrEquals: moment,
	...presence,
});

const flag = { right: t.bool() };
const booleanTest = t.variant('op', {
	true: {},
	false: {},
	equals: flag,
	notEquals: flag,
	...presence,
});

const member = { right: t.jsonValue() };
const length = { right: t.int().with({ minimum: 0 }) };
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

/** `left` is the tested value, usually an expression such as `={{ $json.age }}`. */
export const condition = t.variant('type', {
	['string']: { left: t.nullable(t.str()).optional(), test: stringTest },
	['number']: { left: t.nullable(t.num()).optional(), test: numberTest },
	dateTime: { left: t.nullable(t.str()).optional(), test: dateTimeTest },
	['boolean']: { left: t.nullable(t.bool()).optional(), test: booleanTest },
	array: { left: t.nullable(t.arr(t.jsonValue())).optional(), test: arrayTest },
});

export const where = t.obj({
	match: t.oneOf('all', 'any').default('all'),
	conditions: t.arr(condition),
	ignoreCase: t.bool().default(false),
});

export type Condition = Infer<typeof condition>;
export type Where = Infer<typeof where>;

const fold = (value: string, ignoreCase: boolean) =>
	ignoreCase ? value.toLocaleLowerCase() : value;

/** `/a+/i` → source and flags; other text is the source. */
function regexOf(text: string): { source: string; flags: string } {
	const literal = /^\/(.*?)\/([gimusy]*)$/.exec(text);
	return literal
		? { source: literal[1] ?? '', flags: literal[2] ?? '' }
		: { source: text, flags: '' };
}

function millisOf(value: string): number {
	const millis = Date.parse(value);
	if (Number.isNaN(millis)) throw new UserError(`"${value}" is not an ISO 8601 date`);
	return millis;
}

function stringMatches(left: string, test: Infer<typeof stringTest>, ignoreCase: boolean) {
	if (!('right' in test)) return undefined;
	const value = fold(left, ignoreCase);
	switch (test.op) {
		case 'regex':
		case 'notRegex': {
			const { source, flags } = regexOf(test.right);
			return safeRegex.test(source, value, flags) === (test.op === 'regex');
		}
		case 'equals':
			return value === fold(test.right, ignoreCase);
		case 'notEquals':
			return value !== fold(test.right, ignoreCase);
		case 'contains':
			return value.includes(fold(test.right, ignoreCase));
		case 'notContains':
			return !value.includes(fold(test.right, ignoreCase));
		case 'startsWith':
			return value.startsWith(fold(test.right, ignoreCase));
		case 'notStartsWith':
			return !value.startsWith(fold(test.right, ignoreCase));
		case 'endsWith':
			return value.endsWith(fold(test.right, ignoreCase));
		case 'notEndsWith':
			return !value.endsWith(fold(test.right, ignoreCase));
	}
}

function numberMatches(left: number, test: Infer<typeof numberTest>) {
	if (!('right' in test)) return undefined;
	const { right } = test;
	const results = {
		equals: left === right,
		notEquals: left !== right,
		gt: left > right,
		gte: left >= right,
		lt: left < right,
		lte: left <= right,
	};
	return results[test.op];
}

function dateTimeMatches(left: string, test: Infer<typeof dateTimeTest>) {
	if (!('right' in test)) return undefined;
	const [a, b] = [millisOf(left), millisOf(test.right)];
	const results = {
		equals: a === b,
		notEquals: a !== b,
		after: a > b,
		afterOrEquals: a >= b,
		before: a < b,
		beforeOrEquals: a <= b,
	};
	return results[test.op];
}

function arrayMatches(
	left: readonly unknown[],
	test: Infer<typeof arrayTest>,
	ignoreCase: boolean,
) {
	if (!('right' in test)) return undefined;
	const { right } = test;
	const has = () =>
		ignoreCase && typeof right === 'string'
			? left.some((entry) => typeof entry === 'string' && fold(entry, true) === fold(right, true))
			: left.includes(right);
	switch (test.op) {
		case 'contains':
			return has();
		case 'notContains':
			return !has();
		default: {
			const size = typeof right === 'number' ? right : 0;
			const results = {
				lengthEquals: left.length === size,
				lengthNotEquals: left.length !== size,
				lengthGt: left.length > size,
				lengthGte: left.length >= size,
				lengthLt: left.length < size,
				lengthLte: left.length <= size,
			};
			return results[test.op];
		}
	}
}

/** `exists` and `empty` read the value as the n8n filter does: null and NaN do not exist. */
function presenceMatches(condition: Condition): boolean | undefined {
	const { left, test } = condition;
	const exists = left !== undefined && left !== null && !Number.isNaN(left);
	const empty = typeof left === 'string' || Array.isArray(left) ? left.length === 0 : !exists;
	switch (test.op) {
		case 'exists':
			return exists;
		case 'notExists':
			return !exists;
		case 'empty':
			return empty;
		case 'notEmpty':
			return !empty;
		default:
			return undefined;
	}
}

export function conditionMatches(condition: Condition, ignoreCase: boolean): boolean {
	const present = presenceMatches(condition);
	if (present !== undefined) return present;
	switch (condition.type) {
		case 'string':
			return stringMatches(condition.left ?? '', condition.test, ignoreCase) ?? false;
		case 'number':
			return condition.left !== undefined && condition.left !== null
				? (numberMatches(condition.left, condition.test) ?? false)
				: false;
		case 'dateTime':
			return condition.left ? (dateTimeMatches(condition.left, condition.test) ?? false) : false;
		case 'boolean': {
			const { left, test } = condition;
			if (test.op === 'true') return left === true;
			if (test.op === 'false') return left !== true;
			return 'right' in test ? (left === test.right) === (test.op === 'equals') : false;
		}
		case 'array':
			return arrayMatches(condition.left ?? [], condition.test, ignoreCase) ?? false;
	}
}

/** An empty `all` list matches, as an empty AND does. Nested defaults are typed optional. */
export const whereMatches = ({ match = 'all', conditions, ignoreCase = false }: Where) =>
	match === 'all'
		? conditions.every((entry) => conditionMatches(entry, ignoreCase))
		: conditions.some((entry) => conditionMatches(entry, ignoreCase));
