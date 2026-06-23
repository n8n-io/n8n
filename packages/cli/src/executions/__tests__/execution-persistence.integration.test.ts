import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse } from '@n8n/db';
import { Container } from '@n8n/di';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { DbStore } from '@/executions/execution-data/db-store';
import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('create', () => {
		it('should save execution and execution data to database', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: {
					// @ts-expect-error Partial data for test
					resultData: {},
				},
				workflowData: workflow,
				mode: 'manual',
				startedAt: new Date(),
				status: 'new',
				finished: false,
			});

			expect(executionId).toBeDefined();

			const executionEntity = await executionRepo.findOneBy({ id: executionId });
			expect(executionEntity?.id).toEqual(executionId);
			expect(executionEntity?.workflowId).toEqual(workflow.id);
			expect(executionEntity?.status).toEqual('new');
			expect(executionEntity?.storedAt).toEqual('db');

			const executionDataRepository = Container.get(ExecutionDataRepository);
			const executionData = await executionDataRepository.findOneBy({ executionId });
			expect(executionData?.workflowData).toEqual({
				id: workflow.id,
				connections: workflow.connections,
				nodes: workflow.nodes,
				name: workflow.name,
				settings: workflow.settings,
			});
			expect(executionData?.data).toEqual('[{"resultData":"1"},{}]');
		});
	});

	describe('storedAt CHECK constraint (AllowAzureStoredAt migration)', () => {
		it("allows persisting an execution with storedAt 'az' (legacy 3-value check was widened, not AND-ed)", async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			// Inserting 'az' would throw a CHECK violation if the original
			// `IN ('db','fs','s3')` constraint were still present.
			const result = await executionRepo.insert({
				workflowId: workflow.id,
				status: 'new',
				finished: false,
				mode: 'manual',
				createdAt: new Date(),
				storedAt: 'az',
			});

			const id = String(result.identifiers[0].id);
			const found = await executionRepo.findOneBy({ id });
			expect(found?.storedAt).toEqual('az');
		});
	});

	describe('updateExistingExecution (db overwrite path)', () => {
		it('should preserve the original workflowVersionId when overwriting data and workflowData', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionDataRepository = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: { ...workflow, versionId: 'v-original' },
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			const updatedData = createEmptyRunExecutionData();
			updatedData.resultData.lastNodeExecuted = 'NodeX';

			await executionPersistence.updateExistingExecution(executionId, {
				data: updatedData,
				workflowData: { ...workflow, versionId: 'v-different' },
				status: 'success',
			});

			const executionData = await executionDataRepository.findOneBy({ executionId });
			expect(executionData?.workflowVersionId).toEqual('v-original');
			expect(executionData?.data).toContain('NodeX');
		});

		it('should roll back the status change when the data row is missing during an overwrite', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepository = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: workflow,
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			await executionDataRepository.delete({ executionId });

			await expect(
				executionPersistence.updateExistingExecution(executionId, {
					data: createEmptyRunExecutionData(),
					workflowData: workflow,
					status: 'success',
				}),
			).rejects.toThrow(MissingExecutionDataError);

			const executionEntity = await executionRepo.findOneBy({ id: executionId });
			expect(executionEntity?.status).toEqual('new');
		});
	});

	describe('findSingleExecution', () => {
		it('returns the persisted bundle byte size and the workflow version id', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: {
					...workflow,
					id: 'wf-1',
					name: 'wf',
					nodes: [],
					connections: {},
					settings: {},
					versionId: 'v-roundtrip-456',
				},
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			// 51 (run data) + 67 (workflow snapshot) + 15 ("v-roundtrip-456") = 133 bytes
			expect(execution?.jsonSizeBytes).toBe(133);
			expect(execution?.workflowVersionId).toBe('v-roundtrip-456');
		});

		it('persists and reads back binaryDataSizeBytes from offloaded binary in the run data', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const data = createEmptyRunExecutionData();
			data.resultData.runData = {
				Node: [
					{
						data: {
							main: [
								[
									{
										json: {},
										binary: {
											file: {
												data: '',
												mimeType: 'application/octet-stream',
												id: 'filesystem-v2:abc',
												bytes: 100,
											},
										},
									},
								],
							],
						},
					},
				],
			} as unknown as typeof data.resultData.runData;

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data,
				workflowData: workflow,
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			expect(execution?.binaryDataSizeBytes).toBe(100);
		});
	});

	describe('display size guard (maxDataSizeBytes)', () => {
		const ONE_MB = 1024 * 1024;

		/** Create a successful execution whose run data embeds a string of roughly `sizeBytes`. */
		const createSizedExecution = async (sizeBytes: number) => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });
			const data = createEmptyRunExecutionData();
			data.resultData.runData = {
				bigNode: [
					{
						startTime: 0,
						executionTime: 1,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { big: 'x'.repeat(sizeBytes) } }]] },
					},
				],
			};
			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data,
				workflowData: workflow,
				mode: 'manual',
				status: 'success',
				finished: true,
			});
			return { workflow, executionId };
		};

		it('findSingleExecution omits oversized data and flags it (without parsing)', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const { workflow, executionId } = await createSizedExecution(2 * ONE_MB);

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: ONE_MB,
			});

			expect(execution?.dataTooLargeToDisplay).toBe(true);
			expect(execution?.jsonSizeBytes).toBeGreaterThan(ONE_MB);
			expect(execution?.data?.resultData?.runData).toEqual({});
			// workflow snapshot still loaded (DB store), not the empty stub
			expect(execution?.workflowData?.id).toBe(workflow.id);
			expect(execution?.workflowData?.name).toBe(workflow.name);
		});

		it('findSingleExecution returns data when under the threshold', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const { executionId } = await createSizedExecution(1024); // ~1 KB

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: ONE_MB,
			});

			expect(execution?.dataTooLargeToDisplay).toBeFalsy();
			expect(execution?.data?.resultData?.runData).toHaveProperty('bigNode');
		});

		it('findSingleExecution loads unconditionally when no threshold is given', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const { executionId } = await createSizedExecution(2 * ONE_MB);

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			expect(execution?.dataTooLargeToDisplay).toBeFalsy();
			expect(execution?.data?.resultData?.runData).toHaveProperty('bigNode');
		});

		it('findMultipleExecutions omits oversized data and flags it', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const { workflow } = await createSizedExecution(2 * ONE_MB);

			const executions = await executionPersistence.findMultipleExecutions(
				{ where: { workflowId: workflow.id, status: 'success' }, order: { id: 'DESC' }, take: 1 },
				{ includeData: true, unflattenData: true, maxDataSizeBytes: ONE_MB },
			);

			expect(executions[0]?.dataTooLargeToDisplay).toBe(true);
			expect(executions[0]?.data?.resultData?.runData).toEqual({});
		});

		it('findMultipleExecutions flags legacy oversized rows after reading (jsonSizeBytes unknown)', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionRepository = Container.get(ExecutionRepository);
			const { workflow, executionId } = await createSizedExecution(2 * ONE_MB);

			// Legacy row: size unknown, so it's read and decided by raw byte length.
			await executionRepository.update({ id: executionId }, { jsonSizeBytes: 0 });

			const executions = await executionPersistence.findMultipleExecutions(
				{ where: { workflowId: workflow.id, status: 'success' }, order: { id: 'DESC' }, take: 1 },
				{ includeData: true, unflattenData: true, maxDataSizeBytes: ONE_MB },
			);

			expect(executions[0]?.dataTooLargeToDisplay).toBe(true);
			expect(executions[0]?.data?.resultData?.runData).toEqual({});
		});

		it('checks the DB size and skips the read for legacy rows (jsonSizeBytes unknown)', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionRepository = Container.get(ExecutionRepository);
			const dbStore = Container.get(DbStore);
			const { executionId } = await createSizedExecution(2 * ONE_MB);

			// Simulate a row written before jsonSizeBytes existed: 0 means unknown.
			await executionRepository.update({ id: executionId }, { jsonSizeBytes: 0 });

			const readSpy = jest.spyOn(dbStore, 'read');

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: ONE_MB,
			});

			expect(execution?.dataTooLargeToDisplay).toBe(true);
			expect(execution?.data?.resultData?.runData).toEqual({});
			// the DB size check rejects it without loading the run data
			expect(readSpy).not.toHaveBeenCalled();

			readSpy.mockRestore();
		});

		it('skips reading the run data and loads only the workflow snapshot when oversized', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const dbStore = Container.get(DbStore);
			const { executionId } = await createSizedExecution(2 * ONE_MB);

			const readSpy = jest.spyOn(dbStore, 'read');
			const readWorkflowDataSpy = jest.spyOn(dbStore, 'readWorkflowData');

			await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: ONE_MB,
			});

			// the run data is never read; only the (small) snapshot is
			expect(readSpy).not.toHaveBeenCalled();
			expect(readWorkflowDataSpy).toHaveBeenCalledTimes(1);

			readSpy.mockRestore();
			readWorkflowDataSpy.mockRestore();
		});

		it('does not guard operational reads (findWithUnflattenedData loads full data)', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const { workflow, executionId } = await createSizedExecution(2 * ONE_MB);

			const execution = await executionPersistence.findWithUnflattenedData(executionId, [
				workflow.id,
			]);

			expect(execution?.dataTooLargeToDisplay).toBeFalsy();
			expect(execution?.data?.resultData?.runData).toHaveProperty('bigNode');
		});

		it('getExecutionsForPublicApi omits oversized data and flags it', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const { workflow } = await createSizedExecution(2 * ONE_MB);

			const executions = (await executionPersistence.getExecutionsForPublicApi(
				{ limit: 10, includeData: true, workflowIds: [workflow.id] },
				ONE_MB,
			)) as IExecutionResponse[];

			expect(executions[0]?.dataTooLargeToDisplay).toBe(true);
			expect(executions[0]?.data?.resultData?.runData).toEqual({});
		});
	});
});
