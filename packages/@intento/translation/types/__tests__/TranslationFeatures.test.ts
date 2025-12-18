import { TranslationFeatures } from '../TranslationFeatures';

describe('TranslationFeatures', () => {
	describe('DELAY feature', () => {
		it('should have delay properties with correct types and defaults', () => {
			const delayEnabled = TranslationFeatures.DELAY.find((p) => p.name === 'delayEnabled');
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const delayValue = TranslationFeatures.DELAY.find((p) => p.name === 'delayValue');

			expect(delayEnabled?.type).toBe('boolean');
			expect(delayEnabled?.default).toBe(false);

			expect(delayType?.type).toBe('options');
			expect(delayType?.default).toBe('fixed');
			expect(delayType?.options).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 'fixed' }),
					expect.objectContaining({ value: 'random' }),
				]),
			);

			expect(delayValue?.type).toBe('number');
			expect(delayValue?.default).toBe(1000);
			expect(delayValue?.typeOptions?.minValue).toBe(0);
			expect(delayValue?.typeOptions?.maxValue).toBe(60000);
		});

		it('should show conditional fields only when delay is enabled', () => {
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const delayValue = TranslationFeatures.DELAY.find((p) => p.name === 'delayValue');

			expect(delayType?.displayOptions?.show?.delayEnabled).toEqual([true]);
			expect(delayValue?.displayOptions?.show?.delayEnabled).toEqual([true]);
		});

		it('should enforce constraint that minValue cannot exceed maxValue', () => {
			const delayValue = TranslationFeatures.DELAY.find((p) => p.name === 'delayValue');
			const minValue = delayValue?.typeOptions?.minValue ?? 0;
			const maxValue = delayValue?.typeOptions?.maxValue ?? 0;

			expect(minValue).toBeLessThanOrEqual(maxValue);
		});

		it('should reject invalid delay type values', () => {
			const delayType = TranslationFeatures.DELAY.find((p) => p.name === 'delayType');
			const validOptions =
				delayType?.options?.filter((o) => 'value' in o).map((o) => o.value) ?? [];

			expect(validOptions).toContain('fixed');
			expect(validOptions).toContain('random');
			expect(validOptions).not.toContain('invalid');
			expect(validOptions.length).toBeGreaterThan(0);
		});
	});

	describe('MOCKED_TRANSLATION feature', () => {
		it('should have mocked translation properties with correct types', () => {
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

			expect(mockedResult?.type).toBe('options');
			expect(mockedResult?.options).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 'pass' }),
					expect.objectContaining({ value: 'overwrite' }),
					expect.objectContaining({ value: 'fail' }),
				]),
			);

			expect(mockedText?.type).toBe('string');
			expect(mockedText?.default).toBe('');

			expect(statusCode?.type).toBe('number');
			expect(statusCode?.default).toBe(500);
			expect(statusCode?.typeOptions?.minValue).toBe(100);
			expect(statusCode?.typeOptions?.maxValue).toBe(599);

			expect(errorMessage?.type).toBe('string');
			expect(errorMessage?.default).toBe('Translation failed');
		});

		it('should conditionally show fields based on mockedTranslationResult', () => {
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

		it('should enforce HTTP status code range constraints', () => {
			const statusCode = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationStatusCode',
			);
			const minValue = statusCode?.typeOptions?.minValue ?? 0;
			const maxValue = statusCode?.typeOptions?.maxValue ?? 0;

			expect(minValue).toBeGreaterThanOrEqual(100);
			expect(maxValue).toBeLessThanOrEqual(599);
			expect(minValue).toBeLessThanOrEqual(maxValue);
		});

		it('should handle all valid mocked result modes', () => {
			const mockedResult = TranslationFeatures.MOCKED_TRANSLATION.find(
				(p) => p.name === 'mockedTranslationResult',
			);
			const modes = mockedResult?.options?.filter((o) => 'value' in o).map((o) => o.value) ?? [];

			expect(modes).toContain('pass');
			expect(modes).toContain('overwrite');
			expect(modes).toContain('fail');
			expect(modes.length).toBe(3);
		});
	});

	describe('RETRY feature', () => {
		it('should have retry properties with correct types and constraints', () => {
			const retryEnabled = TranslationFeatures.RETRY.find((p) => p.name === 'retryEnabled');
			const maxAttempts = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxAttempts');
			const maxDelay = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxDelay');

			expect(retryEnabled?.type).toBe('boolean');
			expect(retryEnabled?.default).toBe(false);

			expect(maxAttempts?.type).toBe('number');
			expect(maxAttempts?.default).toBe(1);
			expect(maxAttempts?.typeOptions?.minValue).toBe(1);
			expect(maxAttempts?.typeOptions?.maxValue).toBe(10);

			expect(maxDelay?.type).toBe('number');
			expect(maxDelay?.default).toBe(1000);
			expect(maxDelay?.typeOptions?.minValue).toBe(0);
			expect(maxDelay?.typeOptions?.maxValue).toBe(60000);
		});

		it('should show conditional fields only when retry is enabled', () => {
			const maxAttempts = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxAttempts');
			const maxDelay = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxDelay');

			expect(maxAttempts?.displayOptions?.show?.retryEnabled).toEqual([true]);
			expect(maxDelay?.displayOptions?.show?.retryEnabled).toEqual([true]);
		});

		it('should enforce constraint that retry attempts are within valid range', () => {
			const maxAttempts = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxAttempts');
			const minValue = maxAttempts?.typeOptions?.minValue ?? 0;
			const maxValue = maxAttempts?.typeOptions?.maxValue ?? 0;

			expect(minValue).toBeGreaterThanOrEqual(1);
			expect(maxValue).toBeGreaterThanOrEqual(minValue);
			expect(maxValue).toBeLessThanOrEqual(10);
		});

		it('should enforce constraint that retry delay values are valid', () => {
			const maxDelay = TranslationFeatures.RETRY.find((p) => p.name === 'retryMaxDelay');
			const minValue = maxDelay?.typeOptions?.minValue ?? 0;
			const maxValue = maxDelay?.typeOptions?.maxValue ?? 0;

			expect(minValue).toBeGreaterThanOrEqual(0);
			expect(maxValue).toBeLessThanOrEqual(60000);
			expect(minValue).toBeLessThanOrEqual(maxValue);
		});
	});
});
