import { describe, expect, it } from 'vitest';
import {
	parseModelString,
	modelToString,
	parseProvider,
	sanitizeModelId,
} from '../utils/model-string';

describe('model-string utils', () => {
	describe('parseModelString', () => {
		it('splits provider/name on first slash', () => {
			expect(parseModelString('openai/gpt-4o')).toEqual({ provider: 'openai', name: 'gpt-4o' });
		});
		it('keeps subsequent slashes in the name', () => {
			expect(parseModelString('google/models/gemini-1.5-pro')).toEqual({
				provider: 'google',
				name: 'models/gemini-1.5-pro',
			});
		});
		it('returns null when no slash', () => {
			expect(parseModelString('gpt-4o')).toBeNull();
		});
		it('returns null when slash is leading', () => {
			expect(parseModelString('/name')).toBeNull();
		});
	});

	describe('parseProvider', () => {
		it('extracts from string form', () => {
			expect(parseProvider('anthropic/claude-sonnet-4-6')).toBe('anthropic');
		});
		it('reads object form', () => {
			expect(parseProvider({ provider: 'openai', name: 'gpt-4o' })).toBe('openai');
		});
		it('returns empty for undefined', () => {
			expect(parseProvider(undefined)).toBe('');
		});
		it('returns empty for object with null provider', () => {
			expect(parseProvider({ provider: null, name: 'x' })).toBe('');
		});
	});

	describe('sanitizeModelId', () => {
		it('strips models/ prefix for google', () => {
			expect(sanitizeModelId('google', 'models/gemini-1.5-pro')).toBe('gemini-1.5-pro');
		});
		it('leaves other providers untouched', () => {
			expect(sanitizeModelId('openai', 'gpt-4o')).toBe('gpt-4o');
		});
		it('does not touch google ids without the prefix', () => {
			expect(sanitizeModelId('google', 'gemini-pro')).toBe('gemini-pro');
		});
	});

	describe('modelToString', () => {
		it('passes a string through', () => {
			expect(modelToString('openai/gpt-4o')).toBe('openai/gpt-4o');
		});
		it('joins object form with slash', () => {
			expect(modelToString({ provider: 'anthropic', name: 'claude-sonnet-4-6' })).toBe(
				'anthropic/claude-sonnet-4-6',
			);
		});
		it('returns empty string for undefined', () => {
			expect(modelToString(undefined)).toBe('');
		});
		it('treats nullish parts as empty', () => {
			expect(modelToString({ provider: null, name: 'x' })).toBe('/x');
		});
	});
});
