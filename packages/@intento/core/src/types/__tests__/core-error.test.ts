/**
 * Test suite for CoreError class
 *
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 * @see core-error.test.md for test plan
 */

import { CoreError } from '../core-error';

describe('CoreError', () => {
	describe('Business Logic', () => {
		// BL-01: should create error with message only
		it('should create error with message only', () => {
			const message = 'Test error message';
			const error = new CoreError(message);

			expect(error.message).toBe(message);
			expect(error.metadata).toBeUndefined();
		});

		// BL-02: should create error with message and metadata
		it('should create error with message and metadata', () => {
			const message = 'Test error with metadata';
			const metadata = { traceId: 'abc-123', nodeName: 'TestNode' };
			const error = new CoreError(message, metadata);

			expect(error.message).toBe(message);
			expect(error.metadata).toEqual(metadata);
		});

		// BL-03: should set error name to 'Intento Core Error'
		it("should set error name to 'Intento Core Error'", () => {
			const error = new CoreError('Test error');

			expect(error.name).toBe('Intento Core Error');
		});

		// BL-04: should extend Error class
		it('should extend Error class', () => {
			const error = new CoreError('Test error');

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(CoreError);
		});

		// BL-05: should preserve error stack trace
		it('should preserve error stack trace', () => {
			const error = new CoreError('Test error');

			expect(error.stack).toBeDefined();
			expect(error.stack).toContain('Intento Core Error');
			expect(error.stack).toContain('Test error');
		});
	});

	describe('Edge Cases', () => {
		// EC-01: should handle empty metadata object
		it('should handle empty metadata object', () => {
			const error = new CoreError('Test error', {});

			expect(error.metadata).toEqual({});
		});

		// EC-02: should handle metadata with nested objects
		it('should handle metadata with nested objects', () => {
			const metadata = {
				traceId: 'abc-123',
				config: { timeout: 5000, retries: 3 },
				nodeName: 'TestNode',
			};
			const error = new CoreError('Test error', metadata);

			expect(error.metadata).toEqual(metadata);
			expect(error.metadata).toHaveProperty('config');
			expect(error.metadata?.config).toEqual({ timeout: 5000, retries: 3 });
		});

		// EC-03: should be instance of Error and CoreError
		it('should be instance of Error and CoreError', () => {
			const error = new CoreError('Test error');

			// Both instanceof checks should pass (error discrimination pattern)
			expect(error instanceof Error).toBe(true);
			expect(error instanceof CoreError).toBe(true);
		});

		// EC-04: should work with Error.cause property
		it('should work with Error.cause property', () => {
			const cause = new Error('Root cause');
			const error = new CoreError('Wrapper error', { traceId: 'abc-123' });
			error.cause = cause;

			expect(error.cause).toBe(cause);
			expect((error.cause as Error).message).toBe('Root cause');
		});

		// EC-05: should preserve message exactly as provided
		it('should preserve message exactly as provided', () => {
			const messages = [
				'Simple message',
				'🐞 [BUG] Message with emoji',
				'⚙️ Config error',
				'Message with\nnewlines',
				'Message with "quotes"',
				"Message with 'single quotes'",
				'',
			];

			for (const message of messages) {
				const error = new CoreError(message);
				expect(error.message).toBe(message);
			}
		});
	});

	describe('Error Handling', () => {
		// EH-01: should be catchable with try-catch
		it('should be catchable with try-catch', () => {
			const message = 'Catchable error';
			const metadata = { traceId: 'test-123' };

			try {
				throw new CoreError(message, metadata);
			} catch (error) {
				expect(error).toBeInstanceOf(CoreError);
				expect((error as CoreError).message).toBe(message);
				expect((error as CoreError).metadata).toEqual(metadata);
			}
		});

		// EH-02: should be throwable and rejectable
		it('should be throwable and rejectable', async () => {
			const error = new CoreError('Async error', { traceId: 'async-123' });

			await expect(Promise.reject(error)).rejects.toThrow(CoreError);
			await expect(Promise.reject(error)).rejects.toThrow('Async error');
		});

		// EH-03: should maintain instanceof CoreError after throw
		it('should maintain instanceof CoreError after throw', () => {
			const error = new CoreError('Test error', { traceId: 'type-check-123' });

			try {
				throw error;
			} catch (caught) {
				// Runtime type checking pattern from SupplierBase
				expect(caught instanceof CoreError).toBe(true);
				expect(caught instanceof Error).toBe(true);

				// Type discrimination pattern
				if (caught instanceof CoreError) {
					expect(caught.metadata).toBeDefined();
					expect(caught.metadata?.traceId).toBe('type-check-123');
				}
			}
		});
	});
});
