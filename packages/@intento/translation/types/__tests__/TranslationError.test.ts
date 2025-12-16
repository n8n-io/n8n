import { TranslationError } from '../TranslationError';

describe('TranslationError', () => {
	describe('fromAPI', () => {
		it('should format API error messages with all required components', () => {
			const location = new URL('https://api.example.com/translate');
			const code = 500;
			const message = 'Internal Server Error';
			const latency = 150;

			const error = TranslationError.fromAPI(location, code, message, latency);

			expect(error).toBeInstanceOf(TranslationError);
			expect(error.message).toBe(
				`Request to ${location.toString()} failed in ${latency} ms with status code ${code}: ${message}`,
			);
		});

		it('should handle various HTTP error codes', () => {
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

		it('should handle edge case error codes', () => {
			const location = new URL('https://api.example.com/translate');
			const edgeCases = [
				{ code: 100, message: 'Continue', latency: 10 }, // Informational
				{ code: 599, message: 'Network Connect Timeout Error', latency: 9999 }, // Max valid HTTP code
			];

			edgeCases.forEach(({ code, message, latency }) => {
				const error = TranslationError.fromAPI(location, code, message, latency);
				expect(error.message).toContain(code.toString());
				expect(error.message).toContain(message);
			});
		});

		it('should handle empty error messages', () => {
			const location = new URL('https://api.example.com/translate');
			const error = TranslationError.fromAPI(location, 500, '', 100);

			expect(error.message).toContain('status code 500');
			expect(error).toBeInstanceOf(TranslationError);
		});

		it('should handle very long error messages', () => {
			const location = new URL('https://api.example.com/translate');
			const longMessage = 'Error: ' + 'a'.repeat(5000);
			const error = TranslationError.fromAPI(location, 500, longMessage, 100);

			expect(error.message).toContain(longMessage);
			expect(error.message.length).toBeGreaterThan(5000);
		});
	});

	describe('fromLocal', () => {
		it('should format local error messages with code and latency', () => {
			const code = 500;
			const message = 'Local translation service error';
			const latency = 200;

			const error = TranslationError.fromLocal(code, message, latency);

			expect(error).toBeInstanceOf(TranslationError);
			expect(error.message).toBe(
				`Local translation failed in ${latency} ms with status code ${code}: ${message}`,
			);
		});

		it('should handle various error codes and messages', () => {
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

		it('should handle edge case error codes and latencies', () => {
			const edgeCases = [
				{ code: 0, message: 'No error', latency: 0 },
				{ code: 999, message: 'Unknown code', latency: 1000000 },
			];

			edgeCases.forEach(({ code, message, latency }) => {
				const error = TranslationError.fromLocal(code, message, latency);
				expect(error.message).toContain(code.toString());
				expect(error.message).toContain(latency.toString());
			});
		});

		it('should handle empty error messages in local errors', () => {
			const error = TranslationError.fromLocal(500, '', 100);

			expect(error.message).toContain('status code 500');
			expect(error).toBeInstanceOf(TranslationError);
		});

		it('should handle very long error messages in local errors', () => {
			const longMessage = 'Error: ' + 'x'.repeat(5000);
			const error = TranslationError.fromLocal(500, longMessage, 100);

			expect(error.message).toContain(longMessage);
			expect(error.message.length).toBeGreaterThan(5000);
		});
	});
});
