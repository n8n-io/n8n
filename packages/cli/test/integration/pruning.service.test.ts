import config from '@/config';
import { BinaryDataService } from 'n8n-core';
import type { ExecutionStatus } from 'n8n-workflow';
import Container from 'typedi';

import * as testDb from './shared/testDb';
import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { TIME } from '@/constants';
import { PruningService } from '@/services/pruning.service';
import { Logger } from '@/Logger';

import { mockInstance } from '../shared/mocking';
import { createWorkflow } from './shared/db/workflows';
import { createExecution, createSuccessfulExecution } from './shared/db/executions';

describe('softDeleteOnPruningCycle()', () => {
	let pruningService: PruningService;

	const now = new Date();
	const yesterday = new Date(Date.now() - TIME.DAY);
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();

		pruningService = new PruningService(
			mockInstance(Logger),
			Container.get(ExecutionRepository),
			mockInstance(BinaryDataService),
		);

		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['Execution']);
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
			['warning', { startedAt: now, stoppedAt: now }],
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
			['warning', { startedAt: yesterday, stoppedAt: yesterday }],
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
	});
});
