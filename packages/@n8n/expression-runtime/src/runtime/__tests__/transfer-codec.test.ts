import { describe, expect, it } from 'vitest';

import { prepareForGuest } from '../../bridge/guest-transfer';
import { __prepareForTransfer } from '../serialize';
import { decodeHostValue, unwrapTransferredValue } from '../transfer-codec';

describe.each([
	{
		name: 'host to guest',
		roundTrip: (value: unknown) => decodeHostValue(structuredClone(prepareForGuest(value))),
	},
	{
		name: 'guest to host',
		roundTrip: (value: unknown) =>
			unwrapTransferredValue(structuredClone(__prepareForTransfer(value))),
	},
])('transfer codec ($name)', ({ roundTrip }) => {
	describe.each([
		{ label: 'function', value: () => 1 },
		{ label: 'Promise', value: Promise.resolve(1) },
		{ label: 'symbol', value: Symbol('detail') },
	])('an Error with a $label', ({ value }) => {
		it('omits the value from fields, cause and the JSON form', () => {
			const error = Object.assign(new TypeError('original', { cause: value }), {
				detail: value,
				code: 400,
				toJSON: () => value,
			});

			const result = roundTrip(error) as typeof error;

			expect(result).toBeInstanceOf(TypeError);
			expect(result.message).toBe('original');
			expect(result.code).toBe(400);
			expect(result.detail).toBeUndefined();
			expect(result.cause).toBeUndefined();
			expect(result.toJSON()).toBeUndefined();
		});

		it('omits nested values from fields, cause and the JSON form', () => {
			const detail = { code: 400, values: [value, { value }] };
			const error = Object.assign(new Error('original', { cause: detail }), {
				detail,
				toJSON: () => detail,
			});

			const result = roundTrip(error) as typeof error;
			const expected = { code: 400, values: [undefined, { value: undefined }] };

			expect(result.detail).toStrictEqual(expected);
			expect(result.cause).toBe(result.detail);
			expect(result.toJSON()).toBe(result.detail);
		});
	});

	it('keeps non-enumerable custom fields out of the default JSON form', () => {
		const error = Object.assign(new TypeError('original'), { visible: true });
		Object.defineProperties(error, {
			code: { value: 400 },
			detail: { value: new Error('inner') },
			['__proto__']: { value: { source: 'data' } },
		});

		const result = roundTrip(error) as Error & { detail: Error };

		expect(result).toBeInstanceOf(TypeError);
		expect(Object.getOwnPropertyDescriptor(result, 'code')).toMatchObject({
			value: 400,
			enumerable: false,
		});
		expect(result.detail).toBeInstanceOf(Error);
		expect(result.detail.message).toBe('inner');
		expect(Object.getOwnPropertyDescriptor(result, '__proto__')).toMatchObject({
			value: { source: 'data' },
			enumerable: false,
		});
		expect(Object.keys(result)).toEqual(['visible']);
		expect(JSON.stringify(result)).toBe('{"visible":true}');
	});

	describe.each([true, false])('an Error with enumerable=%s getters', (enumerable) => {
		it.each(['detail', 'toJSON'])('keeps the original Error when the %s getter throws', (key) => {
			const error = Object.assign(new TypeError('original', { cause: new Error('inner') }), {
				before: 'first',
			});
			Object.defineProperties(error, {
				[key]: {
					enumerable,
					get() {
						throw new RangeError('getter failed');
					},
				},
				code: { value: 400, enumerable },
				readable: { get: () => 'available', enumerable },
			});

			const result = roundTrip(error) as typeof error;

			expect(result).toBeInstanceOf(TypeError);
			expect(result.message).toBe('original');
			expect(result.stack).toBe(error.stack);
			expect(result.cause).toBeInstanceOf(Error);
			expect(result.cause).toHaveProperty('message', 'inner');
			expect(result.before).toBe('first');
			expect(Object.hasOwn(result, key)).toBe(false);
			expect(Object.getOwnPropertyDescriptor(result, 'code')).toMatchObject({
				value: 400,
				enumerable,
			});
			expect(Object.getOwnPropertyDescriptor(result, 'readable')).toMatchObject({
				value: 'available',
				enumerable,
			});
		});
	});

	it('keeps enumerable built-in fields', () => {
		const error = new Error('original');
		Object.defineProperties(error, {
			name: { value: 'CustomError', enumerable: true },
			message: { value: 'changed', enumerable: true },
			stack: { value: 'custom stack', enumerable: true },
			cause: { value: 400, enumerable: true },
		});

		const result = roundTrip(error) as Error;

		expect(Object.keys(result)).toEqual(Object.keys(error));
		expect(JSON.stringify(result)).toBe(JSON.stringify(error));
	});

	it('serializes the current fields in the JSON form of an Error', () => {
		class EditableError extends Error {
			description: string | undefined = 'original';
			context = { attempt: 1 };

			toJSON() {
				return {
					message: this.message,
					description: this.description,
					context: this.context,
					format: 'error',
				};
			}
		}
		const original = new EditableError('original');
		const result = roundTrip(original) as EditableError;
		const first = result.toJSON();

		result.message = 'changed';
		result.description = 'x';
		result.context = { attempt: 2 };

		expect(JSON.parse(JSON.stringify(result))).toStrictEqual({
			message: 'changed',
			description: 'x',
			context: { attempt: 2 },
			format: 'error',
		});
		expect(first).toStrictEqual(original.toJSON());

		result.description = undefined;
		expect(JSON.parse(JSON.stringify(result))).not.toHaveProperty('description');
	});

	it('keeps omitted and projected fields out of the JSON form', () => {
		class ProjectedError extends Error {
			internal = 'not in JSON';
			override cause = Object.assign(new Error('inner'), { details: 'not in JSON' });

			toJSON() {
				return {
					message: this.message,
					cause: { name: this.cause.name, message: this.cause.message },
				};
			}
		}
		const original = new ProjectedError('original');
		const result = roundTrip(original) as ProjectedError;

		result.message = 'changed';
		result.internal = 'also not in JSON';

		expect(JSON.parse(JSON.stringify(result))).toStrictEqual({
			message: 'changed',
			cause: { name: 'Error', message: 'inner' },
		});
	});

	it.each([null, 'short error', ['short error']])('keeps a non-record JSON form: %j', (json) => {
		const error = Object.assign(new Error('original'), { toJSON: () => json });
		const result = roundTrip(error) as Error;

		result.message = 'changed';

		expect(JSON.stringify(result)).toBe(JSON.stringify(json));
	});

	it('updates a non-enumerable field in the JSON form', () => {
		const error = Object.assign(new Error('original'), {
			toJSON(this: Error) {
				return { message: this.message, hidden: Reflect.get(this, 'hidden') };
			},
		});
		Object.defineProperty(error, 'hidden', { value: 'from toJSON' });
		const result = roundTrip(error) as Error;

		result.message = 'changed';
		Reflect.set(result, 'hidden', 'changed hidden');

		expect(JSON.parse(JSON.stringify(result))).toStrictEqual({
			message: 'changed',
			hidden: 'changed hidden',
		});
	});

	it('rebuilds each Error in a shared chain once', () => {
		let error = new Error('leaf');
		for (let index = 0; index < 12; index++) {
			error = Object.assign(new Error('parent', { cause: error }), { previous: error });
		}

		const result = roundTrip(error) as Error & { previous: Error };
		const pending: unknown[] = [result];
		const errors = new Set<Error>();
		while (pending.length > 0) {
			const value = pending.pop();
			if (!(value instanceof Error) || errors.has(value)) continue;
			errors.add(value);
			pending.push(value.cause, Reflect.get(value, 'previous'));
		}

		expect(errors.size).toBe(13);
		expect(result.previous).toBe(result.cause);
	});

	it.each([
		{ label: 'plain', shared: { nested: new Error('nested') } },
		{ label: 'escaped', shared: { __n8nType: 'user data', nested: new Error('nested') } },
	])('keeps a shared $label object across Error fields', ({ shared }) => {
		const list = [shared];
		const inner = Object.assign(new Error('inner', { cause: shared }), { list });
		const outer = Object.assign(new Error('outer', { cause: shared }), {
			shared,
			inner,
			list,
			toJSON: () => shared,
		});

		const result = roundTrip(outer) as Error & {
			shared: typeof shared;
			inner: Error & { list: unknown[] };
			list: unknown[];
			toJSON: () => unknown;
		};

		expect(result.shared).toEqual(shared);
		expect(result.shared.nested).toBeInstanceOf(Error);
		expect(result.cause).toBe(result.shared);
		expect(result.inner.cause).toBe(result.shared);
		expect(result.inner.list).toBe(result.list);
		expect(result.list[0]).toBe(result.shared);
		expect(result.toJSON()).toBe(result.shared);
	});
});

describe('unwrapTransferredValue', () => {
	it('keeps the decoded objects local to each call', () => {
		const prepared = __prepareForTransfer(new Error('original'));

		const first = unwrapTransferredValue(prepared) as Error;
		first.message = 'changed';
		const second = unwrapTransferredValue(prepared) as Error;

		expect(second).not.toBe(first);
		expect(second.message).toBe('original');
	});
});
