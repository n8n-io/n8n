import { mockLogger } from '@n8n/backend-test-utils';
import type { OperationContext } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentSessionLeaseLostError } from '../agent-session-lease-lost.error';
import { AgentSessionLeaseService, withLeaseSignal } from '../agent-session-lease.service';
import { AgentTurnAlreadyRunningError } from '../agent-turn-already-running.error';
import type { AgentSessionLeaseRepository } from '../repositories/agent-session-lease.repository';

const request = { threadId: 'thread-1', agentId: 'agent-1', executionId: 'execution-1' };
const ctx: OperationContext = {};

describe('AgentSessionLeaseService', () => {
	const repository = mock<AgentSessionLeaseRepository>();
	let service: AgentSessionLeaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		repository.acquire.mockResolvedValue({ acquired: true, epoch: 3, previousExecutionId: null });
		repository.renew.mockResolvedValue(true);
		repository.release.mockResolvedValue(true);
		service = new AgentSessionLeaseService(
			mockLogger(),
			repository,
			mock<InstanceSettings>({ hostId: 'main-1' }),
		);
	});

	async function holdLease() {
		const grant = await service.acquire(request, ctx);
		return { grant, signal: service.hold(grant) };
	}

	it('acquires the lease for this main and returns the grant', async () => {
		repository.acquire.mockResolvedValue({
			acquired: true,
			epoch: 4,
			previousExecutionId: 'execution-0',
		});

		const grant = await service.acquire(request, ctx);

		expect(repository.acquire).toHaveBeenCalledWith(
			expect.objectContaining({ ...request, ownerHostId: 'main-1', ownerToken: grant.ownerToken }),
			120_000,
			ctx,
		);
		expect(grant).toMatchObject({ ...request, epoch: 4, previousExecutionId: 'execution-0' });
	});

	it('rejects as busy when another turn holds the session', async () => {
		repository.acquire.mockResolvedValue({ acquired: false });

		await expect(service.acquire(request, ctx)).rejects.toBeInstanceOf(
			AgentTurnAlreadyRunningError,
		);
	});

	it('refuses a session while an older local turn on it is still settling', async () => {
		await holdLease();

		await expect(
			service.acquire({ ...request, executionId: 'execution-2' }, ctx),
		).rejects.toBeInstanceOf(AgentTurnAlreadyRunningError);
		expect(repository.acquire).toHaveBeenCalledOnce();
	});

	it('aborts the turn after two failed renewals in a row', async () => {
		const { signal } = await holdLease();
		repository.renew.mockRejectedValue(new Error('database unavailable'));

		await service.renew(request.threadId, request.executionId);
		expect(signal.aborted).toBe(false);
		await service.renew(request.threadId, request.executionId);

		expect(signal.aborted).toBe(true);
		expect(signal.reason).toBeInstanceOf(AgentSessionLeaseLostError);
		expect(service.isLost(request.threadId, request.executionId)).toBe(true);
	});

	it('counts a renewal that is still in progress at the next heartbeat as failed', async () => {
		const { signal } = await holdLease();
		const pending = createDeferredPromise<boolean>();
		repository.renew.mockReturnValueOnce(pending.promise);

		const firstRenewal = service.renew(request.threadId, request.executionId);
		await service.renew(request.threadId, request.executionId);
		await service.renew(request.threadId, request.executionId);

		expect(signal.aborted).toBe(true);
		pending.resolve(true);
		await firstRenewal;
	});

	it('aborts the turn at once when another main took over the lease', async () => {
		const { signal } = await holdLease();
		repository.renew.mockResolvedValue(false);

		await service.renew(request.threadId, request.executionId);

		expect(signal.reason).toBeInstanceOf(AgentSessionLeaseLostError);
	});

	it('resets the failure count after a successful renewal', async () => {
		const { signal } = await holdLease();
		repository.renew
			.mockRejectedValueOnce(new Error('database unavailable'))
			.mockResolvedValueOnce(true)
			.mockRejectedValueOnce(new Error('database unavailable'));

		await service.renew(request.threadId, request.executionId);
		await service.renew(request.threadId, request.executionId);
		await service.renew(request.threadId, request.executionId);

		expect(signal.aborted).toBe(false);
	});

	it('frees the local slot even when the release query fails', async () => {
		const { grant } = await holdLease();
		repository.release.mockRejectedValue(new Error('database unavailable'));

		await service.release(request.threadId, request.executionId);

		expect(repository.release).toHaveBeenCalledWith(request.threadId, grant.ownerToken);
		await expect(service.acquire(request, ctx)).resolves.toMatchObject(request);
	});

	it('ignores renewals and releases for an execution that does not hold the lease', async () => {
		await holdLease();

		await service.renew(request.threadId, 'other-execution');
		await service.release(request.threadId, 'other-execution');

		expect(repository.renew).not.toHaveBeenCalled();
		expect(repository.release).not.toHaveBeenCalled();
	});
});

describe('withLeaseSignal', () => {
	it('uses the lease signal when the turn has no signal', () => {
		const lease = new AbortController();

		expect(withLeaseSignal(undefined, lease.signal)).toBe(lease.signal);
	});

	it.each(['turn', 'lease'] as const)('aborts when the %s signal aborts', (source) => {
		const controllers = { turn: new AbortController(), lease: new AbortController() };
		const combined = withLeaseSignal(controllers.turn.signal, controllers.lease.signal);

		controllers[source].abort();

		expect(combined.aborted).toBe(true);
	});
});
