import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionService } from '@/executions/execution.service';
import { mock } from 'jest-mock-extended';
import Container from 'typedi';
import { createWorkflow } from './shared/db/workflows';
import { createExecution, createManyExecutions } from './shared/db/executions';
import * as testDb from './shared/testDb';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { ExecutionStatus } from 'n8n-workflow';
import type { FindMany } from '@/executions/execution.types';

const manyExecutions = async (n: number, status: ExecutionStatus, workflow: WorkflowEntity) => {
	return await createManyExecutions(n, workflow, async () => {
		return await createExecution({ status }, workflow);
	});
};

describe('ExecutionService', () => {
	let executionService: ExecutionService;

	beforeAll(async () => {
		await testDb.init();

		executionService = new ExecutionService(
			mock(),
			mock(),
			mock(),
			Container.get(ExecutionRepository),
			Container.get(WorkflowRepository),
			mock(),
			mock(),
		);
	});

	afterEach(async () => {
		await testDb.truncate(['Workflow', 'Execution', 'ExecutionData']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findLatestFinished', () => {
		it('should return the n most recent success and error executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				manyExecutions(3, 'success', workflow),
				manyExecutions(3, 'unknown', workflow),
				manyExecutions(3, 'error', workflow),
			]);

			const executions = await executionService.findLatestFinished(6);

			expect(executions).toHaveLength(6);

			executions.forEach((execution) => {
				if (!execution.status) fail('Expected status');
				expect(['success', 'error'].includes(execution.status)).toBe(true);
			});
		});
	});

	describe('findAllActive', () => {
		it('should return all new, running, and waiting executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				manyExecutions(2, 'new', workflow),
				manyExecutions(2, 'unknown', workflow),
				manyExecutions(2, 'running', workflow),
				manyExecutions(2, 'success', workflow),
				manyExecutions(2, 'waiting', workflow),
			]);

			const executions = await executionService.findAllActive();

			expect(executions).toHaveLength(6);

			executions.forEach((execution) => {
				if (!execution.status) fail('Expected status');
				expect(['new', 'running', 'waiting'].includes(execution.status)).toBe(true);
			});
		});
	});

	describe('findManyWithCount', () => {
		test('should return execution summaries', async () => {
			const workflow = await createWorkflow();

			await Promise.all([manyExecutions(2, 'success', workflow)]);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			const summaryShape = {
				id: expect.any(String),
				workflowId: expect.any(String),
				mode: expect.any(String),
				retryOf: null,
				status: expect.any(String),
				startedAt: expect.any(String),
				stoppedAt: expect.any(String),
				waitTill: null,
				retrySuccessId: null,
				workflowName: expect.any(String),
			};

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([summaryShape, summaryShape]);
		});

		test('should limit executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([manyExecutions(3, 'success', workflow)]);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 2 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			expect(output.count).toBe(3);
			expect(output.estimated).toBe(false);
			expect(output.results).toHaveLength(2);
		});

		test('should retrieve range between `firstId` and `lastId`, excluding them', async () => {
			const workflow = await createWorkflow();

			await Promise.all([manyExecutions(4, 'success', workflow)]);

			const storedExecutions = await Container.get(ExecutionRepository).find({ select: ['id'] });
			const [firstId, secondId, thirdId] = storedExecutions.map((execution) => execution.id);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				range: { limit: 20, firstId, lastId: thirdId },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			expect(output.count).toBe(4);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([expect.objectContaining({ id: secondId })]);
		});

		test('should filter executions by `status`', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				manyExecutions(2, 'success', workflow),
				manyExecutions(2, 'waiting', workflow),
			]);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ status: 'success' }),
				expect.objectContaining({ status: 'success' }),
			]);
		});

		test('should filter executions by `workflowId`', async () => {
			const firstWorkflow = await createWorkflow();
			const secondWorkflow = await createWorkflow();

			await Promise.all([
				manyExecutions(1, 'success', firstWorkflow),
				manyExecutions(3, 'success', secondWorkflow),
			]);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: firstWorkflow.id,
				accessibleWorkflowIds: [firstWorkflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([expect.objectContaining({ workflowId: firstWorkflow.id })]),
			);
		});

		test('should filter executions by `startedBefore`', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ startedAt: new Date('2020-06-01') }, workflow),
				createExecution({ startedAt: new Date('2020-12-31') }, workflow),
			]);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				startedBefore: '2020-07-01',
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ startedAt: '2020-06-01 00:00:00.000' }),
			]);
		});

		test('should filter executions by `startedAfter`', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				createExecution({ startedAt: new Date('2020-06-01') }, workflow),
				createExecution({ startedAt: new Date('2020-12-31') }, workflow),
			]);

			const query: FindMany.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				startedAfter: '2020-07-01',
				accessibleWorkflowIds: [workflow.id],
			};

			const output = await executionService.findManyWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ startedAt: '2020-12-31 00:00:00.000' }),
			]);
		});
	});
});
