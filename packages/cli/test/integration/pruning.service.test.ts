import { mock } from 'jest-mock-extended';
import { BinaryDataService, InstanceSettings } from 'n8n-core';
import type { ExecutionStatus } from 'n8n-workflow';
import Container from 'typedi';

import config from '@/config';
import { TIME } from '@/constants';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { Logger } from '@/logging/logger.service';
import { PruningService } from '@/services/pruning.service';

import {
	annotateExecution,
	createExecution,
	createSuccessfulExecution,
} from './shared/db/executions';
import { createWorkflow } from './shared/db/workflows';
import * as testDb from './shared/test-db';
import { mockInstance } from '../shared/mocking';

describe('softDeleteOnPruningCycle()', () => {
	let pruningService: PruningService;
	const instanceSettings = new InstanceSettings();
	instanceSettings.markAsLeader();

	const now = new Date();
	const yesterday = new Date(Date.now() - TIME.DAY);
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();

		pruningService = new PruningService(
			mockInstance(Logger),
			instanceSettings,
			Container.get(ExecutionRepository),
			mockInstance(BinaryDataService),
			mock(),
			mock(),
		);

		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['Execution', 'ExecutionAnnotation']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	afterEach(() => {
		config.load(config.default);
	});

	async function findAllExecutions() {
		return await Container.get(ExecutionRepository).find({
			order: { id: 'asc' },
			withDeleted: true,
		});
	}

	describe('when EXECUTIONS_DATA_PRUNE_MAX_COUNT is set', () => {
		beforeEach(() => {
			config.set('executions.pruneDataMaxCount', 1);
			config.set('executions.pruneDataMaxAge', 336);
		});

		test('should mark as deleted based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const executions = [
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});

	describe('when EXECUTIONS_DATA_MAX_AGE is set', () => {
		beforeEach(() => {
			config.set('executions.pruneDataMaxAge', 1); // 1h
			config.set('executions.pruneDataMaxCount', 0);
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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

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

			await pruningService.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});
});
