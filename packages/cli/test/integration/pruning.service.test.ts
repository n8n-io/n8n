import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { BinaryDataService, InstanceSettings } from 'n8n-core';
import type { ExecutionStatus } from 'n8n-workflow';

import { Time } from '@/constants';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { PruningService } from '@/services/pruning/pruning.service';

import {
	annotateExecution,
	createExecution,
	createSuccessfulExecution,
} from './shared/db/executions';
import { createWorkflow } from './shared/db/workflows';
import * as testDb from './shared/test-db';
import { mockInstance, mockLogger } from '../shared/mocking';

describe('softDeleteOnPruningCycle()', () => {
	let pruningService: PruningService;
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.markAsLeader();

	const now = new Date();
	const yesterday = new Date(Date.now() - 1 * Time.days.toMilliseconds);
	let workflow: WorkflowEntity;
	let executionsConfig: ExecutionsConfig;

	beforeAll(async () => {
		await testDb.init();

		executionsConfig = Container.get(ExecutionsConfig);
		pruningService = new PruningService(
			mockLogger(),
			instanceSettings,
			Container.get(ExecutionRepository),
			mockInstance(BinaryDataService),
			mock(),
			executionsConfig,
		);

		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['Execution', 'ExecutionAnnotation']);
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
