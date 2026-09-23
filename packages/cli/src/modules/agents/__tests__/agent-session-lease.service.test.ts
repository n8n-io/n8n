import { mockLogger } from '@n8n/backend-test-utils';
import type { OperationContext, Transaction, TransactionRunner } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { AgentSessionLeaseLostError } from '../agent-session-lease-lost.error';
import { AgentSessionLeaseService } from '../agent-session-lease.service';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const executionId = 'execution-1';
const ctx: OperationContext = {};
const trxCtx: OperationContext = { trx: mock<Transaction>() };

describe('AgentSessionLeaseService', () => {
	const executionRepository = mock<AgentExecutionRepository>();
	const txRunner = mock<TransactionRunner>();
	let service: AgentSessionLeaseService;

	beforeEach(() => {
		vi.clearAllMocks();
		executionRepository.touchRunning.mockResolvedValue(true);
		executionRepository.isRunning.mockResolvedValue(true);
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn(trxCtx));
		service = new AgentSessionLeaseService(mockLogger(), executionRepository, txRunner);
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

	describe('fenced writes', () => {
		const write = vi.fn(async (_ctx: OperationContext) => 'written');

		const writeInTurn = async () =>
			await service.runInTurn(executionId, async () => await service.fencedWrite(ctx, write));

		it('runs a write outside a turn without the check', async () => {
			await expect(service.fencedWrite(ctx, write)).resolves.toBe('written');

			expect(write).toHaveBeenCalledWith(ctx);
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('checks that the execution of the turn still runs in the transaction of the write', async () => {
			service.hold(executionId);

			await expect(writeInTurn()).resolves.toBe('written');

			expect(executionRepository.isRunning).toHaveBeenCalledWith(executionId, trxCtx);
			expect(write).toHaveBeenCalledWith(trxCtx);
		});

		it('rejects the write and aborts the turn when its execution no longer runs', async () => {
			const signal = service.hold(executionId);
			executionRepository.isRunning.mockResolvedValue(false);

			await expect(writeInTurn()).rejects.toBeInstanceOf(AgentSessionLeaseLostError);

			expect(signal.aborted).toBe(true);
			expect(write).not.toHaveBeenCalled();
			// The loss is confirmed, so the next write fails without another check.
			executionRepository.isRunning.mockClear();
			await expect(writeInTurn()).rejects.toBeInstanceOf(AgentSessionLeaseLostError);
			expect(executionRepository.isRunning).not.toHaveBeenCalled();
		});

		it('fails a write without the check after a renewal found the execution stopped', async () => {
			service.hold(executionId);
			executionRepository.touchRunning.mockResolvedValue(false);
			await service.renew(executionId);

			await expect(writeInTurn()).rejects.toBeInstanceOf(AgentSessionLeaseLostError);

			expect(executionRepository.isRunning).not.toHaveBeenCalled();
		});

		it('keeps checking the database after two failed renewals', async () => {
			const signal = service.hold(executionId);
			executionRepository.touchRunning.mockRejectedValue(new Error('database unavailable'));
			await service.renew(executionId);
			await service.renew(executionId);
			expect(signal.aborted).toBe(true);

			await expect(writeInTurn()).resolves.toBe('written');

			expect(executionRepository.isRunning).toHaveBeenCalledOnce();
		});

		it('rejects a late write of a settled turn', async () => {
			service.hold(executionId);
			const turnSettled = createDeferredPromise();
			const lateWrite = service.runInTurn(executionId, async () => {
				await turnSettled.promise;
				return await service.fencedWrite(ctx, write);
			});
			service.release(executionId);
			service.hold('execution-2');
			turnSettled.resolve();

			await expect(lateWrite).rejects.toBeInstanceOf(AgentSessionLeaseLostError);

			expect(executionRepository.isRunning).not.toHaveBeenCalled();
			expect(write).not.toHaveBeenCalled();
		});

		it('runs a write without the check when a turn starts independent work', async () => {
			service.hold(executionId);

			await service.runInTurn(
				executionId,
				async () => await service.runOutsideTurn(async () => await service.fencedWrite(ctx, write)),
			);

			expect(txRunner.run).not.toHaveBeenCalled();
			expect(write).toHaveBeenCalledWith(ctx);
		});
	});
});
