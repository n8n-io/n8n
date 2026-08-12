import type { OperatorLogFilter } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { LeaseManagerService } from '../consumer/lease-manager.service';
import type { OperatorConsoleConfig } from '../operator-console.config';

const LEASE_TTL_MS = 30_000;
const HEARTBEAT_MS = LEASE_TTL_MS / 2;

describe('LeaseManagerService', () => {
	let publisher: MockProxy<Publisher>;
	let leaseManager: LeaseManagerService;

	const setup = ({
		mode = 'queue',
		instanceType = 'main',
	}: { mode?: 'queue' | 'regular'; instanceType?: 'main' | 'worker' | 'webhook' } = {}) => {
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);

		leaseManager = new LeaseManagerService(
			mockLogger(),
			publisher,
			mock<OperatorConsoleConfig>({ leaseTtlMs: LEASE_TTL_MS }),
			mock<InstanceSettings>({ instanceType }),
			mock<ExecutionsConfig>({ mode }),
		);
	};

	const publishedFilters = () =>
		publisher.publishCommand.mock.calls.map(([msg]) =>
			msg.command === 'log-tail-start' ? msg.payload.filter : undefined,
		);

	beforeEach(() => {
		vi.useFakeTimers();
		setup();
	});

	afterEach(() => {
		leaseManager.shutdown();
		vi.useRealTimers();
	});

	describe('open', () => {
		it('should arm the lease immediately rather than waiting for a heartbeat', async () => {
			leaseManager.open('session-1', { minLevel: 'warn' });
			await vi.advanceTimersByTimeAsync(0);

			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'log-tail-start',
				payload: { filter: { minLevel: 'warn' }, ttlMs: LEASE_TTL_MS },
			});
		});

		it('should re-publish when a second console opens with a different filter', async () => {
			leaseManager.open('session-1', { minLevel: 'error' });
			leaseManager.open('session-2', { minLevel: 'debug' });
			await vi.advanceTimersByTimeAsync(0);

			expect(publishedFilters().at(-1)).toEqual({ minLevel: 'debug' });
		});

		it('should replace the filter when the same session re-opens', async () => {
			leaseManager.open('session-1', { grep: 'alpha' });
			leaseManager.open('session-1', { grep: 'beta' });
			await vi.advanceTimersByTimeAsync(0);

			expect(leaseManager.activeFilter()).toEqual({ grep: 'beta' });
			expect(publishedFilters().at(-1)).toEqual({ grep: 'beta' });
		});
	});

	describe('heartbeat', () => {
		it('should re-arm at half the TTL so one missed beat cannot lapse the lease', async () => {
			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(0);
			publisher.publishCommand.mockClear();

			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(4);
		});

		it('should run a single heartbeat regardless of how many consoles are open', async () => {
			leaseManager.open('session-1', {});
			leaseManager.open('session-2', {});
			leaseManager.open('session-3', {});
			await vi.advanceTimersByTimeAsync(0);
			publisher.publishCommand.mockClear();

			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);

			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
		});

		it('should keep beating through a publish failure', async () => {
			publisher.publishCommand.mockRejectedValueOnce(new Error('Redis unreachable'));

			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);

			expect(publisher.publishCommand).toHaveBeenCalledTimes(2);
		});
	});

	describe('close', () => {
		it('should stop the heartbeat when the last console closes', async () => {
			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(0);

			leaseManager.close('session-1');
			publisher.publishCommand.mockClear();

			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 5);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(leaseManager.activeFilter()).toBeUndefined();
		});

		it('should not publish a final lease on close — producers lapse on their own', async () => {
			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(0);
			publisher.publishCommand.mockClear();

			leaseManager.close('session-1');
			await vi.advanceTimersByTimeAsync(0);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('should narrow the lease immediately when one of several consoles closes', async () => {
			leaseManager.open('session-1', { minLevel: 'debug' });
			leaseManager.open('session-2', { minLevel: 'error' });
			await vi.advanceTimersByTimeAsync(0);
			publisher.publishCommand.mockClear();

			leaseManager.close('session-1');
			await vi.advanceTimersByTimeAsync(0);

			expect(publishedFilters()).toEqual([{ minLevel: 'error' }]);
		});

		it('should ignore an unknown session', async () => {
			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(0);
			publisher.publishCommand.mockClear();

			leaseManager.close('never-opened');
			await vi.advanceTimersByTimeAsync(0);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(leaseManager.activeFilter()).toEqual({});
		});

		it('should re-arm from scratch when a console opens again', async () => {
			leaseManager.open('session-1', {});
			leaseManager.close('session-1');
			publisher.publishCommand.mockClear();

			leaseManager.open('session-2', { grep: 'boom' });
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);

			expect(publisher.publishCommand).toHaveBeenCalledTimes(2);
			expect(publishedFilters().at(-1)).toEqual({ grep: 'boom' });
		});
	});

	describe('activeFilter', () => {
		it('should be undefined with no console open', () => {
			expect(leaseManager.activeFilter()).toBeUndefined();
		});

		it('should union every open console so none is starved', () => {
			const sessionA: OperatorLogFilter = { minLevel: 'error', hostIds: ['worker-1'] };
			const sessionB: OperatorLogFilter = { minLevel: 'warn', hostIds: ['worker-2'] };

			leaseManager.open('a', sessionA);
			leaseManager.open('b', sessionB);

			expect(leaseManager.activeFilter()).toEqual({
				minLevel: 'warn',
				hostIds: ['worker-1', 'worker-2'],
			});
		});

		it('should drop every constraint when one console asks for everything', () => {
			leaseManager.open('a', { minLevel: 'error', grep: 'boom', roles: ['worker'] });
			leaseManager.open('b', {});

			expect(leaseManager.activeFilter()).toEqual({});
		});
	});

	describe('when the lease is a no-op', () => {
		it('should publish nothing outside queue mode', async () => {
			setup({ mode: 'regular' });

			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(leaseManager.activeFilter()).toBeUndefined();
		});

		it('should publish nothing on a non-main instance', async () => {
			setup({ instanceType: 'worker' });

			leaseManager.open('session-1', {});
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});
});
