import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import { WebhookPathTakenError } from 'n8n-workflow';

import {
	isTransientActivationError,
	retryTriggerActivation,
} from '@/workflows/triggers/trigger-activation-retry';

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn(),
}));

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

const MAX_ATTEMPTS = 3;

describe('retryTriggerActivation', () => {
	const signal = new AbortController().signal;

	beforeEach(() => vi.clearAllMocks());

	test('resolves without retrying when activation succeeds', async () => {
		const activate = vi.fn().mockResolvedValue(undefined);

		await retryTriggerActivation(activate, MAX_ATTEMPTS, signal);

		expect(activate).toHaveBeenCalledTimes(1);
	});

	test('retries a transient failure and resolves when it recovers within the budget', async () => {
		const activate = vi
			.fn()
			.mockRejectedValueOnce(new Error('transient'))
			.mockResolvedValueOnce(undefined);

		await retryTriggerActivation(activate, MAX_ATTEMPTS, signal);

		expect(activate).toHaveBeenCalledTimes(2);
	});

	test('retries up to the budget and rethrows when a transient failure never recovers', async () => {
		const error = new Error('transient');
		const activate = vi.fn().mockRejectedValue(error);

		await expect(retryTriggerActivation(activate, MAX_ATTEMPTS, signal)).rejects.toBe(error);
		expect(activate).toHaveBeenCalledTimes(MAX_ATTEMPTS);
	});

	test('rethrows a deterministic error without retrying', async () => {
		const error = new WebhookPathTakenError('Webhook');
		const activate = vi.fn().mockRejectedValue(error);

		await expect(retryTriggerActivation(activate, MAX_ATTEMPTS, signal)).rejects.toBe(error);
		expect(activate).toHaveBeenCalledTimes(1);
	});

	test('stops sleeping and rethrows the abort reason when the signal fires during backoff', async () => {
		vi.mocked(sleep).mockImplementationOnce(
			async (_ms, sleepSignal) =>
				await new Promise((_resolve, reject) => {
					sleepSignal?.addEventListener('abort', () => reject(ensureError(sleepSignal.reason)), {
						once: true,
					});
				}),
		);
		const activate = vi.fn().mockRejectedValue(new Error('transient'));
		const controller = new AbortController();

		const retrying = retryTriggerActivation(activate, MAX_ATTEMPTS, controller.signal);
		await flushPromises();
		controller.abort(new Error('deadline'));

		await expect(retrying).rejects.toThrow('deadline');
		expect(activate).toHaveBeenCalledTimes(1);
		expect(sleep).toHaveBeenCalledWith(expect.any(Number), controller.signal);
	});
});

describe('isTransientActivationError', () => {
	test('is false only for a webhook path conflict', () => {
		expect(isTransientActivationError(new WebhookPathTakenError('Webhook'))).toBe(false);
		expect(isTransientActivationError(new Error('transient'))).toBe(true);
	});
});
