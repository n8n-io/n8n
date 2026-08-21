import type { Logger } from '@n8n/backend-common';
import type { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { PollerFailureState, PollerStateRepository } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import {
	computeBackoffDelayMs,
	MAX_BACKOFF_MS,
	RETRY_AFTER_MAX_MS,
} from '@/workflows/triggers/poll-backoff-policy';
import { PollBackoffService } from '@/workflows/triggers/poll-backoff.service';

describe('PollBackoffService', () => {
	const pollerStateRepository = mock<PollerStateRepository>();
	const errorReporter = mock<ErrorReporter>();

	const scopedLogger = mock<Logger>();
	const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const buildService = (durableCursorsEnabled = true, chainEnabled = true) =>
		new PollBackoffService(
			pollerStateRepository,
			mock<SchedulerConfig>({
				enabled: chainEnabled,
				enabledForPollTriggers: chainEnabled,
				durableCursorsEnabled,
			}),
			mock<WorkflowsConfig>({ useWorkflowPublicationService: chainEnabled }),
			rootLogger,
			errorReporter,
		);

	const now = new Date('2026-08-05T12:00:00.000Z');

	const expectErrorReported = (error: Error) =>
		expect(errorReporter.error).toHaveBeenCalledWith(
			error,
			expect.objectContaining({
				extra: expect.objectContaining({ workflowId: 'wf-1', nodeId: 'node-1' }),
			}),
		);

	beforeEach(() => {
		vi.resetAllMocks();
		rootLogger.scoped.mockReturnValue(scopedLogger);
	});

	describe('enabled', () => {
		test('reports the configured flag', () => {
			expect(buildService(true).enabled).toBe(true);
			expect(buildService(false).enabled).toBe(false);
		});

		test('stays off while the durable poller chain is off, matching PollCursorService', () => {
			expect(buildService(true, false).enabled).toBe(false);
		});
	});

	describe('getFailureState', () => {
		test('does not query when the flag is off', async () => {
			const service = buildService(false);

			await expect(service.getFailureState('wf-1', 'node-1')).resolves.toBeNull();

			expect(pollerStateRepository.findFailureState).not.toHaveBeenCalled();
		});

		test('returns the stored failure state when the flag is on', async () => {
			const state: PollerFailureState = { consecutiveErrors: 2, backoffUntil: now };
			pollerStateRepository.findFailureState.mockResolvedValue(state);
			const service = buildService();

			await expect(service.getFailureState('wf-1', 'node-1')).resolves.toEqual(state);
		});

		test('returns null for a node with no stored row', async () => {
			pollerStateRepository.findFailureState.mockResolvedValue(null);
			const service = buildService();

			await expect(service.getFailureState('wf-1', 'node-1')).resolves.toBeNull();
		});

		test('swallows a failing read and reports it, returning null instead of throwing', async () => {
			const readError = new Error('poller state read failed');
			pollerStateRepository.findFailureState.mockRejectedValue(readError);
			const service = buildService();

			await expect(service.getFailureState('wf-1', 'node-1')).resolves.toBeNull();

			expectErrorReported(readError);
		});
	});

	describe('isBackingOff', () => {
		const service = buildService();

		test.each<[string, PollerFailureState | null]>([
			['a null state', null],
			['backoffUntil null', { consecutiveErrors: 1, backoffUntil: null }],
			[
				'backoffUntil already passed',
				{ consecutiveErrors: 1, backoffUntil: new Date(now.getTime() - 1) },
			],
			[
				'backoffUntil past the RETRY_AFTER_MAX_MS ceiling',
				{
					consecutiveErrors: 1,
					backoffUntil: new Date(now.getTime() + RETRY_AFTER_MAX_MS + 60_000),
				},
			],
			[
				'backoffUntil exactly at now',
				{ consecutiveErrors: 1, backoffUntil: new Date(now.getTime()) },
			],
			[
				'backoffUntil not a Date',
				{ consecutiveErrors: 1, backoffUntil: now.toISOString() } as unknown as PollerFailureState,
			],
			['backoffUntil an invalid Date', { consecutiveErrors: 1, backoffUntil: new Date(NaN) }],
		])('is false for %s', (_name, state) => {
			expect(() => service.isBackingOff(state, now)).not.toThrow();
			expect(service.isBackingOff(state, now)).toBe(false);
		});

		test.each<[string, number]>([
			['a deadline in the near future', 60_000],
			['exactly at the RETRY_AFTER_MAX_MS clamp boundary', RETRY_AFTER_MAX_MS],
		])('is true for %s', (_name, deltaMs) => {
			const backoffUntil = new Date(now.getTime() + deltaMs);

			expect(service.isBackingOff({ consecutiveErrors: 1, backoffUntil }, now)).toBe(true);
		});

		test('honours a Retry-After deadline beyond MAX_BACKOFF_MS but within RETRY_AFTER_MAX_MS', () => {
			const backoffUntil = new Date(now.getTime() + 40 * 60_000);

			expect(backoffUntil.getTime() - now.getTime()).toBeGreaterThan(MAX_BACKOFF_MS);
			expect(service.isBackingOff({ consecutiveErrors: 1, backoffUntil }, now)).toBe(true);
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

		test.each<[string, PollerFailureState | null, number]>([
			['a first failure', null, 1],
			['a repeated failure', { consecutiveErrors: 3, backoffUntil: null }, 4],
		])('increments the stored count for %s', async (_name, state, expectedCount) => {
			const service = buildService();

			await recordFailure(service, { state });

			const expectedDelayMs = computeBackoffDelayMs({
				type: 'transient',
				consecutiveErrors: expectedCount,
				retryAfterMs: null,
			});
			expect(pollerStateRepository.recordFailure).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				expectedDelayMs,
			);
		});

		test('sends a permanent failure straight to the ceiling', async () => {
			const service = buildService();
			const httpError = Object.assign(new Error('unauthorized'), { httpCode: '401' });

			await recordFailure(service, { state: null, error: httpError });

			const [, , delayMs] = pollerStateRepository.recordFailure.mock.calls[0];
			expect(delayMs).toBe(MAX_BACKOFF_MS);
		});

		test('swallows and reports a failing write instead of throwing', async () => {
			const writeError = new Error('poller state write failed');
			pollerStateRepository.recordFailure.mockRejectedValue(writeError);
			const service = buildService();

			await expect(recordFailure(service)).resolves.toBeUndefined();

			expectErrorReported(writeError);
		});

		test('is a no-op, not a throw, and does not log at warn when the row is missing at failure time', async () => {
			pollerStateRepository.recordFailure.mockResolvedValue(false);
			const service = buildService();

			await expect(recordFailure(service)).resolves.toBeUndefined();

			expect(errorReporter.error).not.toHaveBeenCalled();
			expect(scopedLogger.warn).not.toHaveBeenCalled();
			expect(scopedLogger.debug).toHaveBeenCalled();
		});

		test('logs the failure class, count and delay at warn', async () => {
			pollerStateRepository.recordFailure.mockResolvedValue(true);
			const service = buildService();

			await recordFailure(service, { state: { consecutiveErrors: 1, backoffUntil: null } });

			expect(scopedLogger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					consecutiveErrors: 2,
					type: 'transient',
					delayMs: expect.any(Number),
				}),
			);
		});

		test('logs the declared cause at warn when the node declared one', async () => {
			pollerStateRepository.recordFailure.mockResolvedValue(true);
			const service = buildService();
			const error = Object.assign(new Error('slow down'), {
				failure: { cause: 'rate-limited' },
			});

			await recordFailure(service, { state: null, error });

			expect(scopedLogger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ type: 'transient', cause: 'rate-limited' }),
			);
		});

		test('still backs off when the error throws on property access', async () => {
			const service = buildService();
			const hostileError: Record<string, unknown> = {};
			Object.defineProperty(hostileError, 'httpCode', {
				get(): never {
					throw new Error('trap');
				},
			});

			await expect(
				recordFailure(service, { state: null, error: hostileError }),
			).resolves.toBeUndefined();

			const expectedDelayMs = computeBackoffDelayMs({
				type: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: null,
			});
			expect(pollerStateRepository.recordFailure).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				expectedDelayMs,
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

		test.each<[string, PollerFailureState | null]>([
			['a null state, since a null read is indistinguishable from a failed one', null],
			['a dirty state', { consecutiveErrors: 2, backoffUntil: now }],
		])('issues a write for %s', async (_name, state) => {
			const service = buildService();

			await recordSuccess(service, state);

			expect(pollerStateRepository.clearFailures).toHaveBeenCalledWith('wf-1', 'node-1');
		});

		test('issues no write when the state is already clean', async () => {
			const service = buildService();

			await recordSuccess(service, { consecutiveErrors: 0, backoffUntil: null });

			expect(pollerStateRepository.clearFailures).not.toHaveBeenCalled();
		});

		test('swallows and reports a failing write instead of throwing', async () => {
			const writeError = new Error('poller state write failed');
			pollerStateRepository.clearFailures.mockRejectedValue(writeError);
			const service = buildService();

			await expect(
				recordSuccess(service, { consecutiveErrors: 2, backoffUntil: now }),
			).resolves.toBeUndefined();

			expectErrorReported(writeError);
		});
	});

	describe('reset', () => {
		test('does not query when the flag is off', async () => {
			const service = buildService(false);

			await service.reset('wf-1', 'node-1');

			expect(pollerStateRepository.clearFailures).not.toHaveBeenCalled();
		});

		test('clears unconditionally, with no prior state to check', async () => {
			const service = buildService();

			await service.reset('wf-1', 'node-1');

			expect(pollerStateRepository.clearFailures).toHaveBeenCalledWith('wf-1', 'node-1');
		});

		test('swallows and reports a failing write instead of throwing', async () => {
			const writeError = new Error('poller state write failed');
			pollerStateRepository.clearFailures.mockRejectedValue(writeError);
			const service = buildService();

			await expect(service.reset('wf-1', 'node-1')).resolves.toBeUndefined();

			expectErrorReported(writeError);
		});
	});
});
