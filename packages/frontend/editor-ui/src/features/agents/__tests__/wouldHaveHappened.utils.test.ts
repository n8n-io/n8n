import { describe, expect, it } from 'vitest';

import {
	clampText,
	formatPreviewDate,
	formatPreviewValue,
	presentList,
	presentText,
	previewEntries,
} from '../components/testRun/wouldHaveHappened.utils';

describe('wouldHaveHappened utils', () => {
	it('drops blank text and list items', () => {
		expect(presentText('  ')).toBeUndefined();
		expect(presentText(undefined)).toBeUndefined();
		expect(presentText('Hi')).toBe('Hi');
		expect(presentList(['a@example.com', ' ', '', ' b@example.com '])).toEqual([
			'a@example.com',
			'b@example.com',
		]);
		expect(presentList(undefined)).toEqual([]);
	});

	it.each([
		[undefined, undefined],
		[null, undefined],
		['', undefined],
		[{}, undefined],
		[[], undefined],
		[0, '0'],
		[false, 'false'],
		['text', 'text'],
		[['a', 1, null], '["a",1,null]'],
		[{ a: 1 }, '{\n  "a": 1\n}'],
		[[{ a: 1 }], '[\n  {\n    "a": 1\n  }\n]'],
	])('formats %j as %j', (value, expected) => {
		expect(formatPreviewValue(value)).toBe(expected);
	});

	it('handles values that cannot be serialized', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(formatPreviewValue(circular)).toBeUndefined();
	});

	it('keeps entry order and drops empty values', () => {
		expect(previewEntries({ b: 'two', a: undefined, c: 3 })).toEqual([
			{ key: 'b', value: 'two' },
			{ key: 'c', value: '3' },
		]);
	});

	it('formats ISO dates and leaves other text unchanged', () => {
		expect(formatPreviewDate('2026-11-14', 'en-US')).toBe('Nov 14, 2026');
		expect(formatPreviewDate('tomorrow at 10', 'en-US')).toBe('tomorrow at 10');
		expect(formatPreviewDate('2026-13-45', 'en-US')).toBe('2026-13-45');
		// Would otherwise roll over to March 2.
		expect(formatPreviewDate('2026-02-30', 'en-US')).toBe('2026-02-30');
		expect(formatPreviewDate('2026-02-30T10:00:00Z', 'en-US')).toBe('2026-02-30T10:00:00Z');
		// The repeated hour when daylight saving ends stays two different times.
		const first = formatPreviewDate('2026-11-01T01:30:00-04:00', 'en-US');
		const second = formatPreviewDate('2026-11-01T01:30:00-05:00', 'en-US');
		expect(first).not.toBe(second);
		expect(first).toMatch(/[A-Z]{2,}|GMT/);
		expect(formatPreviewDate('2028-02-29', 'en-US')).toBe('Feb 29, 2028');
		expect(formatPreviewDate('   ')).toBeUndefined();
	});

	it('clamps by lines and characters', () => {
		expect(clampText('short', 10, 2)).toEqual({ text: 'short', clamped: false });
		expect(clampText('a\nb\nc', 100, 2)).toEqual({ text: 'a\nb…', clamped: true });
		expect(clampText('abcdefghij', 4, 2)).toEqual({ text: 'abcd…', clamped: true });
	});

	it('keeps a date value and never throws on values JSON cannot hold', () => {
		expect(previewEntries({ when: new Date('2026-11-14T00:00:00Z') })).toEqual([
			{ key: 'when', value: '2026-11-14T00:00:00.000Z' },
		]);
		expect(previewEntries({ payload: { id: 1n } })).toEqual([
			{ key: 'payload', value: '{\n  "id": "1"\n}' },
		]);
		expect(previewEntries({ rows: [{ id: 2n }] })).toEqual([
			{ key: 'rows', value: '[\n  {\n    "id": "2"\n  }\n]' },
		]);
		expect(() => previewEntries({ values: [1n, null] })).not.toThrow();
		expect(previewEntries({ values: [1n, null] })).toEqual([
			{ key: 'values', value: '["1",null]' },
		]);
	});
});
