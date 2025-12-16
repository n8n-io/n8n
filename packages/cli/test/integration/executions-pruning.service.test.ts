import { mockLogger, createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { ExecutionEntity } from '@n8n/db';
import { ExecutionRepository, DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataService, InstanceSettings } from 'n8n-core';
import type { ExecutionStatus, IWorkflowBase } from 'n8n-workflow';

import { ExecutionsPruningService } from '@/services/pruning/executions-pruning.service';

import {
	annotateExecution,
	createExecution,
	createSuccessfulExecution,
} from './shared/db/executions';

describe('softDeleteOnPruningCycle()', () => {
	let pruningService: ExecutionsPruningService;
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.markAsLeader();

	const now = new Date();
	const yesterday = new Date(Date.now() - 1 * Time.days.toMilliseconds);
	let workflow: IWorkflowBase;
	let executionsConfig: ExecutionsConfig;

	beforeAll(async () => {
		await testDb.init();

		executionsConfig = Container.get(ExecutionsConfig);
		pruningService = new ExecutionsPruningService(
			mockLogger(),
			instanceSettings,
			Container.get(DbConnection),
			Container.get(ExecutionRepository),
			mockInstance(BinaryDataService),
			executionsConfig,
		);

		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'ExecutionAnnotation']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function findAllExecutions() {
		return await Container.get(ExecutionRepository).find({
			order: { id: 'asc' },
			withDeleted: true,
		});
	}

	describe('when EXECUTIONS_DATA_PRUNE_MAX_COUNT is set', () => {
		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 336;
			executionsConfig.pruneDataMaxCount = 1;
		});

		test('should mark as deleted based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const executions = [
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});

		test('should not re-mark already marked executions', async () => {
			const executions = [
				await createExecution(
					{ status: 'success', finished: true, startedAt: now, stoppedAt: now, deletedAt: now },
					workflow,
				),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: now }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['unknown', { startedAt: now, stoppedAt: now }],
			['canceled', { startedAt: now, stoppedAt: now }],
			['crashed', { startedAt: now, stoppedAt: now }],
			['error', { startedAt: now, stoppedAt: now }],
			['success', { finished: true, startedAt: now, stoppedAt: now }],
		])('should prune %s executions', async (status, attributes) => {
			const executions = [
				await createExecution({ status, ...attributes }, workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['new', {}],
			['running', { startedAt: now }],
			['waiting', { startedAt: now, stoppedAt: now, waitTill: now }],
		])('should not prune %s executions', async (status, attributes) => {
			const executions = [
				await createExecution({ status, ...attributes }, workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not prune annotated executions', async () => {
			const executions = [
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
			];

			await annotateExecution(executions[0].id, { vote: 'up' }, [workflow.id]);

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});

	describe('when EXECUTIONS_DATA_MAX_AGE is set', () => {
		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 1;
			executionsConfig.pruneDataMaxCount = 0;
		});

		test('should mark as deleted based on EXECUTIONS_DATA_MAX_AGE', async () => {
			const executions = [
				await createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await createExecution(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not re-mark already marked executions', async () => {
			const executions = [
				await createExecution(
					{
						status: 'success',
						finished: true,
						startedAt: yesterday,
						stoppedAt: yesterday,
						deletedAt: yesterday,
					},
					workflow,
				),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: yesterday }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['unknown', { startedAt: yesterday, stoppedAt: yesterday }],
			['canceled', { startedAt: yesterday, stoppedAt: yesterday }],
			['crashed', { startedAt: yesterday, stoppedAt: yesterday }],
			['error', { startedAt: yesterday, stoppedAt: yesterday }],
			['success', { finished: true, startedAt: yesterday, stoppedAt: yesterday }],
		])('should prune %s executions', async (status, attributes) => {
			const execution = await createExecution({ status, ...attributes }, workflow);

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: execution.id, deletedAt: expect.any(Date) }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['new', {}],
			['running', { startedAt: yesterday }],
			['waiting', { startedAt: yesterday, stoppedAt: yesterday, waitTill: yesterday }],
		])('should not prune %s executions', async (status, attributes) => {
			const executions = [
				await createExecution({ status, ...attributes }, workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not prune annotated executions', async () => {
			const executions = [
				await createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await createExecution(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];

			await annotateExecution(executions[0].id, { vote: 'up' }, [workflow.id]);

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});
});
