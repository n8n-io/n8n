import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { CreateExecutionPayload, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, WorkflowTriggerSeatRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createRunExecutionData } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { TriggerSeatAdmissionService } from '@/workflows/triggers/seats/trigger-seat-admission.service';

// The fence: an execution row may only be created while the emitting holder
// still owns its seat at the registered epoch and version. Check and insert
// share one transaction, so a zombie emission can never land.
describe('TriggerSeatAdmissionService', () => {
	let admissionService: TriggerSeatAdmissionService;
	let seatRepository: WorkflowTriggerSeatRepository;
	let executionRepository: ExecutionRepository;
	let workflow: WorkflowEntity;

	const LEASE_MS = 30_000;

	beforeAll(async () => {
		await testDb.init();
		admissionService = Container.get(TriggerSeatAdmissionService);
		seatRepository = Container.get(WorkflowTriggerSeatRepository);
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowTriggerSeat', 'WorkflowEntity']);
		workflow = await createWorkflow({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function buildPayload(deduplicationKey?: string): CreateExecutionPayload {
		return {
			data: createRunExecutionData({}),
			mode: 'trigger',
			finished: false,
			workflowData: workflow,
			status: 'new',
			workflowId: workflow.id,
			deduplicationKey,
		};
	}

	async function claimedSeat(runnerId: string) {
		await seatRepository.upsertDesiredSeats(workflow.id, 'node-1', 1, 'v1');
		const seat = await seatRepository.findOneOrFail({
			where: { workflowId: workflow.id, nodeId: 'node-1' },
		});
		const leaseEpoch = await seatRepository.claim(seat.id, runnerId, LEASE_MS);
		return { seatId: seat.id, holderId: runnerId, leaseEpoch: leaseEpoch!, versionId: 'v1' };
	}

	it('creates the execution while the seat is held', async () => {
		const fence = await claimedSeat('runner-a');

		const result = await admissionService.commitExecutionWithFence({
			payload: buildPayload(),
			fence,
		});

		expect(result).not.toBeNull();
		expect(await executionRepository.count()).toBe(1);
	});

	it('fences out a zombie whose seat was reclaimed, leaving no execution row', async () => {
		const staleFence = await claimedSeat('runner-a');
		await seatRepository.renew(staleFence.seatId, 'runner-a', staleFence.leaseEpoch, -1_000);
		await seatRepository.claim(staleFence.seatId, 'runner-b', LEASE_MS);

		const result = await admissionService.commitExecutionWithFence({
			payload: buildPayload(),
			fence: staleFence,
		});

		expect(result).toBeNull();
		expect(await executionRepository.count()).toBe(0);
	});

	it('fences out an emission registered against a superseded version', async () => {
		const fence = await claimedSeat('runner-a');
		await seatRepository.upsertDesiredSeats(workflow.id, 'node-1', 1, 'v2');

		const result = await admissionService.commitExecutionWithFence({
			payload: buildPayload(),
			fence,
		});

		expect(result).toBeNull();
		expect(await executionRepository.count()).toBe(0);
	});

	it('suppresses a duplicate deduplication key once the first execution was dispatched', async () => {
		const fence = await claimedSeat('runner-a');

		const first = await admissionService.commitExecutionWithFence({
			payload: buildPayload('topic:0:41-42'),
			fence,
		});
		expect(first).not.toBeNull();
		// Past `new` the key is a real dispatch; a redelivery must be suppressed.
		await executionRepository.update({ id: first!.executionId }, { status: 'success' });

		await expect(
			admissionService.commitExecutionWithFence({ payload: buildPayload('topic:0:41-42'), fence }),
		).rejects.toThrow(DuplicateExecutionError);
		expect(await executionRepository.count()).toBe(1);
	});

	it('reclaims an undispatched tombstone under the same deduplication key', async () => {
		// A row stuck at `new` asserts an effect that never happened; the
		// redelivered emission takes over the key instead of being dropped.
		const fence = await claimedSeat('runner-a');

		const first = await admissionService.commitExecutionWithFence({
			payload: buildPayload('topic:0:41-42'),
			fence,
		});
		const second = await admissionService.commitExecutionWithFence({
			payload: buildPayload('topic:0:41-42'),
			fence,
		});

		expect(second).not.toBeNull();
		expect(second!.executionId).not.toBe(first!.executionId);
		expect(await executionRepository.count()).toBe(1);
	});
});
