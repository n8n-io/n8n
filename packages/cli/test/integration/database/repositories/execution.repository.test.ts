import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { ExecutionStatus, IRunExecutionData, IRunExecutionDataAll } from 'n8n-workflow';

describe('ExecutionRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('run execution data migration', () => {
		it('should automatically migrate IRunExecutionDataV0 to V1 when reading', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepo = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			// Create V0 data with string destinationNode
			const v0Data: IRunExecutionDataAll = {
				version: 0,
				startData: { destinationNode: 'TestNode' },
				resultData: { runData: {} },
			};

			// Insert execution with V0 data directly into the database
			const { identifiers } = await executionRepo.insert({
				workflowId: workflow.id,
				mode: 'manual',
				startedAt: new Date(),
				status: 'success',
				finished: true,
				createdAt: new Date(),
			});
			const executionId = identifiers[0].id as string;
			await executionDataRepo.insert({
				executionId,
				workflowData: { id: workflow.id, connections: {}, nodes: [], name: workflow.name },
				data: stringify(v0Data),
			});

			// Read the execution back
			const execution = await executionRepo.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			// Verify that the data was migrated to V1
			const data = execution?.data as IRunExecutionData;
			expect(data.version).toBe(1);
			expect(data.startData?.destinationNode).toEqual({
				nodeName: 'TestNode',
				mode: 'inclusive',
			});
		});
	});
	describe('findByStopExecutionsFilter', () => {
		it('should find executions by status', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow = await createWorkflow();

			// Insert executions with different statuses
			await executionRepo.insert([
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'running',
					finished: false,
					createdAt: new Date(),
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
					createdAt: new Date(),
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'error',
					finished: false,
					createdAt: new Date(),
				},
			]);

			// Find executions with status 'running' and 'error'
			const executions = await executionRepo.findByStopExecutionsFilter({
				status: ['running', 'error'],
				workflowId: workflow.id,
			});

			expect(executions).toHaveLength(2);
		});

		it('should find executions by startedAfter and startedBefore', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow = await createWorkflow();

			// Insert executions with different start times
			const now = new Date();
			const pastDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
			const futureDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later

			await executionRepo.insert([
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: pastDate,
					status: 'running',
					finished: false,
					createdAt: pastDate,
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: now,
					status: 'success',
					finished: true,
					createdAt: now,
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: futureDate,
					status: 'error',
					finished: false,
					createdAt: futureDate,
				},
			]);

			// Find executions started between pastDate and now
			const executions = await executionRepo.findByStopExecutionsFilter({
				startedAfter: new Date(pastDate.getTime() + 1).toISOString(),
				startedBefore: new Date(futureDate.getTime() - 1).toISOString(),
				status: ['running', 'success', 'error'],
				workflowId: workflow.id,
			});

			expect(executions).toHaveLength(1);
		});

		it('should find executions for all workflows when workflowId is "all"', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow1 = await createWorkflow();
			const workflow2 = await createWorkflow();

			// Insert executions for different workflows
			await executionRepo.insert([
				{
					workflowId: workflow1.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'running',
					finished: false,
					createdAt: new Date(),
				},
				{
					workflowId: workflow2.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
					createdAt: new Date(),
				},
			]);

			// Find executions for all workflows
			const executions = await executionRepo.findByStopExecutionsFilter({
				status: ['running', 'success'],
				workflowId: 'all',
			});

			expect(executions).toHaveLength(2);
		});
	});

	describe('markAsCrashed', () => {
		const createExecution = async (status: ExecutionStatus, extra: { waitTill?: Date } = {}) => {
			const workflow = await createWorkflow();
			const { identifiers } = await Container.get(ExecutionRepository).insert({
				workflowId: workflow.id,
				mode: 'manual',
				startedAt: new Date(),
				status,
				finished: status === 'success',
				createdAt: new Date(),
				...extra,
			});
			return identifiers[0].id as string;
		};

		it('should crash in-progress and indeterminate executions', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const newId = await createExecution('new');
			const runningId = await createExecution('running');
			const unknownId = await createExecution('unknown');

			await executionRepo.markAsCrashed([newId, runningId, unknownId]);

			const [newExec, runningExec, unknownExec] = await Promise.all([
				executionRepo.findOneBy({ id: newId }),
				executionRepo.findOneBy({ id: runningId }),
				executionRepo.findOneBy({ id: unknownId }),
			]);

			expect(newExec?.status).toBe('crashed');
			expect(runningExec?.status).toBe('crashed');
			expect(unknownExec?.status).toBe('crashed');
		});

		it('should not overwrite a waiting execution or clear its waitTill', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const waitTill = new Date(Date.now() + 1000 * 60 * 60);
			const waitingId = await createExecution('waiting', { waitTill });

			await executionRepo.markAsCrashed([waitingId]);

			const waitingExec = await executionRepo.findOneBy({ id: waitingId });
			expect(waitingExec?.status).toBe('waiting');
			expect(waitingExec?.waitTill?.getTime()).toBe(waitTill.getTime());
		});

		it('should not overwrite executions in a terminal status', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const successId = await createExecution('success');
			const errorId = await createExecution('error');
			const canceledId = await createExecution('canceled');
			const crashedId = await createExecution('crashed');

			await executionRepo.markAsCrashed([successId, errorId, canceledId, crashedId]);

			const [successExec, errorExec, canceledExec, crashedExec] = await Promise.all([
				executionRepo.findOneBy({ id: successId }),
				executionRepo.findOneBy({ id: errorId }),
				executionRepo.findOneBy({ id: canceledId }),
				executionRepo.findOneBy({ id: crashedId }),
			]);

			expect(successExec?.status).toBe('success');
			expect(errorExec?.status).toBe('error');
			expect(canceledExec?.status).toBe('canceled');
			expect(crashedExec?.status).toBe('crashed');
		});

		it('should crash only the crashable executions in a mixed batch', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const waitTill = new Date(Date.now() + 1000 * 60 * 60);
			const runningId = await createExecution('running');
			const waitingId = await createExecution('waiting', { waitTill });
			const successId = await createExecution('success');

			await executionRepo.markAsCrashed([runningId, waitingId, successId]);

			const [runningExec, waitingExec, successExec] = await Promise.all([
				executionRepo.findOneBy({ id: runningId }),
				executionRepo.findOneBy({ id: waitingId }),
				executionRepo.findOneBy({ id: successId }),
			]);

			// the running execution is crashed, with its lifecycle fields updated
			expect(runningExec?.status).toBe('crashed');
			expect(runningExec?.stoppedAt).toBeInstanceOf(Date);
			expect(runningExec?.waitTill).toBeNull();

			// the waiting and terminal executions in the same batch are left untouched
			expect(waitingExec?.status).toBe('waiting');
			expect(waitingExec?.waitTill?.getTime()).toBe(waitTill.getTime());
			expect(successExec?.status).toBe('success');
		});
	});
});
