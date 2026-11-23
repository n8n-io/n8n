import { describe, expect, it } from 'vitest';
import { formatToolData } from './toolData.utils';

describe('formatToolData', () => {
	it('pretty-prints objects and arrays as JSON', () => {
		expect(formatToolData({ a: 1, b: [true] })).toEqual({
			text: JSON.stringify({ a: 1, b: [true] }, null, 2),
			language: 'json',
		});
	});

	it('matches JSON.stringify for dates and undefined values', () => {
		const value = { date: new Date('2026-01-01T00:00:00.000Z'), skipped: undefined };
		expect(formatToolData(value).text).toBe(JSON.stringify(value, null, 2));
	});

	it('pretty-prints strings that hold a JSON object', () => {
		expect(formatToolData('{"a":1}')).toEqual({ text: '{\n  "a": 1\n}', language: 'json' });
	});

	it.each(['plain shell output', '42', 'null', '"quoted"'])(
		'keeps the string %j as plain text',
		(value) => {
			expect(formatToolData(value)).toEqual({ text: value, language: 'plaintext' });
		},
	);

	it('shows values JSON cannot represent as plain text', () => {
		expect(formatToolData(undefined)).toEqual({ text: 'undefined', language: 'plaintext' });
	});
});
