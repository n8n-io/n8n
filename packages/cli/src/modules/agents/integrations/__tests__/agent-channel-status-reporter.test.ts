import { mockLogger } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { AgentChannelStatus } from '../../entities/agent-channel-status.entity';
import type { AgentChannelStatusRepository } from '../../repositories/agent-channel-status.repository';
import { AgentChannelStatusReporter } from '../agent-channel-status-reporter';

const ref = { agentId: 'agent-1', integrationType: 'slack', credentialId: 'cred-1' };
const INTERVAL_SECONDS = 60;

function build(intervalSeconds = INTERVAL_SECONDS) {
	const repository = mock<AgentChannelStatusRepository>();
	const agentsConfig = Object.assign(new AgentsConfig(), {
		channelReconcileIntervalSeconds: intervalSeconds,
	});
	const reporter = new AgentChannelStatusReporter(mockLogger(), agentsConfig, repository);

	return { reporter, repository };
}

function savedObservation(repository: ReturnType<typeof mock<AgentChannelStatusRepository>>) {
	return repository.saveOwn.mock.calls[0][1];
}

describe('AgentChannelStatusReporter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('recording what this instance observed', () => {
		it('records a running channel with nothing to retry', async () => {
			const { reporter, repository } = build();

			await reporter.recordConnected(ref);

			expect(repository.saveOwn).toHaveBeenCalledWith(ref, {
				status: 'connected',
				errorMessage: null,
				attempts: 0,
				backoffUntil: null,
				expiresAt: expect.any(Date),
			});
		});

		it('records a failure with its cause and a retry deadline', async () => {
			const { reporter, repository } = build();
			repository.findOwnChannel.mockResolvedValue(null);

			await reporter.recordFailure(ref, new Error('Credential cred-1 not found'));

			expect(savedObservation(repository)).toMatchObject({
				status: 'error',
				errorMessage: 'Credential cred-1 not found',
				attempts: 1,
			});
			expect(savedObservation(repository).backoffUntil).toBeInstanceOf(Date);
		});

		it('counts consecutive failures of this instance', async () => {
			const { reporter, repository } = build();
			repository.findOwnChannel.mockResolvedValue({
				status: 'error',
				attempts: 4,
			} as AgentChannelStatus);

			await reporter.recordFailure(ref, new Error('boom'));

			expect(savedObservation(repository)).toMatchObject({ attempts: 5 });
		});

		it('starts counting again after a success', async () => {
			const { reporter, repository } = build();
			repository.findOwnChannel.mockResolvedValue({
				status: 'connected',
				attempts: 0,
			} as AgentChannelStatus);

			await reporter.recordFailure(ref, new Error('boom'));

			expect(savedObservation(repository)).toMatchObject({ attempts: 1 });
		});

		it('scrubs credential material out of the message it persists', async () => {
			// A failed Telegram request quotes the API URL, and the bot token is in
			// that path. This message is stored and served to the UI.
			const { reporter, repository } = build();
			repository.findOwnChannel.mockResolvedValue(null);

			await reporter.recordFailure(
				ref,
				new Error(
					'request to https://api.telegram.org/bot123456789:AAFakeTokenValueForTestingOnly12345/setWebhook failed',
				),
			);

			const { errorMessage } = savedObservation(repository);
			expect(errorMessage).not.toContain('AAFakeTokenValueForTestingOnly12345');
			expect(errorMessage).toContain('setWebhook');
		});

		it('describes a non-Error cause rather than dropping it', async () => {
			const { reporter, repository } = build();
			repository.findOwnChannel.mockResolvedValue(null);

			await reporter.recordFailure(ref, 'adapter exploded');

			expect(savedObservation(repository)).toMatchObject({ errorMessage: 'adapter exploded' });
		});
	});

	describe('retry backoff', () => {
		it('grows the wait with each consecutive failure', async () => {
			const { reporter, repository } = build();
			const deadlineAfter = async (attempts: number) => {
				repository.saveOwn.mockClear();
				repository.findOwnChannel.mockResolvedValue({
					status: 'error',
					attempts: attempts - 1,
				} as AgentChannelStatus);
				await reporter.recordFailure(ref, new Error('boom'));
				const { backoffUntil } = savedObservation(repository);
				return backoffUntil!.getTime() - Date.now();
			};

			const first = await deadlineAfter(1);
			const third = await deadlineAfter(3);

			expect(first).toBeLessThanOrEqual(INTERVAL_SECONDS * Time.seconds.toMilliseconds);
			expect(third).toBeGreaterThan(first);
		});

		it('caps the wait so a user who fixes the cause is not left waiting', async () => {
			const { reporter, repository } = build();
			repository.findOwnChannel.mockResolvedValue({
				status: 'error',
				attempts: 40,
			} as AgentChannelStatus);

			await reporter.recordFailure(ref, new Error('boom'));

			const { backoffUntil } = savedObservation(repository);
			expect(backoffUntil!.getTime() - Date.now()).toBeLessThanOrEqual(
				10 * Time.minutes.toMilliseconds,
			);
		});

		it('treats a channel with no deadline as ready', () => {
			const { reporter } = build();

			expect(reporter.isRetryReady(undefined, new Date())).toBe(true);
			expect(reporter.isRetryReady({ backoffUntil: null }, new Date())).toBe(true);
		});

		it('holds a channel back until its deadline passes', () => {
			const { reporter } = build();
			const now = new Date('2026-01-01T00:00:00.000Z');

			expect(
				reporter.isRetryReady({ backoffUntil: new Date('2026-01-01T00:00:01.000Z') }, now),
			).toBe(false);
			expect(
				reporter.isRetryReady({ backoffUntil: new Date('2025-12-31T23:59:59.000Z') }, now),
			).toBe(true);
		});
	});

	describe('leases', () => {
		it('sets an expiry a few reconcile intervals out, so a missed pass is survivable', async () => {
			const { reporter, repository } = build();

			await reporter.recordConnected(ref);

			const { expiresAt } = savedObservation(repository);
			const aheadMs = expiresAt!.getTime() - Date.now();
			expect(aheadMs).toBeGreaterThan(INTERVAL_SECONDS * Time.seconds.toMilliseconds);
		});

		it('sets no expiry when reconciliation is off, because nothing would refresh it', async () => {
			const { reporter, repository } = build(0);

			await reporter.recordConnected(ref);

			expect(savedObservation(repository)).toMatchObject({ expiresAt: null });
		});

		it('treats a row with no expiry as live', () => {
			const { reporter } = build();

			expect(reporter.isLive({ expiresAt: null }, new Date())).toBe(true);
		});

		it('treats a row past its expiry as gone', () => {
			const { reporter } = build();
			const now = new Date('2026-01-01T00:00:00.000Z');

			expect(reporter.isLive({ expiresAt: new Date('2025-12-31T23:59:59.000Z') }, now)).toBe(false);
			expect(reporter.isLive({ expiresAt: new Date('2026-01-01T00:00:01.000Z') }, now)).toBe(true);
		});

		it('refreshes a lease without touching the retry deadline', async () => {
			const { reporter, repository } = build();

			await reporter.refreshLease(ref);

			expect(repository.refreshOwnLease).toHaveBeenCalledWith(ref, expect.any(Date));
			expect(repository.saveOwn).not.toHaveBeenCalled();
		});
	});

	describe('withdrawing on the way out', () => {
		it.each([
			['recordConnected', async (r: AgentChannelStatusReporter) => await r.recordConnected(ref)],
			[
				'recordFailure',
				async (r: AgentChannelStatusReporter) => await r.recordFailure(ref, new Error('boom')),
			],
			['refreshLease', async (r: AgentChannelStatusReporter) => await r.refreshLease(ref)],
		])('ignores a late %s, so nothing is left behind for a lease', async (_name, call) => {
			// A startup that shutdown stopped waiting for finishes after the
			// withdrawal and reports what it found. Writing it would leave the channel
			// reported against an instance that is gone until its lease expires.
			const { reporter, repository } = build();

			await reporter.withdrawAll();
			await call(reporter);

			expect(repository.saveOwn).not.toHaveBeenCalled();
			expect(repository.refreshOwnLease).not.toHaveBeenCalled();
		});

		it('seals even when clearing the rows fails, because the process is still leaving', async () => {
			const { reporter, repository } = build();
			repository.clearOwnHost.mockRejectedValue(new Error('database is down'));

			await reporter.withdrawAll();
			await reporter.recordConnected(ref);

			expect(repository.saveOwn).not.toHaveBeenCalled();
		});
	});

	describe('never failing the operation it reports on', () => {
		it.each([
			['recordConnected', async (r: AgentChannelStatusReporter) => await r.recordConnected(ref)],
			[
				'recordFailure',
				async (r: AgentChannelStatusReporter) => await r.recordFailure(ref, new Error('boom')),
			],
			['refreshLease', async (r: AgentChannelStatusReporter) => await r.refreshLease(ref)],
			['withdraw', async (r: AgentChannelStatusReporter) => await r.withdraw(ref)],
			['withdrawAll', async (r: AgentChannelStatusReporter) => await r.withdrawAll()],
		])('swallows a database failure in %s', async (_name, call) => {
			const { reporter, repository } = build();
			const down = new Error('database is down');
			repository.saveOwn.mockRejectedValue(down);
			repository.findOwnChannel.mockRejectedValue(down);
			repository.refreshOwnLease.mockRejectedValue(down);
			repository.clearOwnChannel.mockRejectedValue(down);
			repository.clearOwnHost.mockRejectedValue(down);

			await expect(call(reporter)).resolves.toBeUndefined();
		});
	});
});
