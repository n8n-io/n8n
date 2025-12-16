import { TranslationError } from '../TranslationError';

describe('TranslationError', () => {
	describe('constructor', () => {
		it('should create an error instance with a message', () => {
			const message = 'Translation failed';
			const error = new TranslationError(message);

			expect(error).toBeInstanceOf(TranslationError);
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe(message);
		});
	});

	describe('fromAPI', () => {
		it('should create an error from API response with correct format', () => {
			const location = new URL('https://api.example.com/translate');
			const code = 500;
			const message = 'Internal Server Error';
			const latency = 150;

			const error = TranslationError.fromAPI(location, code, message, latency);

			expect(error).toBeInstanceOf(TranslationError);
			expect(error.message).toContain(`Request to ${location.toString()} failed`);
			expect(error.message).toContain(`${latency} ms`);
			expect(error.message).toContain(`status code ${code}`);
			expect(error.message).toContain(message);
		});

		it('should format error message correctly with different status codes', () => {
			const location = new URL('https://api.example.com/v1/translate');
			const testCases = [
				{ code: 400, message: 'Bad Request', latency: 50 },
				{ code: 401, message: 'Unauthorized', latency: 100 },
				{ code: 429, message: 'Too Many Requests', latency: 200 },
				{ code: 503, message: 'Service Unavailable', latency: 5000 },
			];

			testCases.forEach(({ code, message, latency }) => {
				const error = TranslationError.fromAPI(location, code, message, latency);
				expect(error.message).toBe(
					`Request to ${location.toString()} failed in ${latency} ms with status code ${code}: ${message}`,
				);
			});
		});
	});

	describe('fromLocal', () => {
		it('should create an error from local translation with correct format', () => {
			const code = 500;
			const message = 'Local translation service error';
			const latency = 200;

			const error = TranslationError.fromLocal(code, message, latency);

			expect(error).toBeInstanceOf(TranslationError);
			expect(error.message).toBe(
				`Local translation failed in ${latency} ms with status code ${code}: ${message}`,
			);
		});

		it('should format error message correctly with different error codes', () => {
			const testCases = [
				{ code: 1, message: 'Unknown error', latency: 50 },
				{ code: 100, message: 'Validation error', latency: 100 },
				{ code: 500, message: 'Internal error', latency: 250 },
			];

			testCases.forEach(({ code, message, latency }) => {
				const error = TranslationError.fromLocal(code, message, latency);
				expect(error.message).toBe(
					`Local translation failed in ${latency} ms with status code ${code}: ${message}`,
				);
			});
		});

		it('should handle special characters in error message', () => {
			const specialMessages = [
				'Error: "Invalid syntax"',
				"Error with 'quotes'",
				'Error with symbols: !@#$%^&*()',
				'Error with unicode: 你好',
			];

			specialMessages.forEach((message) => {
				const error = TranslationError.fromLocal(500, message, 100);
				expect(error.message).toContain(message);
			});
		});
	});

	describe('error inheritance', () => {
		it('should be throwable and catchable', () => {
			const message = 'Test error message';

			expect(() => {
				throw new TranslationError(message);
			}).toThrow(TranslationError);
		});
	});
});
