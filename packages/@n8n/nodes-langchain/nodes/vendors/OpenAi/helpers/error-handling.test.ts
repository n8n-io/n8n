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
	});
});
