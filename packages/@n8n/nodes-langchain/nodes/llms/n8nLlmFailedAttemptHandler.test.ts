import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { ApplicationError, NodeApiError } from 'n8n-workflow';

import { makeN8nLlmFailedAttemptHandler } from './n8nLlmFailedAttemptHandler';

describe('makeN8nLlmFailedAttemptHandler', () => {
	const ctx = mock<ISupplyDataFunctions>({
		getNode: jest.fn(),
	});

	it('should throw a wrapped error, when NO custom handler is provided', () => {
		const handler = makeN8nLlmFailedAttemptHandler(ctx);

		expect(() => handler(new Error('Test error'))).toThrow(NodeApiError);
	});

	it('should wrapped error when custom handler is provided', () => {
		const customHandler = jest.fn();
		const handler = makeN8nLlmFailedAttemptHandler(ctx, customHandler);

		expect(() => handler(new Error('Test error'))).toThrow(NodeApiError);
		expect(customHandler).toHaveBeenCalled();
	});

	it('should throw wrapped exception from custom handler', () => {
		const customHandler = jest.fn(() => {
			throw new ApplicationError('Custom handler error');
		});
		const handler = makeN8nLlmFailedAttemptHandler(ctx, customHandler);

		expect(() => handler(new Error('Test error'))).toThrow('Custom handler error');
		expect(customHandler).toHaveBeenCalled();
	});

	it('should not throw if retries are left', () => {
		const customHandler = jest.fn();
		const handler = makeN8nLlmFailedAttemptHandler(ctx, customHandler);

		const error = new Error('Test error');
		(error as any).retriesLeft = 1;

		expect(() => handler(error)).not.toThrow();
	});

	it('should throw NodeApiError if no retries are left', () => {
		const handler = makeN8nLlmFailedAttemptHandler(ctx);

		const error = new Error('Test error');
		(error as any).retriesLeft = 0;

		expect(() => handler(error)).toThrow(NodeApiError);
	});

	it('should throw NodeApiError if no retries are left with custom handler', () => {
		const customHandler = jest.fn();
		const handler = makeN8nLlmFailedAttemptHandler(ctx, customHandler);

		const error = new Error('Test error');
		(error as any).retriesLeft = 0;

		expect(() => handler(error)).toThrow(NodeApiError);
		expect(customHandler).toHaveBeenCalled();
	});
});
