import {
	deriveTrustedMetadataRows,
	formatTrustedMetadataFixedValue,
	parseTrustedMetadataFixedValue,
	trustedMetadataRowFromBinding,
	trustedMetadataRowsToRecord,
	trustedMetadataValueError,
} from '../utils/nodeToolTrustedMetadata';

describe('parseTrustedMetadataFixedValue', () => {
	it.each(['12345', 'null', 'true', '12345678901234567890', 'example.com', ' 42 '])(
		'keeps %j as the exact string',
		(raw) => {
			expect(parseTrustedMetadataFixedValue(raw)).toBe(raw);
		},
	);

	it('parses text that starts with { [ or "', () => {
		expect(parseTrustedMetadataFixedValue('{"a":1}')).toEqual({ a: 1 });
		expect(parseTrustedMetadataFixedValue(' [1,2]')).toEqual([1, 2]);
		expect(parseTrustedMetadataFixedValue('"12345"')).toBe('12345');
	});

	it('keeps incomplete JSON as raw text', () => {
		expect(parseTrustedMetadataFixedValue('{"a":')).toBe('{"a":');
	});
});

describe('formatTrustedMetadataFixedValue', () => {
	it('round-trips strings losslessly', () => {
		for (const value of [
			'12345',
			'null',
			'plain',
			'{"a":1}',
			'[1]',
			'"q"',
			'12345678901234567890',
		]) {
			expect(parseTrustedMetadataFixedValue(formatTrustedMetadataFixedValue(value))).toBe(value);
		}
	});

	it('round-trips objects and arrays', () => {
		for (const value of [{ a: 1 }, [1, 'x']]) {
			expect(parseTrustedMetadataFixedValue(formatTrustedMetadataFixedValue(value))).toEqual(value);
		}
	});

	it('shows a stored null as the text null', () => {
		expect(formatTrustedMetadataFixedValue(null)).toBe('null');
		expect(formatTrustedMetadataFixedValue(undefined)).toBe('');
	});
});

describe('trustedMetadataValueError', () => {
	it('flags invalid JSON only for JSON-looking text', () => {
		expect(trustedMetadataValueError({ name: 'a', mode: 'fixed', value: '{bad' })).toBe(
			'invalid-json',
		);
		expect(trustedMetadataValueError({ name: 'a', mode: 'fixed', value: 'null' })).toBeUndefined();
		expect(
			trustedMetadataValueError({ name: 'a', mode: 'expression', value: '=' }),
		).toBeUndefined();
	});
});

describe('derivation and serialization', () => {
	it('creates one row per name and drops stale stored entries', () => {
		const rows = deriveTrustedMetadataRows(['a', 'b'], {
			a: { mode: 'fixed', value: 'x' },
			stale: { mode: 'fixed', value: 'y' },
		});
		expect(rows.map((r) => r.name)).toEqual(['a', 'b']);
		expect(trustedMetadataRowsToRecord(rows)).toEqual({ a: { mode: 'fixed', value: 'x' } });
	});

	it('returns undefined when no row has a default', () => {
		expect(
			trustedMetadataRowsToRecord(deriveTrustedMetadataRows(['a'], undefined)),
		).toBeUndefined();
	});

	it('keeps an unedited stored null as null', () => {
		const rows = [trustedMetadataRowFromBinding('a', { mode: 'fixed', value: null })];
		expect(rows[0].value).toBe('null');
		expect(trustedMetadataRowsToRecord(rows)).toEqual({ a: { mode: 'fixed', value: null } });
	});

	it('turns an edited text null into the string null', () => {
		expect(trustedMetadataRowsToRecord([{ name: 'a', mode: 'fixed', value: 'null' }])).toEqual({
			a: { mode: 'fixed', value: 'null' },
		});
	});

	it('keeps large integers as strings', () => {
		expect(
			trustedMetadataRowsToRecord([{ name: 'a', mode: 'fixed', value: '12345678901234567890' }]),
		).toEqual({ a: { mode: 'fixed', value: '12345678901234567890' } });
	});

	it('treats a bare = expression as no default', () => {
		expect(
			trustedMetadataRowsToRecord([{ name: 'a', mode: 'expression', value: '=' }]),
		).toBeUndefined();
		expect(
			trustedMetadataRowsToRecord([{ name: 'a', mode: 'expression', value: '={{ $now }}' }]),
		).toEqual({ a: { mode: 'expression', value: '={{ $now }}' } });
	});
});
