import { describe, expect, it } from 'vitest';

import { isPlaceholderString, hasPlaceholderDeep, extractPlaceholderLabel } from './placeholder';

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

describe('extractPlaceholderLabel', () => {
	it('extracts label from PLACEHOLDER_VALUE format', () => {
		expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE__Your email address__>')).toBe(
			'Your email address',
		);
	});

	it('extracts label from PLACEHOLDER__: format', () => {
		expect(extractPlaceholderLabel('<__PLACEHOLDER__: some hint__>')).toBe('some hint');
	});

	it('extracts label from PLACEHOLDER__ format', () => {
		expect(extractPlaceholderLabel('<__PLACEHOLDER__api_key__>')).toBe('api_key');
	});

	it('returns undefined for non-placeholder strings', () => {
		expect(extractPlaceholderLabel('user@example.com')).toBeUndefined();
		expect(extractPlaceholderLabel('hello')).toBeUndefined();
	});

	it('returns undefined for non-string values', () => {
		expect(extractPlaceholderLabel(42)).toBeUndefined();
		expect(extractPlaceholderLabel(null)).toBeUndefined();
		expect(extractPlaceholderLabel(undefined)).toBeUndefined();
	});

	it('returns undefined for placeholder with empty label', () => {
		expect(extractPlaceholderLabel('<__PLACEHOLDER_VALUE____>')).toBeUndefined();
	});

	it('extracts label from nested object', () => {
		expect(extractPlaceholderLabel({ config: { key: '<__PLACEHOLDER_VALUE__api_key__>' } })).toBe(
			'api_key',
		);
	});

	it('extracts label from nested array', () => {
		expect(extractPlaceholderLabel(['a', '<__PLACEHOLDER_VALUE__email__>'])).toBe('email');
	});

	it('returns first label from deeply nested structure', () => {
		expect(
			extractPlaceholderLabel({
				a: { b: [{ c: '<__PLACEHOLDER_VALUE__first__>' }] },
				d: '<__PLACEHOLDER_VALUE__second__>',
			}),
		).toBe('first');
	});

	it('returns undefined when no placeholders in nested structure', () => {
		expect(extractPlaceholderLabel({ a: { b: [1, 'hello'] } })).toBeUndefined();
	});
});
