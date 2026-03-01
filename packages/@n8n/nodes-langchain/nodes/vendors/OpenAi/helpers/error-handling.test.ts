import { OperationalError } from 'n8n-workflow';
import { RateLimitError } from 'openai';
import { OpenAIError } from 'openai/error';

import { openAiFailedAttemptHandler, getCustomErrorMessage, isOpenAiError } from './error-handling';

describe('error-handling', () => {
	describe('getCustomErrorMessage', () => {
		it('should return the correct custom error message for known error codes', () => {
			expect(getCustomErrorMessage('insufficient_quota')).toBe(
				'Insufficient quota detected. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/common-issues/#insufficient-quota" target="_blank">Learn more</a> about resolving this issue',
			);
			expect(getCustomErrorMessage('rate_limit_exceeded')).toBe('OpenAI: Rate limit reached');
		});

		it('should return undefined for unknown error codes', () => {
			expect(getCustomErrorMessage('unknown_error_code')).toBeUndefined();
		});
	});

	describe('isOpenAiError', () => {
		it('should return true if the error is an instance of OpenAIError', () => {
			const error = new OpenAIError('Test error');
			expect(isOpenAiError(error)).toBe(true);
		});

		it('should return false if the error is not an instance of OpenAIError', () => {
			const error = new Error('Test error');
			expect(isOpenAiError(error)).toBe(false);
		});
	});

	describe('openAiFailedAttemptHandler', () => {
		it('should handle RateLimitError and modify the error message', () => {
			const error = new RateLimitError(
				429,
				{ code: 'rate_limit_exceeded' },
				'Rate limit exceeded',
				new Headers(),
			);

			try {
				openAiFailedAttemptHandler(error);
			} catch (e) {
				expect(e).toBeInstanceOf(OperationalError);
				expect(e.level).toBe('warning');
				expect(e.cause).toBe(error);
				expect(e.message).toBe('OpenAI: Rate limit reached');
			}
		});

		it('should throw the error if it is not a RateLimitError', () => {
			const error = new Error('Test error');

			expect(() => openAiFailedAttemptHandler(error)).not.toThrow();
		});

		describe('non-chat model error handling', () => {
			it('should throw helpful error when model requires Responses API', () => {
				const error = {
					status: 404,
					type: 'invalid_request_error',
					param: 'model',
					message:
						'This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?',
					code: null,
				};

				expect(() => openAiFailedAttemptHandler(error)).toThrow(OperationalError);
				expect(() => openAiFailedAttemptHandler(error)).toThrow(
					'This model requires the Responses API. Enable "Use Responses API" in the OpenAI Chat Model node options to use this model.',
				);
			});

			it('should not throw for 404 errors with different type', () => {
				const error = {
					status: 404,
					type: 'not_found_error',
					param: 'model',
					message: 'This is not a chat model',
				};

				expect(() => openAiFailedAttemptHandler(error)).not.toThrow();
			});

			it('should not throw for 404 errors with different param', () => {
				const error = {
					status: 404,
					type: 'invalid_request_error',
					param: 'api_key',
					message: 'This is not a chat model',
				};

				expect(() => openAiFailedAttemptHandler(error)).not.toThrow();
			});

			it('should not throw for 404 errors with different message', () => {
				const error = {
					status: 404,
					type: 'invalid_request_error',
					param: 'model',
					message: 'Model not found',
				};

				expect(() => openAiFailedAttemptHandler(error)).not.toThrow();
			});

			it('should not throw for errors with different status', () => {
				const error = {
					status: 400,
					type: 'invalid_request_error',
					param: 'model',
					message: 'This is not a chat model',
				};

				expect(() => openAiFailedAttemptHandler(error)).not.toThrow();
			});

			it('should not throw for null or undefined errors', () => {
				expect(() => openAiFailedAttemptHandler(null)).not.toThrow();
				expect(() => openAiFailedAttemptHandler(undefined)).not.toThrow();
			});

			it('should not throw for non-object errors', () => {
				expect(() => openAiFailedAttemptHandler('string error')).not.toThrow();
				expect(() => openAiFailedAttemptHandler(123)).not.toThrow();
			});
		});
	});
});
