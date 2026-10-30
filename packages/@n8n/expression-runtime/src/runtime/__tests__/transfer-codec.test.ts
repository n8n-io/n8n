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
