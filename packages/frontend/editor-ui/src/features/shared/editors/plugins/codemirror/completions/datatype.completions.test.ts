import { describe, test, expect } from 'vitest';
import { sortCompletionsByInput } from './datatype.completions';
import type { AliasCompletion } from 'n8n-workflow';

describe('sortCompletionsByInput', () => {
	describe('prefix match on label (order 3)', () => {
		test('should assign order 3 when input matches label prefix', () => {
			const options: AliasCompletion[] = [
				{ label: 'push()', type: 'method' },
				{ label: 'pop()', type: 'method' },
			];

			const result = sortCompletionsByInput(options, 'pu');

			expect(result[0]).toEqual({
				option: options[0],
				order: 3,
				alias: undefined,
			});
			expect(result[1]).toEqual({
				option: options[1],
				order: 0,
				alias: undefined,
			});
		});

		test('should assign order 3 for exact label match', () => {
			const options: AliasCompletion[] = [{ label: 'push()', type: 'method' }];

			const result = sortCompletionsByInput(options, 'push()');

			expect(result[0]).toEqual({
				option: options[0],
				order: 3,
				alias: undefined,
			});
		});

		test('should be case-insensitive for prefix matching', () => {
			const options: AliasCompletion[] = [{ label: 'toLowerCase()', type: 'method' }];

			const result = sortCompletionsByInput(options, 'tolower');

			expect(result[0].order).toBe(3);
		});
	});

	describe('exact alias match (order 2)', () => {
		test('should assign order 2 when input exactly matches an alias with mode "exact"', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append', mode: 'exact' }],
				},
			];

			const result = sortCompletionsByInput(options, 'append');

			expect(result[0]).toEqual({
				option: options[0],
				order: 2,
				alias: { label: 'append', mode: 'exact' },
			});
		});

		test('should prefer exact alias match over prefix label match', () => {
			const options: AliasCompletion[] = [
				{
					label: 'append()',
					type: 'method',
					alias: [{ label: 'push', mode: 'exact' }],
				},
				{
					label: 'push()',
					type: 'method',
				},
			];

			const result = sortCompletionsByInput(options, 'push');

			// First should be exact alias match (order 2) even though second has prefix match (order 3)
			// Wait, order 3 is higher than order 2, so prefix match wins
			expect(result[0].option.label).toBe('push()');
			expect(result[0].order).toBe(3);
			expect(result[1].option.label).toBe('append()');
			expect(result[1].order).toBe(2);
		});

		test('should not match if alias mode is not "exact"', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append', mode: 'prefix' }],
				},
			];

			const result = sortCompletionsByInput(options, 'append');

			// Should fall through to prefix alias match, not exact
			expect(result[0].order).toBe(1);
		});

		test('should handle multiple aliases and match the exact one', () => {
			const options: AliasCompletion[] = [
				{
					label: 'toUpperCase()',
					type: 'method',
					alias: [
						{ label: 'upper', mode: 'prefix' },
						{ label: 'UPPER', mode: 'exact' },
					],
				},
			];

			const result = sortCompletionsByInput(options, 'UPPER');

			expect(result[0].order).toBe(2);
			expect(result[0].alias).toEqual({ label: 'UPPER', mode: 'exact' });
		});
	});

	describe('prefix alias match (order 1)', () => {
		test('should assign order 1 when input matches alias prefix and mode is not "exact"', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append', mode: 'prefix' }],
				},
			];

			const result = sortCompletionsByInput(options, 'app');

			expect(result[0]).toEqual({
				option: options[0],
				order: 1,
				alias: { label: 'append', mode: 'prefix' },
			});
		});

		test('should match when alias has no mode specified (defaults to prefix)', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append' }],
				},
			];

			const result = sortCompletionsByInput(options, 'app');

			expect(result[0].order).toBe(1);
			expect(result[0].alias).toEqual({ label: 'append' });
		});

		test('should match first prefix alias when multiple exist', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append' }, { label: 'add' }],
				},
			];

			const result = sortCompletionsByInput(options, 'app');

			expect(result[0].order).toBe(1);
			expect(result[0].alias).toEqual({ label: 'append' });
		});
	});

	describe('no match (order 0)', () => {
		test('should assign order 0 when no matches found', () => {
			const options: AliasCompletion[] = [
				{ label: 'push()', type: 'method' },
				{ label: 'pop()', type: 'method' },
			];

			const result = sortCompletionsByInput(options, 'xyz');

			expect(result[0].order).toBe(0);
			expect(result[1].order).toBe(0);
		});

		test('should handle empty alias array', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [],
				},
			];

			const result = sortCompletionsByInput(options, 'app');

			expect(result[0].order).toBe(0);
		});
	});

	describe('sorting behavior', () => {
		test('should sort by order descending (highest first)', () => {
			const options: AliasCompletion[] = [
				{
					label: 'slice()',
					type: 'method',
				},
				{
					label: 'append()',
					type: 'method',
					alias: [{ label: 'push', mode: 'exact' }],
				},
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'add' }],
				},
				{
					label: 'map()',
					type: 'method',
				},
			];

			const result = sortCompletionsByInput(options, 'push');

			// push() has prefix match on label (order 3) - should be first
			// append() has exact alias match (order 2) - should be second
			// slice() and map() have no match (order 0) - should be last
			expect(result[0].option.label).toBe('push()'); // order 3
			expect(result[0].order).toBe(3);
			expect(result[1].option.label).toBe('append()'); // order 2
			expect(result[1].order).toBe(2);
			expect(result[2].option.label).toBe('slice()'); // order 0
			expect(result[2].order).toBe(0);
			expect(result[3].option.label).toBe('map()'); // order 0
			expect(result[3].order).toBe(0);
		});

		test('should maintain order for items with same priority', () => {
			const options: AliasCompletion[] = [
				{ label: 'pop()', type: 'method' },
				{ label: 'pow()', type: 'method' },
			];

			const result = sortCompletionsByInput(options, 'po');

			expect(result[0].order).toBe(3);
			expect(result[1].order).toBe(3);
			// Original order should be preserved for same priority
			expect(result[0].option.label).toBe('pop()');
			expect(result[1].option.label).toBe('pow()');
		});
	});

	describe('complex scenarios', () => {
		test('should handle all order types together', () => {
			const options: AliasCompletion[] = [
				{
					label: 'splice()',
					type: 'method',
					alias: [{ label: 'remove', mode: 'exact' }],
				},
				{
					label: 'split()',
					type: 'method',
					alias: [{ label: 'explode' }],
				},
				{
					label: 'slice()',
					type: 'method',
				},
				{
					label: 'concat()',
					type: 'method',
				},
			];

			const result = sortCompletionsByInput(options, 'spl');

			// split() and splice() have prefix match on label (order 3)
			// Others have no match (order 0)
			expect(result[0].order).toBe(3);
			expect(result[1].order).toBe(3);
			expect(result[2].order).toBe(0);
			expect(result[3].order).toBe(0);
		});

		test('should prioritize label over alias', () => {
			const options: AliasCompletion[] = [
				{
					label: 'append()',
					type: 'method',
					alias: [{ label: 'push' }],
				},
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append' }],
				},
			];

			const result = sortCompletionsByInput(options, 'push');

			// push() has prefix match on label (order 3) - should be first
			// append() has prefix alias match (order 1) - should be second
			expect(result[0].option.label).toBe('push()');
			expect(result[0].order).toBe(3);
			expect(result[1].option.label).toBe('append()');
			expect(result[1].order).toBe(1);
		});

		test('should handle empty input string', () => {
			const options: AliasCompletion[] = [
				{ label: 'push()', type: 'method' },
				{ label: 'pop()', type: 'method' },
			];

			const result = sortCompletionsByInput(options, '');

			// Empty string should match all as prefix
			expect(result[0].order).toBe(3);
			expect(result[1].order).toBe(3);
		});

		test('should handle empty options array', () => {
			const options: AliasCompletion[] = [];

			const result = sortCompletionsByInput(options, 'test');

			expect(result).toEqual([]);
		});

		test('should handle options without type property', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					alias: [{ label: 'append' }],
				},
			];

			const result = sortCompletionsByInput(options, 'app');

			expect(result[0].order).toBe(1);
		});

		test('should work with real-world array method aliases', () => {
			const options: AliasCompletion[] = [
				{
					label: 'push()',
					type: 'method',
					alias: [{ label: 'append' }, { label: 'add' }],
				},
				{
					label: 'pop()',
					type: 'method',
					alias: [{ label: 'remove' }],
				},
				{
					label: 'concat()',
					type: 'method',
					alias: [{ label: 'extend' }],
				},
				{
					label: 'includes()',
					type: 'method',
					alias: [{ label: 'contains' }],
				},
			];

			const result = sortCompletionsByInput(options, 'app');

			// push() should match via its 'append' alias (order 1)
			expect(result[0].option.label).toBe('push()');
			expect(result[0].order).toBe(1);
			expect(result[0].alias?.label).toBe('append');
		});
	});
});
