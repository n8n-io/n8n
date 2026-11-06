import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { createExecution } from '@test-integration/db/executions';

describe('UserRepository', () => {
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findManyByRangeQuery', () => {
		test('sort by `createdAt` if `startedAt` is null', async () => {
			const now = DateTime.utc();
			const workflow = await createWorkflow();
			const execution1 = await createExecution(
				{
					createdAt: now.plus({ minute: 1 }).toJSDate(),
					startedAt: now.plus({ minute: 1 }).toJSDate(),
				},
				workflow,
			);
			const execution2 = await createExecution(
				{
					createdAt: now.plus({ minute: 2 }).toJSDate(),
					startedAt: null,
				},
				workflow,
			);
			const execution3 = await createExecution(
				{
					createdAt: now.plus({ minute: 3 }).toJSDate(),
					startedAt: now.plus({ minute: 3 }).toJSDate(),
				},
				workflow,
			);

			const executions = await executionRepository.findManyByRangeQuery({
				workflowId: workflow.id,
				accessibleWorkflowIds: [workflow.id],
				kind: 'range',
				range: { limit: 10 },
				order: { startedAt: 'DESC' },
			});

			// Executions are returned in reverse order, and if `startedAt` is not
			// defined `createdAt` is used.
			expect(executions.map((e) => e.id)).toStrictEqual([
				execution3.id,
				execution2.id,
				execution1.id,
			]);
		});
	});

	describe('claimResumeAttempt', () => {
		test('counts each claim up to the limit, then reports the attempts as used up', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'waiting' }, workflow);

			await expect(
				executionRepository.claimResumeAttempt(execution.id, 'waiting', 2),
			).resolves.toEqual({ outcome: 'claimed', attempts: 1 });
			await expect(
				executionRepository.claimResumeAttempt(execution.id, 'waiting', 2),
			).resolves.toEqual({ outcome: 'claimed', attempts: 2 });
			await expect(
				executionRepository.claimResumeAttempt(execution.id, 'waiting', 2),
			).resolves.toEqual({ outcome: 'exhausted', attempts: 2 });

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.resumeAttempts).toBe(2);
			expect(row?.status).toBe('waiting');
		});

		test('reports a conflict and counts nothing when the execution left the status', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'running' }, workflow);

			await expect(
				executionRepository.claimResumeAttempt(execution.id, 'waiting', 2),
			).resolves.toEqual({ outcome: 'conflict' });

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.resumeAttempts).toBe(0);
		});
	});

	describe('releaseResumeAttempt', () => {
		test('gives back the attempt that the claim returned', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'waiting' }, workflow);
			await executionRepository.claimResumeAttempt(execution.id, 'waiting', 2);

			await expect(
				executionRepository.releaseResumeAttempt(execution.id, 'waiting', 1),
			).resolves.toBe(true);

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.resumeAttempts).toBe(0);
		});

		test('leaves the count alone when another claim changed it in the meantime', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'waiting' }, workflow);
			await executionRepository.claimResumeAttempt(execution.id, 'waiting', 3);
			await executionRepository.claimResumeAttempt(execution.id, 'waiting', 3);

			await expect(
				executionRepository.releaseResumeAttempt(execution.id, 'waiting', 1),
			).resolves.toBe(false);

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.resumeAttempts).toBe(2);
		});
	});

	describe('markAsCrashedFrom', () => {
		test('crashes a waiting execution and clears its wait time', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution(
				{ status: 'waiting', waitTill: new Date() },
				workflow,
			);

			await expect(executionRepository.markAsCrashedFrom(execution.id, 'waiting')).resolves.toBe(
				true,
			);

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.status).toBe('crashed');
			expect(row?.waitTill).toBeNull();
			expect(row?.stoppedAt).toBeInstanceOf(Date);
		});

		test('leaves an execution alone when it is not in the named status', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'running' }, workflow);

			await expect(executionRepository.markAsCrashedFrom(execution.id, 'waiting')).resolves.toBe(
				false,
			);

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.status).toBe('running');
		});

		test('leaves an execution alone when its attempt count changed since it was read', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'waiting' }, workflow);
			// The caller read the count as 0, then a claim moved it to 1
			await executionRepository.claimResumeAttempt(execution.id, 'waiting', 2);

			await expect(
				executionRepository.markAsCrashedFrom(execution.id, 'waiting', { expectedAttempts: 0 }),
			).resolves.toBe(false);

			const row = await executionRepository.findOneBy({ id: execution.id });
			expect(row?.status).toBe('waiting');
		});
	});

	describe('findEnqueuedIds', () => {
		test('returns the ids of `new` executions in ascending order', async () => {
			const workflow = await createWorkflow();
			const first = await createExecution({ status: 'new' }, workflow);
			await createExecution({ status: 'running' }, workflow);
			const second = await createExecution({ status: 'new' }, workflow);

			await expect(executionRepository.findEnqueuedIds()).resolves.toEqual([first.id, second.id]);
		});
	});
});
