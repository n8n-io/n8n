/**
 * Test suite for locale utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock the format module before importing
vi.mock('../format', () => ({
	default: vi.fn(() =>
		vi.fn((template, ...args) => {
			// Simple format implementation for testing
			if (args.length === 0) return template;
			return template.replace(/\{(\d+)\}/g, (match: string, index: string) => {
				const idx = parseInt(index);
				return args[0]?.[idx] ?? match;
			});
		}),
	),
}));

vi.mock('../lang/en', () => ({
	default: {
		'test.key': 'Test Value',
		'test.format': 'Hello {0}',
		'test.multiple': 'User {0} has {1} items',
		simple: 'Simple text',
	},
}));

describe('locale utilities', () => {
	let t: any, use: any, i18n: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Re-import to get fresh instance
		const module = await import('../index');
		t = module.t;
		use = module.use;
		i18n = module.i18n;
	});

	describe('t function', () => {
		describe('Basic Translation', () => {
			it('should translate existing keys', () => {
				const result = t('test.key');
				expect(result).toBe('Test Value');
			});

			it('should return empty string for non-existent keys', () => {
				const result = t('non.existent.key');
				expect(result).toBe('');
			});

			it('should handle simple text keys', () => {
				const result = t('simple');
				expect(result).toBe('Simple text');
			});

			it('should handle nested path keys', () => {
				const result = t('test.format');
				expect(result).toBe('Hello {0}');
			});
		});

		describe('Translation with Options', () => {
			it('should format template with single option', () => {
				const result = t('test.format', ['World']);
				expect(result).toBe('Hello World');
			});

			it('should format template with multiple options', () => {
				const result = t('test.multiple', ['John', '5']);
				expect(result).toBe('User John has 5 items');
			});

			it('should handle empty options array', () => {
				const result = t('test.key', []);
				expect(result).toBe('Test Value');
			});

			it('should handle undefined options', () => {
				const result = t('test.key', undefined);
				expect(result).toBe('Test Value');
			});

			it('should handle null options', () => {
				const result = t('test.key', null);
				expect(result).toBe('Test Value');
			});
		});

		describe('i18nHandler Integration', () => {
			it('should use i18nHandler when available', () => {
				const mockHandler = vi.fn().mockReturnValue('Handler result');
				i18n(mockHandler);

				const result = t('any.key', ['option']);

				expect(mockHandler).toHaveBeenCalledWith('any.key', ['option']);
				expect(result).toBe('Handler result');
			});

			it('should fallback to default lang when i18nHandler returns null', () => {
				const mockHandler = vi.fn().mockReturnValue(null);
				i18n(mockHandler);

				const result = t('test.key');

				expect(mockHandler).toHaveBeenCalledWith('test.key', undefined);
				expect(result).toBe('Test Value');
			});

			it('should fallback to default lang when i18nHandler returns undefined', () => {
				const mockHandler = vi.fn().mockReturnValue(undefined);
				i18n(mockHandler);

				const result = t('test.key');

				expect(result).toBe('Test Value');
			});

			it('should fallback to default lang when i18nHandler returns same path', () => {
				const mockHandler = vi.fn().mockReturnValue('test.key');
				i18n(mockHandler);

				const result = t('test.key');

				expect(result).toBe('Test Value');
			});

			it('should convert non-string handler results to strings', () => {
				const mockHandler = vi.fn().mockReturnValue(123);
				i18n(mockHandler);

				const result = t('any.key');

				expect(result).toBe('123');
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty string path', () => {
				i18n(undefined);
				const result = t('');
				expect(result).toBe('');
			});

			it('should handle path with only dots', () => {
				i18n(undefined);
				const result = t('...');
				expect(result).toBe('');
			});

			it('should handle very long paths', () => {
				i18n(undefined);
				const longPath = 'a'.repeat(1000);
				const result = t(longPath);
				expect(result).toBe('');
			});

			it('should handle paths with special characters', () => {
				i18n(undefined);
				const specialPath = 'test.key!@#$%^&*()';
				const result = t(specialPath);
				expect(result).toBe('');
			});
		});
	});

	describe('use function', () => {
		describe('Language Loading', () => {
			it('should be a function', () => {
				expect(typeof use).toBe('function');
			});

			it('should handle valid language codes', async () => {
				await expect(use('en')).resolves.toBeUndefined();
			});

			it('should handle invalid language codes gracefully', async () => {
				await expect(use('invalid-lang')).resolves.toBeUndefined();
			});

			it('should handle empty string language code', async () => {
				await expect(use('')).resolves.toBeUndefined();
			});

			it('should handle null language code', async () => {
				await expect(use(null as any)).resolves.toBeUndefined();
			});

			it('should handle undefined language code', async () => {
				await expect(use(undefined as any)).resolves.toBeUndefined();
			});

			it('should handle multiple consecutive language changes', async () => {
				await expect(use('en')).resolves.toBeUndefined();
				await expect(use('fr')).resolves.toBeUndefined();
				await expect(use('de')).resolves.toBeUndefined();
			});
		});

		describe('Error Handling', () => {
			it('should not throw on import errors', async () => {
				await expect(use('nonexistent-language')).resolves.toBeUndefined();
			});

			it('should handle malformed language files gracefully', async () => {
				await expect(use('malformed')).resolves.toBeUndefined();
			});
		});
	});

	describe('i18n function', () => {
		describe('Handler Registration', () => {
			it('should be a function', () => {
				expect(typeof i18n).toBe('function');
			});

			it('should register a translation handler', () => {
				const mockHandler = vi.fn();

				expect(() => {
					i18n(mockHandler);
				}).not.toThrow();
			});

			it('should handle null handler', () => {
				expect(() => {
					i18n(null as any);
				}).not.toThrow();
			});

			it('should handle undefined handler', () => {
				expect(() => {
					i18n(undefined as any);
				}).not.toThrow();
			});

			it('should handle non-function handlers gracefully', () => {
				expect(() => {
					i18n('not a function' as any);
				}).not.toThrow();
			});

			it('should allow overriding existing handler', () => {
				const handler1 = vi.fn().mockReturnValue('handler1');
				const handler2 = vi.fn().mockReturnValue('handler2');

				i18n(handler1);
				i18n(handler2);

				const result = t('test.key');

				expect(handler2).toHaveBeenCalled();
				expect(handler1).not.toHaveBeenCalled();
				expect(result).toBe('handler2');
			});
		});

		describe('Handler Interaction', () => {
			it('should pass correct parameters to handler', () => {
				const mockHandler = vi.fn().mockReturnValue('handled');
				i18n(mockHandler);

				t('test.path', ['arg1', 'arg2']);

				expect(mockHandler).toHaveBeenCalledWith('test.path', ['arg1', 'arg2']);
			});

			it('should handle handlers that throw errors', () => {
				const throwingHandler = vi.fn(() => {
					throw new Error('Handler error');
				});
				i18n(throwingHandler);

				expect(() => {
					t('test.key');
				}).toThrow('Handler error');
			});

			it('should handle async handlers (treated as sync)', () => {
				const asyncHandler = vi.fn().mockReturnValue(Promise.resolve('async result'));
				i18n(asyncHandler);

				const result = t('test.key');

				expect(result).not.toBe('async result'); // Promise object gets converted to string
				expect(typeof result).toBe('string');
			});
		});
	});
});
