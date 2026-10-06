import { UserError, type Condition, type Where } from '@n8n/node-sdk';
import { safeRegex } from 'n8n-workflow';

type TestOf<T extends Condition['type']> = Extract<Condition, { type: T }>['test'];

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

function stringMatches(left: string, test: TestOf<'string'>, ignoreCase: boolean) {
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

function numberMatches(left: number, test: TestOf<'number'>) {
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

function dateTimeMatches(left: string, test: TestOf<'dateTime'>) {
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

function arrayMatches(left: readonly unknown[], test: TestOf<'array'>, ignoreCase: boolean) {
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
