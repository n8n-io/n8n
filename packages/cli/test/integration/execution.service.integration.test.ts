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
		);
	});

	afterEach(async () => {
		await testDb.truncate(['Workflow', 'Execution', 'ExecutionData']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findLatestFinished', () => {
		it('should return the n most recent success executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				manyExecutions(3, 'success', workflow),
				manyExecutions(3, 'unknown', workflow),
			]);

			const executions = await executionService.findLatestFinished(2);

			expect(executions).toHaveLength(2);

			const [first, second] = executions;

			expect(first.status).toBe('success');
			expect(second.status).toBe('success');
		});

		it('should return the n most recent error executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				manyExecutions(3, 'error', workflow),
				manyExecutions(3, 'unknown', workflow),
			]);

			const executions = await executionService.findLatestFinished(2);

			expect(executions).toHaveLength(2);

			const [first, second] = executions;

			expect(first.status).toBe('error');
			expect(second.status).toBe('error');
		});
	});

	describe('findAllActive', () => {
		it('should return all new, running, and waiting executions', async () => {
			const workflow = await createWorkflow();

			await Promise.all([
				manyExecutions(2, 'new', workflow),
				manyExecutions(2, 'running', workflow),
				manyExecutions(2, 'waiting', workflow),
				manyExecutions(2, 'success', workflow),
				manyExecutions(2, 'unknown', workflow),
			]);

			const executions = await executionService.findAllActive();

			expect(executions).toHaveLength(6);

			executions.forEach((execution) => {
				if (!execution.status) fail('Expected status');

				expect(['new', 'running', 'waiting'].includes(execution.status)).toBe(true);
			});
		});
	});

	describe('findManyByQuery', () => {
		// @TODO
	});
});
