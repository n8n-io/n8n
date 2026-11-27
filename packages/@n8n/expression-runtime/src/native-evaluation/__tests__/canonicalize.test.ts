import { DateTime, Duration } from 'luxon';

import { canonicalize } from '../canonicalize';

describe('canonicalize', () => {
	it('ignores the key order of objects', () => {
		expect(canonicalize({ a: 1, b: { c: 2, d: 3 } })).toBe(
			canonicalize({ b: { d: 3, c: 2 }, a: 1 }),
		);
	});

	it('tells different values apart', () => {
		expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: '1' }));
		expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
		expect(canonicalize(undefined)).not.toBe(canonicalize(null));
	});

	it('compares luxon values by instant and zone, not by identity', () => {
		const iso = '2026-10-07T10:00:00.000+02:00';
		const a = DateTime.fromISO(iso, { zone: 'Europe/Rome' });
		const b = DateTime.fromISO(iso, { zone: 'Europe/Rome' });

		expect(canonicalize(a)).toBe(canonicalize(b));
		expect(canonicalize(a)).not.toBe(canonicalize(a.setZone('UTC')));
		expect(canonicalize(Duration.fromObject({ hours: 1 }))).toBe('Duration(PT1H)');
	});

	it('compares dates, maps and sets by content', () => {
		expect(canonicalize(new Date(0))).toBe(canonicalize(new Date(0)));
		expect(canonicalize(new Date(0))).not.toBe(canonicalize(new Date(1)));
		expect(canonicalize(new Map([['a', 1]]))).toBe(canonicalize(new Map([['a', 1]])));
		expect(canonicalize(new Map([['a', 1]]))).not.toBe(canonicalize(new Map([['a', 2]])));
		expect(canonicalize(new Set([1]))).not.toBe(canonicalize(new Set([2])));
	});

	// The legacy engine returns `new String('ab')` as is; QuickJS returns { 0: 'a', 1: 'b' }.
	it('keeps a boxed primitive apart from a plain object with the same keys', () => {
		expect(canonicalize(new String('ab'))).toBe(canonicalize(new String('ab')));
		expect(canonicalize(new String('ab'))).not.toBe(canonicalize({ 0: 'a', 1: 'b' }));
		expect(canonicalize(new Number(5))).not.toBe(canonicalize(5));
	});

	it('reads a boxed primitive without calling a valueOf that the expression set', () => {
		const boxed = new String('ab');
		const valueOf = vi.fn(() => 'changed');
		Object.defineProperty(boxed, 'valueOf', { value: valueOf });

		expect(canonicalize(boxed)).toBe(canonicalize(new String('ab')));
		expect(valueOf).not.toHaveBeenCalled();
	});

	it('keeps NaN apart from null, which JSON would not', () => {
		expect(canonicalize(NaN)).not.toBe(canonicalize(null));
	});

	it('survives circular values', () => {
		const value: Record<string, unknown> = { a: 1 };
		value.self = value;

		expect(canonicalize(value)).toBe('{"a":1,"self":circular}');
	});

	it('treats an object key that holds undefined as absent', () => {
		expect(canonicalize({ n: 1, u: undefined })).toBe(canonicalize({ n: 1 }));
		expect(canonicalize({ n: 2, u: undefined })).not.toBe(canonicalize({ n: 1 }));
		expect(canonicalize([undefined])).not.toBe(canonicalize([]));
	});

	it('gives up on values that are too large to compare', () => {
		expect(canonicalize(new Array(20_000).fill(1))).toBeUndefined();
		expect(canonicalize('x'.repeat(2_000_000))).toBeUndefined();
		expect(canonicalize({ a: 'x'.repeat(600_000), b: 'y'.repeat(600_000) })).toBeUndefined();
	});
});
