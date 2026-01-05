import { TranslationRequest } from '../translation-request';

/**
 * Tests for TranslationRequest
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationRequest', () => {
	const MOCK_REQUEST_ID_1 = 'req-uuid-001';
	const MOCK_REQUEST_ID_2 = 'req-uuid-002';
	const MOCK_TIMESTAMP_1 = 1704412800000; // 2025-01-05 00:00:00 UTC
	const MOCK_TIMESTAMP_2 = 1704412800500; // 2025-01-05 00:00:00.500 UTC

	let mockRandomUUID: jest.SpyInstance;
	let mockDateNow: jest.SpyInstance;

	beforeEach(() => {
		mockRandomUUID = jest.spyOn(crypto, 'randomUUID');
		mockDateNow = jest.spyOn(Date, 'now');

		// Default mock values for single request creation
		mockRandomUUID.mockReturnValue(MOCK_REQUEST_ID_1);
		mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should create request with all parameters', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ASSERT
			expect(request.text).toBe('Hello, world!');
			expect(request.to).toBe('es');
			expect(request.from).toBe('en');
		});

		it('[BL-02] should create request without from language', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Bonjour', 'en');

			// ASSERT
			expect(request.text).toBe('Bonjour');
			expect(request.to).toBe('en');
			expect(request.from).toBeUndefined();
		});

		it('[BL-03] should auto-generate requestId via parent', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Test', 'fr', 'en');

			// ASSERT
			expect(request.requestId).toBe(MOCK_REQUEST_ID_1);
			expect(mockRandomUUID).toHaveBeenCalledTimes(1);
		});

		it('[BL-04] should auto-generate requestedAt via parent', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Test', 'de', 'en');

			// ASSERT
			expect(request.requestedAt).toBe(MOCK_TIMESTAMP_1);
			expect(mockDateNow).toHaveBeenCalledTimes(1);
		});

		it('[BL-05] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Test', 'ja', 'en');

			// ASSERT
			expect(Object.isFrozen(request)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(request as { to: string }).to = 'zh';
			}).toThrow();
		});

		it('[BL-06] should return log metadata without text', () => {
			// ARRANGE
			const request = new TranslationRequest('Secret content', 'pt', 'en');

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: MOCK_REQUEST_ID_1,
				from: 'en',
				to: 'pt',
				requestedAt: MOCK_TIMESTAMP_1,
			});
			expect(metadata).not.toHaveProperty('text');
		});

		it('[BL-07] should return data object with text but without requestId', () => {
			// ARRANGE
			const request = new TranslationRequest('Data content', 'ru', 'en');

			// ACT
			const dataObject = request.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				from: 'en',
				to: 'ru',
				text: 'Data content',
				requestedAt: MOCK_TIMESTAMP_1,
			});
			expect(dataObject).not.toHaveProperty('requestId');
		});

		it('[BL-08] should clone with same field values', () => {
			// ARRANGE
			const original = new TranslationRequest('Original text', 'it', 'en');

			// Setup different IDs/timestamps for clone
			mockRandomUUID.mockReturnValue(MOCK_REQUEST_ID_2);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_2);

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned).toBeInstanceOf(TranslationRequest);
			expect(cloned.text).toBe('Original text');
			expect(cloned.to).toBe('it');
			expect(cloned.from).toBe('en');
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty string text', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('', 'fr', 'en');

			// ASSERT
			expect(request.text).toBe('');
			expect(request.text.length).toBe(0);
		});

		it('[EC-02] should preserve whitespace in text', () => {
			// ARRANGE
			const textWithWhitespace = '  Hello  \n  World  \t';

			// ACT
			const request = new TranslationRequest(textWithWhitespace, 'de');

			// ASSERT
			expect(request.text).toBe(textWithWhitespace);
		});

		it('[EC-03] should handle special characters in text', () => {
			// ARRANGE
			const specialText = '🌍 Hello! "Quotes" & <tags> 日本語 \n\t';

			// ACT
			const request = new TranslationRequest(specialText, 'en', 'ja');

			// ASSERT
			expect(request.text).toBe(specialText);
		});

		it('[EC-04] should trim whitespace when validating to', () => {
			// ARRANGE & ACT & ASSERT
			// Should NOT throw because "es" is valid after trimming
			expect(() => {
				new TranslationRequest('Test', '  es  ');
			}).not.toThrow();
		});

		it('[EC-05] should handle undefined from in all methods', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'ko');

			// ACT
			const metadata = request.asLogMetadata();
			const dataObject = request.asDataObject();

			// ASSERT
			expect(request.from).toBeUndefined();
			expect(metadata.from).toBeUndefined();
			expect(dataObject.from).toBeUndefined();
		});

		it('[EC-06] should create new requestId on clone', () => {
			// ARRANGE
			const original = new TranslationRequest('Test', 'zh', 'en');
			expect(original.requestId).toBe(MOCK_REQUEST_ID_1);

			// Setup different ID for clone
			mockRandomUUID.mockReturnValue(MOCK_REQUEST_ID_2);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_2);

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned.requestId).toBe(MOCK_REQUEST_ID_2);
			expect(cloned.requestId).not.toBe(original.requestId);
			expect(mockRandomUUID).toHaveBeenCalledTimes(2); // Once for original, once for clone
		});

		it('[EC-07] should create new requestedAt on clone', () => {
			// ARRANGE
			const original = new TranslationRequest('Test', 'ar', 'en');
			expect(original.requestedAt).toBe(MOCK_TIMESTAMP_1);

			// Setup different timestamp for clone
			mockRandomUUID.mockReturnValue(MOCK_REQUEST_ID_2);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_2);

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned.requestedAt).toBe(MOCK_TIMESTAMP_2);
			expect(cloned.requestedAt).not.toBe(original.requestedAt);
			expect(mockDateNow).toHaveBeenCalledTimes(2); // Once for original, once for clone
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw if to is empty string', () => {
			// ARRANGE & ACT & ASSERT
			expect(() => {
				new TranslationRequest('Test', '');
			}).toThrow('targetLanguage is required');
		});

		it('[EH-02] should throw if to is whitespace only', () => {
			// ARRANGE & ACT & ASSERT
			expect(() => {
				new TranslationRequest('Test', '   \t\n   ');
			}).toThrow('targetLanguage is required');
		});

		it('[EH-03] should throw if to is undefined', () => {
			// ARRANGE & ACT & ASSERT
			expect(() => {
				new TranslationRequest('Test', undefined as unknown as string);
			}).toThrow('targetLanguage is required');
		});

		it('[EH-04] should throw with descriptive error message', () => {
			// ARRANGE & ACT
			let errorMessage = '';
			try {
				new TranslationRequest('Test', '');
			} catch (error) {
				errorMessage = (error as Error).message;
			}

			// ASSERT
			expect(errorMessage).toBe('targetLanguage is required');
			expect(errorMessage).toContain('targetLanguage');
			expect(errorMessage).toContain('required');
		});
	});
});
