import { describe, it, expect } from 'vitest';

import { alignRowToColumns, buildColumns, sanitizeColumnName } from './useEvalApply';

describe('useEvalApply pure helpers', () => {
	describe('sanitizeColumnName', () => {
		it('keeps already-valid names unchanged', () => {
			expect(sanitizeColumnName('input', 'fallback')).toBe('input');
			expect(sanitizeColumnName('user_name', 'fallback')).toBe('user_name');
			expect(sanitizeColumnName('Q1', 'fallback')).toBe('Q1');
		});

		it('replaces invalid characters with underscores', () => {
			expect(sanitizeColumnName('user name', 'fallback')).toBe('user_name');
			expect(sanitizeColumnName('q-1', 'fallback')).toBe('q_1');
		});

		it('strips leading non-letters', () => {
			expect(sanitizeColumnName('1column', 'fallback')).toBe('column');
			expect(sanitizeColumnName('_priv', 'fallback')).toBe('priv');
		});

		it('returns the fallback when nothing valid remains', () => {
			expect(sanitizeColumnName('___', 'fallback')).toBe('fallback');
			expect(sanitizeColumnName('123', 'fallback')).toBe('fallback');
		});

		it('truncates names longer than 63 chars', () => {
			const long = 'a'.repeat(80);
			expect(sanitizeColumnName(long, 'fallback')).toHaveLength(63);
		});
	});

	describe('buildColumns', () => {
		it('builds the union of sanitized keys across rows', () => {
			const rows = [
				{ prompt: 'a', expected: 'b' },
				{ prompt: 'c', tag: 'd' },
			];
			const columns = buildColumns(rows);
			expect(columns).toEqual([
				{ name: 'prompt', type: 'string' },
				{ name: 'expected', type: 'string' },
				{ name: 'tag', type: 'string' },
			]);
		});

		it('deduplicates keys whose sanitized form collides', () => {
			const rows = [{ 'user name': 'a', user_name: 'b' }];
			const columns = buildColumns(rows);
			expect(columns).toEqual([{ name: 'user_name', type: 'string' }]);
		});

		it('drops keys that cannot be sanitized', () => {
			const rows = [{ ___: 'a', valid: 'b' }];
			const columns = buildColumns(rows);
			expect(columns).toEqual([{ name: 'valid', type: 'string' }]);
		});
	});

	describe('alignRowToColumns', () => {
		const columns = [
			{ name: 'prompt', type: 'string' as const },
			{ name: 'expected', type: 'string' as const },
		];

		it('maps original keys to sanitized column names', () => {
			const row = { prompt: 'hi', expected: 'hello' };
			expect(alignRowToColumns(row, columns)).toEqual({ prompt: 'hi', expected: 'hello' });
		});

		it('fills missing columns with empty string', () => {
			const row = { prompt: 'hi' };
			expect(alignRowToColumns(row, columns)).toEqual({ prompt: 'hi', expected: '' });
		});

		it('coerces non-string values to string', () => {
			const row = { prompt: 42, expected: true };
			expect(alignRowToColumns(row, columns)).toEqual({ prompt: '42', expected: 'true' });
		});

		it('treats null/undefined values as empty', () => {
			const row = { prompt: null, expected: undefined };
			expect(alignRowToColumns(row, columns)).toEqual({ prompt: '', expected: '' });
		});

		it('matches via the sanitized form when source keys are not already valid', () => {
			const row = { 'q name': 'a', '1bad': 'ignored' };
			const cols = [{ name: 'q_name', type: 'string' as const }];
			expect(alignRowToColumns(row, cols)).toEqual({ q_name: 'a' });
		});
	});
});
