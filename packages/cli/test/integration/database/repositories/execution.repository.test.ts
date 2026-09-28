import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionDataRepository, ExecutionRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { ExecutionStatus, IRunExecutionData, IRunExecutionDataAll } from 'n8n-workflow';
import { WAIT_FOR_SUB_EXECUTION, WAIT_INDEFINITELY } from 'n8n-workflow';

describe('ExecutionRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedWorkflow', 'WorkflowEntity', 'ExecutionEntity']);
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
		const createExecution = async (
			status: ExecutionStatus,
			extra: {
				waitTill?: Date;
				tracingContext?: { traceparent: string };
				workflowVersionId?: string;
				retryOf?: string;
			} = {},
			existingWorkflow?: WorkflowEntity,
		) => {
			const workflow = existingWorkflow ?? (await createWorkflow());
			const startedAt = new Date();
			const { identifiers } = await Container.get(ExecutionRepository).insert({
				workflowId: workflow.id,
				mode: 'manual',
				startedAt,
				status,
				finished: status === 'success',
				createdAt: new Date(),
				...extra,
			});
			// Postgres returns the inserted id as a number, SQLite as a string.
			return { id: String(identifiers[0].id), workflow, startedAt };
		};

		it('should crash in-progress and indeterminate executions', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const { id: newId } = await createExecution('new');
			const { id: runningId } = await createExecution('running');
			const { id: unknownId } = await createExecution('unknown');

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
			const { id: waitingId } = await createExecution('waiting', { waitTill });

			await executionRepo.markAsCrashed([waitingId]);

			const waitingExec = await executionRepo.findOneBy({ id: waitingId });
			expect(waitingExec?.status).toBe('waiting');
			expect(waitingExec?.waitTill?.getTime()).toBe(waitTill.getTime());
		});

		it('should not overwrite executions in a terminal status', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const { id: successId } = await createExecution('success');
			const { id: errorId } = await createExecution('error');
			const { id: canceledId } = await createExecution('canceled');
			const { id: crashedId } = await createExecution('crashed');

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
			const { id: runningId } = await createExecution('running');
			const { id: waitingId } = await createExecution('waiting', { waitTill });
			const { id: successId } = await createExecution('success');

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

		it('should crash a soft-deleted in-progress execution', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const { id: runningId, workflow, startedAt } = await createExecution('running');
			await executionRepo.softDelete(runningId);

			const crashed = await executionRepo.markAsCrashed([runningId]);

			const runningExec = await executionRepo.findOne({
				where: { id: runningId },
				withDeleted: true,
			});
			expect(runningExec?.status).toBe('crashed');
			expect(crashed).toEqual([
				{
					id: runningId,
					workflowId: workflow.id,
					workflowName: workflow.name,
					mode: 'manual',
					startedAt,
					stoppedAt: expect.any(Date),
				},
			]);
		});

		it('should report the trace context stored on the execution', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const tracingContext = {
				traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
			};
			const { id: runningId } = await createExecution('running', { tracingContext });

			const crashed = await executionRepo.markAsCrashed([runningId]);

			expect(crashed).toEqual([expect.objectContaining({ id: runningId, tracingContext })]);
		});

		it('should report the version id, retry source, workflow tags and owner project', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const projectTags = [{ key: 'team', value: 'platform' }];
			const project = await createTeamProject();
			await Container.get(ProjectRepository).update(project.id, {
				customTelemetryTags: projectTags,
			});
			const customTelemetryTags = [{ key: 'workflowTag', value: 'checkout' }];
			const workflow = await createWorkflow({ settings: { customTelemetryTags } }, project);
			const { id: runningId } = await createExecution(
				'running',
				{ workflowVersionId: 'version-1', retryOf: '9' },
				workflow,
			);

			const crashed = await executionRepo.markAsCrashed([runningId]);

			expect(crashed).toEqual([
				expect.objectContaining({
					id: runningId,
					workflowId: workflow.id,
					workflowName: workflow.name,
					workflowVersionId: 'version-1',
					retryOf: '9',
					workflowCustomTelemetryTags: customTelemetryTags,
					project: { id: project.id, customTelemetryTags: projectTags },
				}),
			]);
		});
	});

	describe('cancelManyRunning', () => {
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

		it('should cancel a running execution and clear its waitTill', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const runningId = await createExecution('running', {
				waitTill: new Date(Date.now() + 1000 * 60 * 60),
			});

			await executionRepo.cancelManyRunning([runningId]);

			const runningExec = await executionRepo.findOneBy({ id: runningId });
			expect(runningExec?.status).toBe('canceled');
			expect(runningExec?.stoppedAt).toBeInstanceOf(Date);
			expect(runningExec?.waitTill).toBeNull();
		});

		it('should not overwrite executions in a terminal status', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const successId = await createExecution('success');
			const errorId = await createExecution('error');
			const crashedId = await createExecution('crashed');

			await executionRepo.cancelManyRunning([successId, errorId, crashedId]);

			const [successExec, errorExec, crashedExec] = await Promise.all([
				executionRepo.findOneBy({ id: successId }),
				executionRepo.findOneBy({ id: errorId }),
				executionRepo.findOneBy({ id: crashedId }),
			]);

			expect(successExec?.status).toBe('success');
			expect(errorExec?.status).toBe('error');
			expect(crashedExec?.status).toBe('crashed');
		});

		it('should cancel only the running executions in a mixed batch', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const waitTill = new Date(Date.now() + 1000 * 60 * 60);
			const runningId = await createExecution('running');
			const waitingId = await createExecution('waiting', { waitTill });
			const successId = await createExecution('success');

			await executionRepo.cancelManyRunning([runningId, waitingId, successId]);

			const [runningExec, waitingExec, successExec] = await Promise.all([
				executionRepo.findOneBy({ id: runningId }),
				executionRepo.findOneBy({ id: waitingId }),
				executionRepo.findOneBy({ id: successId }),
			]);

			expect(runningExec?.status).toBe('canceled');
			expect(waitingExec?.status).toBe('waiting');
			expect(waitingExec?.waitTill?.getTime()).toBe(waitTill.getTime());
			expect(successExec?.status).toBe('success');
		});
	});

	describe('findParkedOnSubExecution', () => {
		const createExecution = async (status: ExecutionStatus, waitTill: Date | null) => {
			const workflow = await createWorkflow();
			const { identifiers } = await Container.get(ExecutionRepository).insert({
				workflowId: workflow.id,
				mode: 'manual',
				startedAt: new Date(),
				status,
				finished: false,
				createdAt: new Date(),
				waitTill,
			});
			return String(identifiers[0].id);
		};

		it('returns only waiting executions parked on a sub-execution', async () => {
			const parkedOnChild = await createExecution('waiting', WAIT_FOR_SUB_EXECUTION);
			await createExecution('waiting', WAIT_INDEFINITELY);
			await createExecution('waiting', new Date(Date.now() + 60_000));
			await createExecution('running', WAIT_FOR_SUB_EXECUTION);
			await createExecution('success', WAIT_FOR_SUB_EXECUTION);

			const ids = await Container.get(ExecutionRepository).findParkedOnSubExecution();

			expect(ids).toEqual([parkedOnChild]);
		});
	});

	describe('getWorkflowIdsWithExecutionsSince', () => {
		const insertExecution = async (workflowId: string, startedAt: Date) =>
			await Container.get(ExecutionRepository).insert({
				workflowId,
				mode: 'manual',
				startedAt,
				status: 'success',
				finished: true,
				createdAt: startedAt,
			});

		it('should return distinct workflow ids for executions started at or after the date', async () => {
			const executionRepository = Container.get(ExecutionRepository);
			const [workflow1, workflow2] = await Promise.all([createWorkflow(), createWorkflow()]);
			const since = new Date('2024-01-01T00:00:00.000Z');

			await insertExecution(workflow1.id, since); // inclusive boundary
			await insertExecution(workflow1.id, new Date('2024-06-01T00:00:00.000Z')); // same workflow again
			await insertExecution(workflow2.id, new Date('2024-03-01T00:00:00.000Z'));

			const result = await executionRepository.getWorkflowIdsWithExecutionsSince(since);

			expect(result).toHaveLength(2);
			expect(result).toEqual(expect.arrayContaining([workflow1.id, workflow2.id]));
		});

		it('should exclude workflows whose executions all started before the date', async () => {
			const executionRepository = Container.get(ExecutionRepository);
			const workflow = await createWorkflow();

			await insertExecution(workflow.id, new Date('2023-12-31T23:59:59.000Z'));

			const result = await executionRepository.getWorkflowIdsWithExecutionsSince(
				new Date('2024-01-01T00:00:00.000Z'),
			);

			expect(result).toEqual([]);
		});
	});
});
