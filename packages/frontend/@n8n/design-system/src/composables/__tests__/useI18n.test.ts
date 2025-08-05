/**
 * Test suite for useI18n composable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useI18n } from '../useI18n';

// Mock the locale module
vi.mock('../../locale', () => ({
	t: vi.fn(),
}));

describe('useI18n', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	describe('Basic Functionality', () => {
		it('should return an object with t function', () => {
			const i18n = useI18n();

			expect(i18n).toBeDefined();
			expect(typeof i18n.t).toBe('function');
		});

		it('should call the t function with path only', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('translated text');

			const i18n = useI18n();
			const result = i18n.t('test.path');

			expect(mockT).toHaveBeenCalledWith('test.path', []);
			expect(result).toBe('translated text');
		});

		it('should call the t function with path and options', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('translated with options');

			const i18n = useI18n();
			const result = i18n.t('test.path', ['option1', 'option2']);

			expect(mockT).toHaveBeenCalledWith('test.path', ['option1', 'option2']);
			expect(result).toBe('translated with options');
		});

		it('should handle empty options array', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('no options');

			const i18n = useI18n();
			const result = i18n.t('test.path', []);

			expect(mockT).toHaveBeenCalledWith('test.path', []);
			expect(result).toBe('no options');
		});
	});

	describe('Parameter Handling', () => {
		it('should handle complex translation paths', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('complex translation');

			const i18n = useI18n();
			const result = i18n.t('nested.deep.translation.path');

			expect(mockT).toHaveBeenCalledWith('nested.deep.translation.path', []);
			expect(result).toBe('complex translation');
		});

		it('should handle single option parameter', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('single option translation');

			const i18n = useI18n();
			const result = i18n.t('test.single', ['value']);

			expect(mockT).toHaveBeenCalledWith('test.single', ['value']);
			expect(result).toBe('single option translation');
		});

		it('should handle multiple option parameters', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('multiple options translation');

			const i18n = useI18n();
			const result = i18n.t('test.multiple', ['value1', 'value2', 'value3']);

			expect(mockT).toHaveBeenCalledWith('test.multiple', ['value1', 'value2', 'value3']);
			expect(result).toBe('multiple options translation');
		});

		it('should handle empty string path', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('empty path');

			const i18n = useI18n();
			const result = i18n.t('');

			expect(mockT).toHaveBeenCalledWith('', []);
			expect(result).toBe('empty path');
		});
	});

	describe('Multiple Instances', () => {
		it('should create independent instances', () => {
			const i18n1 = useI18n();
			const i18n2 = useI18n();

			expect(i18n1).not.toBe(i18n2);
			expect(i18n1.t).not.toBe(i18n2.t);
		});

		it('should maintain consistent behavior across instances', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockReturnValue('consistent behavior');

			const i18n1 = useI18n();
			const i18n2 = useI18n();

			const result1 = i18n1.t('test.path');
			const result2 = i18n2.t('test.path');

			expect(result1).toBe(result2);
			expect(mockT).toHaveBeenCalledTimes(2);
		});
	});

	describe('Error Handling', () => {
		it('should handle errors from underlying t function', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;
			mockT.mockImplementation(() => {
				throw new Error('Translation error');
			});

			const i18n = useI18n();

			expect(() => {
				i18n.t('test.error');
			}).toThrow('Translation error');
		});

		it('should pass through return values from t function', async () => {
			const { t } = await import('../../locale');
			const mockT = t as ReturnType<typeof vi.fn>;

			// Test various return types
			const testCases = [
				'string result',
				42,
				null,
				undefined,
				{ object: 'result' },
				['array', 'result'],
			];

			const i18n = useI18n();

			testCases.forEach((returnValue) => {
				mockT.mockReturnValueOnce(returnValue);
				const result = i18n.t('test.path');
				expect(result).toBe(returnValue);
			});
		});
	});
});
