import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionService } from '@/executions/execution.service';
import { mock } from 'jest-mock-extended';
import Container from 'typedi';
import { createWorkflow } from './shared/db/workflows';
import { createExecution, createManyExecutions } from './shared/db/executions';
import * as testDb from './shared/testDb';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

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
				createManyExecutions(3, workflow, async () => {
					return await createExecution({ status: 'success' }, workflow);
				}),

				createManyExecutions(3, workflow, async () => {
					return await createExecution({ status: 'unknown' }, workflow);
				}),
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
				createManyExecutions(3, workflow, async () => {
					return await createExecution({ status: 'error' }, workflow);
				}),

				createManyExecutions(3, workflow, async () => {
					return await createExecution({ status: 'unknown' }, workflow);
				}),
			]);

			const executions = await executionService.findLatestFinished(2);

			expect(executions).toHaveLength(2);

			const [first, second] = executions;

			expect(first.status).toBe('error');
			expect(second.status).toBe('error');
		});
	});
});
