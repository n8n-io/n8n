import type { Logger } from '@n8n/backend-common';
import type { PollerConfig } from '@n8n/config';
import type { PollerFailureState, PollerStateRepository } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { MAX_BACKOFF_MS } from '@/workflows/triggers/poll-backoff-policy';
import { PollBackoffService } from '@/workflows/triggers/poll-backoff.service';

describe('PollBackoffService', () => {
	const pollerStateRepository = mock<PollerStateRepository>();
	const errorReporter = mock<ErrorReporter>();

	const scopedLogger = mock<Logger>();
	const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const buildService = (durableCursorsEnabled = true) =>
		new PollBackoffService(
			pollerStateRepository,
			mock<PollerConfig>({ durableCursorsEnabled }),
			rootLogger,
			errorReporter,
		);

	const now = new Date('2026-08-05T12:00:00.000Z');

	beforeEach(() => {
		vi.resetAllMocks();
		rootLogger.scoped.mockReturnValue(scopedLogger);
	});

	describe('enabled', () => {
		test('reports the configured flag', () => {
			expect(buildService(true).enabled).toBe(true);
			expect(buildService(false).enabled).toBe(false);
		});
	});

	describe('peek', () => {
		test('does not query when the flag is off', async () => {
			const service = buildService(false);

			await expect(service.peek('wf-1', 'node-1')).resolves.toBeNull();

			expect(pollerStateRepository.findFailureState).not.toHaveBeenCalled();
		});

		test('returns the stored failure state when the flag is on', async () => {
			const state: PollerFailureState = { consecutiveErrors: 2, backoffUntil: now };
			pollerStateRepository.findFailureState.mockResolvedValue(state);
			const service = buildService();

			await expect(service.peek('wf-1', 'node-1')).resolves.toEqual(state);
		});

		test('returns null for a node with no stored row', async () => {
			pollerStateRepository.findFailureState.mockResolvedValue(null);
			const service = buildService();

			await expect(service.peek('wf-1', 'node-1')).resolves.toBeNull();
		});

		test('swallows a failing read and reports it, returning null instead of throwing', async () => {
			const readError = new Error('poller state read failed');
			pollerStateRepository.findFailureState.mockRejectedValue(readError);
			const service = buildService();

			await expect(service.peek('wf-1', 'node-1')).resolves.toBeNull();

			expect(errorReporter.error).toHaveBeenCalledWith(
				readError,
				expect.objectContaining({
					extra: expect.objectContaining({ workflowId: 'wf-1', nodeId: 'node-1' }),
				}),
			);
		});
	});

	describe('isBackingOff', () => {
		const service = buildService();

		test('is false for a null state', () => {
			expect(service.isBackingOff(null, now)).toBe(false);
		});

		test('is false when backoffUntil is null', () => {
			expect(service.isBackingOff({ consecutiveErrors: 1, backoffUntil: null }, now)).toBe(false);
		});

		test('is true when backoffUntil is in the future and within MAX_BACKOFF_MS', () => {
			const backoffUntil = new Date(now.getTime() + 60_000);

			expect(service.isBackingOff({ consecutiveErrors: 1, backoffUntil }, now)).toBe(true);
		});

		test('is false when backoffUntil has already passed', () => {
			const backoffUntil = new Date(now.getTime() - 1);

			expect(service.isBackingOff({ consecutiveErrors: 1, backoffUntil }, now)).toBe(false);
		});

		test('ignores a stale deadline further ahead than MAX_BACKOFF_MS', () => {
			const backoffUntil = new Date(now.getTime() + MAX_BACKOFF_MS + 60_000);

			expect(service.isBackingOff({ consecutiveErrors: 1, backoffUntil }, now)).toBe(false);
		});
	});

	describe('recordFailure', () => {
		const recordFailure = async (
			service: PollBackoffService,
			overrides: { state?: PollerFailureState | null; error?: unknown } = {},
		) =>
			await service.recordFailure({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				error: overrides.error ?? new Error('poll source unreachable'),
				state: overrides.state ?? null,
				now,
			});

		test('does not query when the flag is off', async () => {
			const service = buildService(false);

			await recordFailure(service);

			expect(pollerStateRepository.recordFailure).not.toHaveBeenCalled();
		});

		test('increments from zero and stores a computed deadline for a first failure', async () => {
			const service = buildService();

			await recordFailure(service, { state: null });

			expect(pollerStateRepository.recordFailure).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				expect.any(Date),
			);
		});

		test('increments from the stored count for a repeated failure', async () => {
			const service = buildService();

			await recordFailure(service, { state: { consecutiveErrors: 3, backoffUntil: null } });

			const [, , backoffUntil] = pollerStateRepository.recordFailure.mock.calls[0];
			expect(backoffUntil.getTime()).toBeGreaterThan(now.getTime());
		});

		test('sends a permanent failure straight to the ceiling', async () => {
			const service = buildService();
			const httpError = Object.assign(new Error('unauthorized'), { httpCode: '401' });

			await recordFailure(service, { state: null, error: httpError });

			const [, , backoffUntil] = pollerStateRepository.recordFailure.mock.calls[0];
			expect(backoffUntil.getTime()).toBe(now.getTime() + MAX_BACKOFF_MS);
		});

		test('swallows and reports a failing write instead of throwing', async () => {
			const writeError = new Error('poller state write failed');
			pollerStateRepository.recordFailure.mockRejectedValue(writeError);
			const service = buildService();

			await expect(recordFailure(service)).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledWith(
				writeError,
				expect.objectContaining({
					extra: expect.objectContaining({ workflowId: 'wf-1', nodeId: 'node-1' }),
				}),
			);
		});

		test('is a no-op, not a throw, when the row is missing at failure time', async () => {
			pollerStateRepository.recordFailure.mockResolvedValue(false);
			const service = buildService();

			await expect(recordFailure(service)).resolves.toBeUndefined();
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		test('logs the failure class, count and deadline at warn', async () => {
			const service = buildService();

			await recordFailure(service, { state: { consecutiveErrors: 1, backoffUntil: null } });

			expect(scopedLogger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					consecutiveErrors: 2,
					failureClass: 'transient',
					backoffUntil: expect.any(Date),
				}),
			);
		});
	});

	describe('recordSuccess', () => {
		const recordSuccess = async (service: PollBackoffService, state: PollerFailureState | null) =>
			await service.recordSuccess({ workflowId: 'wf-1', nodeId: 'node-1', state });

		test('does not query when the flag is off', async () => {
			const service = buildService(false);

			await recordSuccess(service, { consecutiveErrors: 2, backoffUntil: now });

			expect(pollerStateRepository.clearFailures).not.toHaveBeenCalled();
		});

		test('issues no write when the state is null', async () => {
			const service = buildService();

			await recordSuccess(service, null);

			expect(pollerStateRepository.clearFailures).not.toHaveBeenCalled();
		});

		test('issues no write when the state is already clean', async () => {
			const service = buildService();

			await recordSuccess(service, { consecutiveErrors: 0, backoffUntil: null });

			expect(pollerStateRepository.clearFailures).not.toHaveBeenCalled();
		});

		test('clears a dirty state', async () => {
			const service = buildService();

			await recordSuccess(service, { consecutiveErrors: 2, backoffUntil: now });

			expect(pollerStateRepository.clearFailures).toHaveBeenCalledWith('wf-1', 'node-1');
		});

		test('swallows and reports a failing write instead of throwing', async () => {
			const writeError = new Error('poller state write failed');
			pollerStateRepository.clearFailures.mockRejectedValue(writeError);
			const service = buildService();

			await expect(
				recordSuccess(service, { consecutiveErrors: 2, backoffUntil: now }),
			).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledWith(
				writeError,
				expect.objectContaining({
					extra: expect.objectContaining({ workflowId: 'wf-1', nodeId: 'node-1' }),
				}),
			);
		});
	});
});
