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

	it('keeps a JSON field whose source property does not cross the boundary', () => {
		const error = Object.assign(new Error('original'), {
			toJSON(this: Error) {
				return { message: this.message, hidden: Reflect.get(this, 'hidden') };
			},
		});
		Object.defineProperty(error, 'hidden', { value: 'from toJSON' });
		const result = roundTrip(error) as Error;

		result.message = 'changed';

		expect(JSON.parse(JSON.stringify(result))).toStrictEqual({
			message: 'changed',
			hidden: 'from toJSON',
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
