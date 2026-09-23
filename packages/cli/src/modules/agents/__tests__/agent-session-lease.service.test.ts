import { mockLogger } from '@n8n/backend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { AgentSessionLeaseLostError } from '../agent-session-lease-lost.error';
import { AgentSessionLeaseService, withLeaseSignal } from '../agent-session-lease.service';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const executionId = 'execution-1';

describe('AgentSessionLeaseService', () => {
	const executionRepository = mock<AgentExecutionRepository>();
	let service: AgentSessionLeaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		executionRepository.touchRunning.mockResolvedValue(true);
		service = new AgentSessionLeaseService(mockLogger(), executionRepository);
	});

	it('renews the lease with a heartbeat of the execution', async () => {
		const signal = service.hold(executionId);

		await service.renew(executionId);

		expect(executionRepository.touchRunning).toHaveBeenCalledWith(executionId);
		expect(signal.aborted).toBe(false);
	});

	it('aborts the turn at once when its execution no longer runs', async () => {
		const signal = service.hold(executionId);
		executionRepository.touchRunning.mockResolvedValue(false);

		await service.renew(executionId);

		expect(signal.reason).toBeInstanceOf(AgentSessionLeaseLostError);
	});

	it('aborts the turn after two failed renewals in a row', async () => {
		const signal = service.hold(executionId);
		executionRepository.touchRunning.mockRejectedValue(new Error('database unavailable'));

		await service.renew(executionId);
		expect(signal.aborted).toBe(false);
		await service.renew(executionId);

		expect(signal.reason).toBeInstanceOf(AgentSessionLeaseLostError);
	});

	it('counts a renewal that is still in progress at the next heartbeat as failed', async () => {
		const signal = service.hold(executionId);
		const pending = createDeferredPromise<boolean>();
		executionRepository.touchRunning.mockReturnValueOnce(pending.promise);

		const firstRenewal = service.renew(executionId);
		await service.renew(executionId);
		await service.renew(executionId);

		expect(signal.aborted).toBe(true);
		pending.resolve(true);
		await firstRenewal;
	});

	it('resets the failure count after a successful renewal', async () => {
		const signal = service.hold(executionId);
		executionRepository.touchRunning
			.mockRejectedValueOnce(new Error('database unavailable'))
			.mockResolvedValueOnce(true)
			.mockRejectedValueOnce(new Error('database unavailable'));

		await service.renew(executionId);
		await service.renew(executionId);
		await service.renew(executionId);

		expect(signal.aborted).toBe(false);
	});

	it('forgets a released lease without a database call', async () => {
		service.hold(executionId);

		service.release(executionId);
		await service.renew(executionId);

		expect(service.isHeld(executionId)).toBe(false);
		expect(executionRepository.touchRunning).not.toHaveBeenCalled();
	});

	it('ignores renewals and releases for an execution that holds no lease', async () => {
		service.hold(executionId);

		await service.renew('other-execution');
		service.release('other-execution');

		expect(executionRepository.touchRunning).not.toHaveBeenCalled();
		expect(service.isHeld(executionId)).toBe(true);
	});
});

describe('withLeaseSignal', () => {
	it('uses the lease signal when the turn has no signal', () => {
		const lease = new AbortController();

		expect(withLeaseSignal(undefined, lease.signal)).toBe(lease.signal);
	});

	it('keeps the turn signal when the turn has no lease', () => {
		const turn = new AbortController();

		expect(withLeaseSignal(turn.signal, undefined)).toBe(turn.signal);
		expect(withLeaseSignal(undefined, undefined)).toBeUndefined();
	});

	it.each(['turn', 'lease'] as const)('aborts when the %s signal aborts', (source) => {
		const controllers = { turn: new AbortController(), lease: new AbortController() };
		const combined = withLeaseSignal(controllers.turn.signal, controllers.lease.signal);

		controllers[source].abort();

		expect(combined?.aborted).toBe(true);
	});
});
