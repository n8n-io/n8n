import { TranslationFeatures } from '../TranslationFeatures';
import type { INodeProperties } from 'n8n-workflow';

describe('TranslationFeatures', () => {
	describe('structure', () => {
		it('should have DELAY, MOCKED_TRANSLATION, and RETRY features', () => {
			expect(TranslationFeatures).toHaveProperty('DELAY');
			expect(TranslationFeatures).toHaveProperty('MOCKED_TRANSLATION');
			expect(TranslationFeatures).toHaveProperty('RETRY');
		});

		it('should have each feature as a non-empty array', () => {
			expect(Array.isArray(TranslationFeatures.DELAY)).toBe(true);
			expect(TranslationFeatures.DELAY.length).toBeGreaterThan(0);
			expect(Array.isArray(TranslationFeatures.MOCKED_TRANSLATION)).toBe(true);
			expect(TranslationFeatures.MOCKED_TRANSLATION.length).toBeGreaterThan(0);
			expect(Array.isArray(TranslationFeatures.RETRY)).toBe(true);
			expect(TranslationFeatures.RETRY.length).toBeGreaterThan(0);
		});
	});

	describe('DELAY feature', () => {
		it('should define delayEnabled, delayType, and delayValue properties', () => {
			const delayEnabled = TranslationFeatures.DELAY.find((p) => p.name === 'delayEnabled');
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const delayValue = TranslationFeatures.DELAY.find((p) => p.name === 'delayValue');

			expect(delayEnabled).toBeDefined();
			expect(delayEnabled?.type).toBe('boolean');
			expect(delayEnabled?.default).toBe(false);

			expect(delayType).toBeDefined();
			expect(delayType?.type).toBe('options');
			expect(delayType?.default).toBe('fixed');
			expect((delayType?.options as Array<any>).length).toBeGreaterThan(0);

			expect(delayValue).toBeDefined();
			expect(delayValue?.type).toBe('number');
			expect(delayValue?.default).toBe(1000);
			expect(delayValue?.typeOptions).toHaveProperty('minValue', 0);
			expect(delayValue?.typeOptions).toHaveProperty('maxValue', 60000);
		});

		it('should have fixed and random delay type options', () => {
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const options = (delayType?.options as Array<any>) || [];
			const optionValues = options.map((o) => o.value);

			expect(optionValues).toContain('fixed');
			expect(optionValues).toContain('random');
		});

		it('should show delayType and delayValue only when delayEnabled is true', () => {
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const delayValue = TranslationFeatures.DELAY.find((p) => p.name === 'delayValue');

			expect(delayType?.displayOptions?.show?.delayEnabled).toEqual([true]);
			expect(delayValue?.displayOptions?.show?.delayEnabled).toEqual([true]);
		});
	});

	describe('MOCKED_TRANSLATION feature', () => {
		it('should define mockedTranslationResult, mockedTranslationText, mockedTranslationStatusCode, and mockedTranslationErrorMessage properties', () => {
			const mockedResult = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationResult',
			);
			const mockedText = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationText',
			);
			const statusCode = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationStatusCode',
			);
			const errorMessage = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationErrorMessage',
			);

			expect(mockedResult).toBeDefined();
			expect(mockedResult?.type).toBe('options');
			expect(mockedResult?.default).toBe('pass');

			expect(mockedText).toBeDefined();
			expect(mockedText?.type).toBe('string');
			expect(mockedText?.default).toBe('');

			expect(statusCode).toBeDefined();
			expect(statusCode?.type).toBe('number');
			expect(statusCode?.default).toBe(500);
			expect(statusCode?.typeOptions).toHaveProperty('minValue', 100);
			expect(statusCode?.typeOptions).toHaveProperty('maxValue', 599);

			expect(errorMessage).toBeDefined();
			expect(errorMessage?.type).toBe('string');
			expect(errorMessage?.default).toBe('Translation failed');
		});

		it('should have pass, overwrite, and fail mock result options', () => {
			const mockedResult = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationResult',
			);
			const options = (mockedResult?.options as Array<any>) || [];
			const optionValues = options.map((o) => o.value);

			expect(optionValues).toContain('pass');
			expect(optionValues).toContain('overwrite');
			expect(optionValues).toContain('fail');
		});

		it('should show appropriate fields based on mockedTranslationResult value', () => {
			const mockedText = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationText',
			);
			const statusCode = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationStatusCode',
			);
			const errorMessage = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationErrorMessage',
			);

			expect(mockedText?.displayOptions?.show?.mockedTranslationResult).toEqual(['overwrite']);
			expect(statusCode?.displayOptions?.show?.mockedTranslationResult).toEqual(['fail']);
			expect(errorMessage?.displayOptions?.show?.mockedTranslationResult).toEqual(['fail']);
		});
	});

	describe('RETRY feature', () => {
		it('should define retryEnabled, retryMaxAttempts, and retryMaxDelay properties', () => {
			const retryEnabled = TranslationFeatures.RETRY.find((p) => p.name === 'retryEnabled');
			const maxAttempts = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxAttempts');
			const maxDelay = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxDelay');

			expect(retryEnabled).toBeDefined();
			expect(retryEnabled?.type).toBe('boolean');
			expect(retryEnabled?.default).toBe(false);

			expect(maxAttempts).toBeDefined();
			expect(maxAttempts?.type).toBe('number');
			expect(maxAttempts?.default).toBe(1);
			expect(maxAttempts?.typeOptions).toHaveProperty('minValue', 1);
			expect(maxAttempts?.typeOptions).toHaveProperty('maxValue', 10);

			expect(maxDelay).toBeDefined();
			expect(maxDelay?.type).toBe('number');
			expect(maxDelay?.default).toBe(1000);
			expect(maxDelay?.typeOptions).toHaveProperty('minValue', 0);
			expect(maxDelay?.typeOptions).toHaveProperty('maxValue', 60000);
		});

		it('should show retry attempt and delay only when retryEnabled is true', () => {
			const maxAttempts = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxAttempts');
			const maxDelay = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxDelay');

			expect(maxAttempts?.displayOptions?.show?.retryEnabled).toEqual([true]);
			expect(maxDelay?.displayOptions?.show?.retryEnabled).toEqual([true]);
		});
	});

	describe('options validation', () => {
		it('should have valid name and value for all delay options', () => {
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const options = (delayType?.options as Array<any>) || [];

			options.forEach((option) => {
				expect(option).toHaveProperty('name');
				expect(option).toHaveProperty('value');
				expect(typeof option.name).toBe('string');
				expect(option.name.length).toBeGreaterThan(0);
			});
		});

		it('should have valid name and value for all mock result options', () => {
			const mockedResult = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationResult',
			);
			const options = (mockedResult?.options as Array<any>) || [];

			options.forEach((option) => {
				expect(option).toHaveProperty('name');
				expect(option).toHaveProperty('value');
				expect(typeof option.name).toBe('string');
				expect(option.name.length).toBeGreaterThan(0);
			});
		});
	});
});
