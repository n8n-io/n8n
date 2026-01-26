import { describe, it, expect } from 'vitest';
import {
	extractPlaceholderLabel,
	findPlaceholderDetails,
	formatPlaceholderPath,
	isPlaceholderValue,
} from './useBuilderTodos';

describe('useBuilderTodos', () => {
	describe('extractPlaceholderLabel', () => {
		it('returns null for non-string values', () => {
			expect(extractPlaceholderLabel(123)).toBeNull();
			expect(extractPlaceholderLabel(true)).toBeNull();
			expect(extractPlaceholderLabel(null)).toBeNull();
			expect(extractPlaceholderLabel(undefined)).toBeNull();
			expect(extractPlaceholderLabel({})).toBeNull();
			expect(extractPlaceholderLabel([])).toBeNull();
		});

		it('returns null for strings without placeholder format', () => {
			expect(extractPlaceholderLabel('regular string')).toBeNull();
			expect(extractPlaceholderLabel('https://example.com')).toBeNull();
			expect(extractPlaceholderLabel('')).toBeNull();
		});

		it('returns null for partial placeholder format', () => {
			expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE__missing end')).toBeNull();
			expect(extractPlaceholderLabel('PLACEHOLDER__test__>')).toBeNull();
			expect(extractPlaceholderLabel('__PLACEHOLDER_VALUE__test__>')).toBeNull();
		});

		it('returns null for empty label', () => {
			expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE____>')).toBeNull();
		});

		it('returns null for whitespace-only label', () => {
			expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE__   __>')).toBeNull();
		});

		it('extracts label from valid placeholder', () => {
			expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE__Enter URL__>')).toBe('Enter URL');
			expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE__API Key__>')).toBe('API Key');
		});

		it('trims whitespace from label', () => {
			expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE__  Enter URL  __>')).toBe('Enter URL');
		});
	});

	describe('findPlaceholderDetails', () => {
		it('returns empty array for primitive non-placeholder values', () => {
			expect(findPlaceholderDetails('regular string')).toEqual([]);
			expect(findPlaceholderDetails(123)).toEqual([]);
			expect(findPlaceholderDetails(true)).toEqual([]);
			expect(findPlaceholderDetails(null)).toEqual([]);
		});

		it('returns empty array for empty object', () => {
			expect(findPlaceholderDetails({})).toEqual([]);
		});

		it('returns empty array for empty array', () => {
			expect(findPlaceholderDetails([])).toEqual([]);
		});

		it('finds placeholder at root level', () => {
			const result = findPlaceholderDetails('<__PLACEHOLDER_VALUE__Enter URL__>');
			expect(result).toEqual([{ path: [], label: 'Enter URL' }]);
		});

		it('finds placeholder in simple object', () => {
			const result = findPlaceholderDetails({
				url: '<__PLACEHOLDER_VALUE__Enter URL__>',
			});
			expect(result).toEqual([{ path: ['url'], label: 'Enter URL' }]);
		});

		it('finds multiple placeholders in object', () => {
			const result = findPlaceholderDetails({
				url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				body: '<__PLACEHOLDER_VALUE__Enter Body__>',
			});
			expect(result).toHaveLength(2);
			expect(result).toContainEqual({ path: ['url'], label: 'Enter URL' });
			expect(result).toContainEqual({ path: ['body'], label: 'Enter Body' });
		});

		it('finds placeholder in nested object', () => {
			const result = findPlaceholderDetails({
				options: {
					headers: {
						authorization: '<__PLACEHOLDER_VALUE__Enter API Key__>',
					},
				},
			});
			expect(result).toEqual([
				{ path: ['options', 'headers', 'authorization'], label: 'Enter API Key' },
			]);
		});

		it('finds placeholder in array', () => {
			const result = findPlaceholderDetails([
				'regular value',
				'<__PLACEHOLDER_VALUE__Enter Value__>',
			]);
			expect(result).toEqual([{ path: ['[1]'], label: 'Enter Value' }]);
		});

		it('finds placeholder in array of objects', () => {
			const result = findPlaceholderDetails({
				headers: [
					{ name: 'Content-Type', value: 'application/json' },
					{ name: 'Authorization', value: '<__PLACEHOLDER_VALUE__Enter Token__>' },
				],
			});
			expect(result).toEqual([{ path: ['headers', '[1]', 'value'], label: 'Enter Token' }]);
		});

		it('finds placeholders in mixed structure', () => {
			const result = findPlaceholderDetails({
				url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				options: {
					items: [{ key: '<__PLACEHOLDER_VALUE__Enter Key__>' }, { value: 'static' }],
				},
			});
			expect(result).toHaveLength(2);
			expect(result).toContainEqual({ path: ['url'], label: 'Enter URL' });
			expect(result).toContainEqual({
				path: ['options', 'items', '[0]', 'key'],
				label: 'Enter Key',
			});
		});

		it('ignores non-placeholder strings in object', () => {
			const result = findPlaceholderDetails({
				url: 'https://example.com',
				method: 'GET',
				placeholder: '<__PLACEHOLDER_VALUE__Enter Value__>',
			});
			expect(result).toEqual([{ path: ['placeholder'], label: 'Enter Value' }]);
		});

		it('handles custom starting path', () => {
			const result = findPlaceholderDetails({ url: '<__PLACEHOLDER_VALUE__Enter URL__>' }, [
				'parameters',
			]);
			expect(result).toEqual([{ path: ['parameters', 'url'], label: 'Enter URL' }]);
		});
	});

	describe('formatPlaceholderPath', () => {
		it('returns "parameters" for empty path', () => {
			expect(formatPlaceholderPath([])).toBe('parameters');
		});

		it('formats single segment path', () => {
			expect(formatPlaceholderPath(['url'])).toBe('url');
		});

		it('formats multi-segment path with dot notation', () => {
			expect(formatPlaceholderPath(['options', 'headers', 'authorization'])).toBe(
				'options.headers.authorization',
			);
		});

		it('formats path with array indices without leading dot', () => {
			expect(formatPlaceholderPath(['headers', '[0]', 'value'])).toBe('headers[0].value');
		});

		it('formats path starting with array index', () => {
			expect(formatPlaceholderPath(['[0]', 'key'])).toBe('[0].key');
		});

		it('formats path with multiple array indices', () => {
			expect(formatPlaceholderPath(['items', '[0]', 'options', '[1]', 'value'])).toBe(
				'items[0].options[1].value',
			);
		});

		it('formats path with consecutive array indices', () => {
			expect(formatPlaceholderPath(['matrix', '[0]', '[1]'])).toBe('matrix[0][1]');
		});
	});

	describe('isPlaceholderValue', () => {
		it('returns true for placeholder values', () => {
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__API endpoint URL__>')).toBe(true);
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__label__>')).toBe(true);
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE____>')).toBe(true);
		});

		it('returns false for non-placeholder strings', () => {
			expect(isPlaceholderValue('regular string')).toBe(false);
			expect(isPlaceholderValue('')).toBe(false);
			expect(isPlaceholderValue('https://api.example.com')).toBe(false);
			expect(isPlaceholderValue('={{ $json.field }}')).toBe(false);
		});

		it('returns false for malformed placeholders missing suffix', () => {
			// Has prefix but missing suffix - should be false
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__missing suffix')).toBe(false);
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__some text without end')).toBe(false);
		});

		it('returns false for malformed placeholders missing prefix', () => {
			// Has suffix but missing prefix - should be false
			expect(isPlaceholderValue('missing prefix__>')).toBe(false);
			expect(isPlaceholderValue('some text without start__>')).toBe(false);
		});

		it('returns false for non-string values', () => {
			expect(isPlaceholderValue(123)).toBe(false);
			expect(isPlaceholderValue(null)).toBe(false);
			expect(isPlaceholderValue(undefined)).toBe(false);
			expect(isPlaceholderValue({ key: 'value' })).toBe(false);
			expect(isPlaceholderValue(['array'])).toBe(false);
			expect(isPlaceholderValue(true)).toBe(false);
		});
	});
});
