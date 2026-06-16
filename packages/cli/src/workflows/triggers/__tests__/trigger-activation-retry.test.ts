import { WebhookPathTakenError } from 'n8n-workflow';

import {
	isTransientActivationError,
	retryTriggerActivation,
} from '@/workflows/triggers/trigger-activation-retry';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn(),
}));

const MAX_ATTEMPTS = 3;

describe('retryTriggerActivation', () => {
	beforeEach(() => jest.clearAllMocks());

	test('resolves without retrying when activation succeeds', async () => {
		const activate = jest.fn().mockResolvedValue(undefined);

		await retryTriggerActivation(activate, MAX_ATTEMPTS);

		expect(activate).toHaveBeenCalledTimes(1);
	});

	test('retries a transient failure and resolves when it recovers within the budget', async () => {
		const activate = jest
			.fn()
			.mockRejectedValueOnce(new Error('transient'))
			.mockResolvedValueOnce(undefined);

		await retryTriggerActivation(activate, MAX_ATTEMPTS);

		expect(activate).toHaveBeenCalledTimes(2);
	});

	test('retries up to the budget and rethrows when a transient failure never recovers', async () => {
		const error = new Error('transient');
		const activate = jest.fn().mockRejectedValue(error);

		await expect(retryTriggerActivation(activate, MAX_ATTEMPTS)).rejects.toBe(error);
		expect(activate).toHaveBeenCalledTimes(MAX_ATTEMPTS);
	});

	test('rethrows a deterministic error without retrying', async () => {
		const error = new WebhookPathTakenError('Webhook');
		const activate = jest.fn().mockRejectedValue(error);

		await expect(retryTriggerActivation(activate, MAX_ATTEMPTS)).rejects.toBe(error);
		expect(activate).toHaveBeenCalledTimes(1);
	});
});

describe('isTransientActivationError', () => {
	test('is false only for a webhook path conflict', () => {
		expect(isTransientActivationError(new WebhookPathTakenError('Webhook'))).toBe(false);
		expect(isTransientActivationError(new Error('transient'))).toBe(true);
	});
});
