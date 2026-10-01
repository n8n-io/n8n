import { describe, expect, it } from 'vitest';

import {
	isPlaceholderString,
	hasPlaceholderDeep,
	isPlaceholderValue,
	extractPlaceholderLabels,
	findPlaceholderDetails,
	formatPlaceholderPath,
} from './placeholder';

describe('isPlaceholderString', () => {
	it('returns true for a valid placeholder sentinel', () => {
		expect(isPlaceholderString('<__PLACEHOLDER_VALUE__Your email address__>')).toBe(true);
	});

	it('returns false for a regular string', () => {
		expect(isPlaceholderString('user@example.com')).toBe(false);
	});

	it('returns false for non-string values', () => {
		expect(isPlaceholderString(42)).toBe(false);
		expect(isPlaceholderString(null)).toBe(false);
		expect(isPlaceholderString(undefined)).toBe(false);
		expect(isPlaceholderString({})).toBe(false);
	});

	it('returns false for partial matches', () => {
		expect(isPlaceholderString('<__PLACEHOLDER_VALUE__no suffix')).toBe(false);
		expect(isPlaceholderString('no prefix__>')).toBe(false);
	});
});

describe('hasPlaceholderDeep', () => {
	it('detects placeholder in a flat string', () => {
		expect(hasPlaceholderDeep('<__PLACEHOLDER_VALUE__hint__>')).toBe(true);
	});

	it('returns false for a regular string', () => {
		expect(hasPlaceholderDeep('hello')).toBe(false);
	});

	it('detects placeholder nested in an array', () => {
		expect(hasPlaceholderDeep(['a', '<__PLACEHOLDER_VALUE__hint__>'])).toBe(true);
	});

	it('detects placeholder nested in an object', () => {
		expect(hasPlaceholderDeep({ to: '<__PLACEHOLDER_VALUE__email__>' })).toBe(true);
	});

	it('detects deeply nested placeholder', () => {
		expect(hasPlaceholderDeep({ a: { b: [{ c: '<__PLACEHOLDER_VALUE__x__>' }] } })).toBe(true);
	});

	it('returns false when no placeholders exist', () => {
		expect(hasPlaceholderDeep({ a: { b: [1, 'hello', null] } })).toBe(false);
	});

	it('returns false for null and undefined', () => {
		expect(hasPlaceholderDeep(null)).toBe(false);
		expect(hasPlaceholderDeep(undefined)).toBe(false);
	});
});

describe('isPlaceholderValue', () => {
	it('returns true for a placeholder string', () => {
		expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__hint__>')).toBe(true);
	});

	it('returns true for alternative placeholder format', () => {
		expect(isPlaceholderValue('<__PLACEHOLDER__api_key__>')).toBe(true);
	});

	it('returns false for regular strings', () => {
		expect(isPlaceholderValue('hello')).toBe(false);
	});

	it('returns false for non-string values', () => {
		expect(isPlaceholderValue(42)).toBe(false);
		expect(isPlaceholderValue(null)).toBe(false);
	});
});

describe('extractPlaceholderLabels', () => {
	it('extracts label from PLACEHOLDER_VALUE format', () => {
		expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE__Your email address__>')).toEqual([
			'Your email address',
		]);
	});

	it('extracts label from PLACEHOLDER__: format', () => {
		expect(extractPlaceholderLabels('<__PLACEHOLDER__: some hint__>')).toEqual(['some hint']);
	});

	it('extracts label from PLACEHOLDER__ format', () => {
		expect(extractPlaceholderLabels('<__PLACEHOLDER__api_key__>')).toEqual(['api_key']);
	});

	it('returns empty array for non-placeholder strings', () => {
		expect(extractPlaceholderLabels('user@example.com')).toEqual([]);
	});

	it('returns empty array for non-string values', () => {
		expect(extractPlaceholderLabels(42)).toEqual([]);
		expect(extractPlaceholderLabels(null)).toEqual([]);
	});

	it('returns empty array for placeholder with empty label', () => {
		expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE____>')).toEqual([]);
	});

	it('extracts multiple labels from embedded placeholders', () => {
		const code =
			'const key = "<__PLACEHOLDER_VALUE__api_key__>"; const url = "<__PLACEHOLDER_VALUE__base_url__>";';
		expect(extractPlaceholderLabels(code)).toEqual(['api_key', 'base_url']);
	});
});

describe('findPlaceholderDetails', () => {
	it('finds placeholder in a flat string', () => {
		expect(findPlaceholderDetails('<__PLACEHOLDER_VALUE__email__>')).toEqual([
			{ path: [], label: 'email' },
		]);
	});

	it('finds placeholder nested in an object', () => {
		expect(findPlaceholderDetails({ config: { key: '<__PLACEHOLDER_VALUE__api_key__>' } })).toEqual(
			[{ path: ['config', 'key'], label: 'api_key' }],
		);
	});

	it('finds placeholder nested in an array', () => {
		expect(findPlaceholderDetails(['a', '<__PLACEHOLDER_VALUE__email__>'])).toEqual([
			{ path: ['[1]'], label: 'email' },
		]);
	});

	it('finds multiple placeholders in deeply nested structure', () => {
		const result = findPlaceholderDetails({
			a: { b: [{ c: '<__PLACEHOLDER_VALUE__first__>' }] },
			d: '<__PLACEHOLDER_VALUE__second__>',
		});
		expect(result).toEqual([
			{ path: ['a', 'b', '[0]', 'c'], label: 'first' },
			{ path: ['d'], label: 'second' },
		]);
	});

	it('returns empty array when no placeholders exist', () => {
		expect(findPlaceholderDetails({ a: { b: [1, 'hello'] } })).toEqual([]);
	});
});

describe('formatPlaceholderPath', () => {
	it('returns "parameters" for empty path', () => {
		expect(formatPlaceholderPath([])).toBe('parameters');
	});

	it('formats simple path', () => {
		expect(formatPlaceholderPath(['config', 'key'])).toBe('config.key');
	});

	it('preserves array indices', () => {
		expect(formatPlaceholderPath(['items', '[0]', 'value'])).toBe('items[0].value');
	});
});
