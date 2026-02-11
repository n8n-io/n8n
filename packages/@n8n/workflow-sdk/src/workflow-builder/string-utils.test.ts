import { describe, it, expect } from '@jest/globals';

import {
	JS_METHODS,
	filterMethodsFromPath,
	parseVersion,
	isPlaceholderValue,
	isResourceLocatorLike,
	normalizeResourceLocators,
	escapeNewlinesInStringLiterals,
	escapeNewlinesInExpressionStrings,
	generateDeterministicNodeId,
} from './string-utils';

describe('workflow-builder/string-utils', () => {
	describe('JS_METHODS', () => {
		it('includes common array methods', () => {
			expect(JS_METHODS.has('includes')).toBe(true);
			expect(JS_METHODS.has('filter')).toBe(true);
			expect(JS_METHODS.has('map')).toBe(true);
			expect(JS_METHODS.has('reduce')).toBe(true);
		});

		it('includes common string methods', () => {
			expect(JS_METHODS.has('toLowerCase')).toBe(true);
			expect(JS_METHODS.has('toUpperCase')).toBe(true);
			expect(JS_METHODS.has('split')).toBe(true);
			expect(JS_METHODS.has('slice')).toBe(true);
		});

		it('includes length property', () => {
			expect(JS_METHODS.has('length')).toBe(true);
		});
	});

	describe('filterMethodsFromPath', () => {
		it('removes trailing JS methods from path', () => {
			expect(filterMethodsFromPath(['output', 'includes'])).toEqual(['output']);
		});

		it('removes multiple trailing methods', () => {
			expect(filterMethodsFromPath(['output', 'toLowerCase', 'includes'])).toEqual(['output']);
		});

		it('preserves non-method path segments', () => {
			expect(filterMethodsFromPath(['data', 'items', 'value'])).toEqual(['data', 'items', 'value']);
		});

		it('returns empty array if all are methods', () => {
			expect(filterMethodsFromPath(['includes', 'map'])).toEqual([]);
		});

		it('handles empty array', () => {
			expect(filterMethodsFromPath([])).toEqual([]);
		});
	});

	describe('parseVersion', () => {
		it('returns 1 for undefined version', () => {
			expect(parseVersion(undefined)).toBe(1);
		});

		it('returns 1 for empty string', () => {
			expect(parseVersion('')).toBe(1);
		});

		it('parses version with v prefix', () => {
			expect(parseVersion('v2')).toBe(2);
		});

		it('parses version without v prefix', () => {
			expect(parseVersion('3')).toBe(3);
		});

		it('parses decimal version', () => {
			expect(parseVersion('1.5')).toBe(1.5);
		});

		it('parses version with v prefix and decimal', () => {
			expect(parseVersion('v2.1')).toBe(2.1);
		});

		it('returns number directly when given a number', () => {
			expect(parseVersion(1.3)).toBe(1.3);
			expect(parseVersion(2)).toBe(2);
		});
	});

	describe('isPlaceholderValue', () => {
		it('returns true for placeholder string', () => {
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__test__>')).toBe(true);
		});

		it('returns false for regular string', () => {
			expect(isPlaceholderValue('regular string')).toBe(false);
		});

		it('returns false for non-string values', () => {
			expect(isPlaceholderValue(123)).toBe(false);
			expect(isPlaceholderValue(null)).toBe(false);
			expect(isPlaceholderValue(undefined)).toBe(false);
		});

		it('returns false for string that only starts with prefix', () => {
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__')).toBe(false);
		});
	});

	describe('isResourceLocatorLike', () => {
		it('returns true for object with mode and value', () => {
			expect(isResourceLocatorLike({ mode: 'list', value: 'test' })).toBe(true);
		});

		it('returns false for object without mode', () => {
			expect(isResourceLocatorLike({ value: 'test' })).toBe(false);
		});

		it('returns false for object without value', () => {
			expect(isResourceLocatorLike({ mode: 'list' })).toBe(false);
		});

		it('returns false for null', () => {
			expect(isResourceLocatorLike(null)).toBe(false);
		});

		it('returns false for array', () => {
			expect(isResourceLocatorLike([{ mode: 'list', value: 'test' }])).toBe(false);
		});

		it('returns false for primitive', () => {
			expect(isResourceLocatorLike('string')).toBe(false);
			expect(isResourceLocatorLike(123)).toBe(false);
		});
	});

	describe('normalizeResourceLocators', () => {
		it('adds __rl: true to resource locator objects', () => {
			const params = { field: { mode: 'list', value: 'test' } };
			const result = normalizeResourceLocators(params);
			expect(result).toEqual({ field: { __rl: true, mode: 'list', value: 'test' } });
		});

		it('clears placeholder value when mode is list', () => {
			const params = { field: { mode: 'list', value: '<__PLACEHOLDER_VALUE__test__>' } };
			const result = normalizeResourceLocators(params) as Record<string, Record<string, unknown>>;
			expect(result.field.value).toBe('');
		});

		it('handles nested objects', () => {
			const params = { outer: { inner: { mode: 'id', value: '123' } } };
			const result = normalizeResourceLocators(params) as Record<
				string,
				Record<string, Record<string, unknown>>
			>;
			expect(result.outer.inner.__rl).toBe(true);
		});

		it('handles arrays with nested resource locators', () => {
			// Resource locators in arrays need to be in object properties to get tagged
			const params = [{ field: { mode: 'url', value: 'http://test.com' } }];
			const result = normalizeResourceLocators(params) as Array<
				Record<string, Record<string, unknown>>
			>;
			expect(result[0].field.__rl).toBe(true);
		});

		it('returns primitive unchanged', () => {
			expect(normalizeResourceLocators('test')).toBe('test');
			expect(normalizeResourceLocators(123)).toBe(123);
			expect(normalizeResourceLocators(null)).toBe(null);
		});
	});

	describe('escapeNewlinesInStringLiterals', () => {
		it('escapes newlines in double-quoted strings', () => {
			const code = '"line1\nline2"';
			expect(escapeNewlinesInStringLiterals(code)).toBe('"line1\\nline2"');
		});

		it('escapes newlines in single-quoted strings', () => {
			const code = "'line1\nline2'";
			expect(escapeNewlinesInStringLiterals(code)).toBe("'line1\\nline2'");
		});

		it('preserves template literals unchanged', () => {
			const code = '`line1\nline2`';
			expect(escapeNewlinesInStringLiterals(code)).toBe('`line1\nline2`');
		});

		it('does not double-escape already escaped newlines', () => {
			const code = '"already\\nescaped"';
			expect(escapeNewlinesInStringLiterals(code)).toBe('"already\\nescaped"');
		});

		it('preserves regex literals', () => {
			const code = 'const re = /test/g';
			expect(escapeNewlinesInStringLiterals(code)).toBe('const re = /test/g');
		});
	});

	describe('escapeNewlinesInExpressionStrings', () => {
		it('escapes newlines in {{ }} blocks', () => {
			const value = '={{ "line1\nline2" }}';
			expect(escapeNewlinesInExpressionStrings(value)).toBe('={{ "line1\\nline2" }}');
		});

		it('only processes strings starting with =', () => {
			const value = '{{ "no equals" }}';
			expect(escapeNewlinesInExpressionStrings(value)).toBe('{{ "no equals" }}');
		});

		it('handles nested objects recursively', () => {
			const value = { param: '={{ "test\nvalue" }}' };
			const result = escapeNewlinesInExpressionStrings(value) as Record<string, string>;
			expect(result.param).toBe('={{ "test\\nvalue" }}');
		});

		it('handles arrays recursively', () => {
			const value = ['={{ "test\nvalue" }}'];
			const result = escapeNewlinesInExpressionStrings(value) as string[];
			expect(result[0]).toBe('={{ "test\\nvalue" }}');
		});

		it('returns non-string primitives unchanged', () => {
			expect(escapeNewlinesInExpressionStrings(123)).toBe(123);
			expect(escapeNewlinesInExpressionStrings(null)).toBe(null);
		});
	});

	describe('generateDeterministicNodeId', () => {
		it('generates UUID format', () => {
			const id = generateDeterministicNodeId('wf1', 'type', 'name');
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		});

		it('is deterministic for same inputs', () => {
			const id1 = generateDeterministicNodeId('wf1', 'type', 'name');
			const id2 = generateDeterministicNodeId('wf1', 'type', 'name');
			expect(id1).toBe(id2);
		});

		it('produces different IDs for different inputs', () => {
			const id1 = generateDeterministicNodeId('wf1', 'type', 'name1');
			const id2 = generateDeterministicNodeId('wf1', 'type', 'name2');
			expect(id1).not.toBe(id2);
		});
	});
});
