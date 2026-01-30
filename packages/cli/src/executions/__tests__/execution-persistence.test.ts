/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/unbound-method */

import {
	ExecutionData,
	ExecutionEntity,
	type CreateExecutionPayload,
	type EntityManager,
	type ExecutionRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService, StorageConfig } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import type { FsStore } from '@/executions/execution-data/fs-store';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	const executionRepository = mock<ExecutionRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const fsStore = mock<FsStore>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const workflowData = mock<IWorkflowBase>({
		id: 'workflow-123',
		name: 'Test Workflow',
		nodes: [],
		connections: {},
		versionId: 'version-abc',
	});

	const runData = createEmptyRunExecutionData();

	const createMockTransaction = () => {
		const mockTx = mock<EntityManager>();
		mockTx.insert.mockResolvedValue({
			identifiers: [{ id: 'exec-1' }],
			generatedMaps: [],
			raw: {},
		});
		mockTx.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });
		return mockTx;
	};

	const createMockTx = (tx: EntityManager) =>
		jest.fn().mockImplementation(async <T>(cb: (em: EntityManager) => Promise<T>) => await cb(tx));

	const createPersistenceService = (modeTag: 'db' | 'fs') =>
		new ExecutionPersistence(
			executionRepository,
			binaryDataService,
			fsStore,
			mock<StorageConfig>({ modeTag }),
		);

	describe('create', () => {
		const createPayload: CreateExecutionPayload = {
			data: runData,
			workflowData,
			mode: 'manual',
			finished: false,
			status: 'new',
			workflowId: 'workflow-123',
		};

		describe('database mode', () => {
			const executionPersistence = createPersistenceService('db');

			it('should create execution with `storedAt: db` and insert data via transaction', async () => {
				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				const executionId = await executionPersistence.create(createPayload);

				expect(executionId).toBe('exec-1');
				expect(mockTx.insert).toHaveBeenCalledWith(
					ExecutionEntity,
					expect.objectContaining({
						storedAt: 'db',
						mode: 'manual',
						finished: false,
						status: 'new',
						workflowId: 'workflow-123',
						createdAt: expect.any(Date) as Date,
					}),
				);
				expect(mockTx.insert).toHaveBeenCalledWith(
					ExecutionData,
					expect.objectContaining({
						executionId: 'exec-1',
						workflowVersionId: 'version-abc',
					}),
				);
				expect(mockTx.insert).toHaveBeenCalledTimes(2);
				expect(fsStore.write).not.toHaveBeenCalled();
			});
		});

		describe('filesystem mode', () => {
			const executionPersistence = createPersistenceService('fs');

			it('should create execution with `storedAt: fs` and write data to filesystem', async () => {
				const mockTx = mock<EntityManager>();
				mockTx.insert.mockResolvedValue({
					identifiers: [{ id: 'exec-2' }],
					generatedMaps: [],
					raw: {},
				});
				executionRepository.manager.transaction = createMockTx(mockTx);

				const executionId = await executionPersistence.create(createPayload);

				expect(executionId).toBe('exec-2');
				expect(mockTx.insert).toHaveBeenCalledWith(
					ExecutionEntity,
					expect.objectContaining({
						storedAt: 'fs',
					}),
				);
				expect(mockTx.insert).toHaveBeenCalledTimes(1);
				const expectedWorkflowSnapshot = {
					id: workflowData.id,
					name: workflowData.name,
					nodes: workflowData.nodes,
					connections: workflowData.connections,
					settings: workflowData.settings,
				};
				expect(fsStore.write).toHaveBeenCalledWith(
					{ workflowId: 'workflow-123', executionId: 'exec-2' },
					expect.objectContaining({
						workflowData: expectedWorkflowSnapshot,
						workflowVersionId: 'version-abc',
					}),
				);
			});

			it('should roll back transaction if filesystem write fails', async () => {
				const mockTx = mock<EntityManager>();
				mockTx.insert.mockResolvedValue({
					identifiers: [{ id: 'exec-3' }],
					generatedMaps: [],
					raw: {},
				});

				const fsWriteError = new Error('Filesystem write failed');
				fsStore.write.mockRejectedValue(fsWriteError);

				executionRepository.manager.transaction = createMockTx(mockTx);

				await expect(executionPersistence.create(createPayload)).rejects.toThrow(fsWriteError);
			});
		});
	});

	describe('hardDelete', () => {
		const executionPersistence = createPersistenceService('db');
		const baseTarget = { workflowId: 'wf-1', executionId: 'exec-1' };

		it('should delete execution, binary data, and fs data when storedAt is fs', async () => {
			const target = { ...baseTarget, storedAt: 'fs' as const };

			await executionPersistence.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ type: 'execution', ...target }]);
			expect(fsStore.delete).toHaveBeenCalledWith([target]);
		});

		it('should delete execution and binary data but not fs data when storedAt is db', async () => {
			const target = { ...baseTarget, storedAt: 'db' as const };

			await executionPersistence.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ type: 'execution', ...target }]);
			expect(fsStore.delete).not.toHaveBeenCalled();
		});

		it('should handle array of targets', async () => {
			const targets = [
				{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'fs' as const },
				{ workflowId: 'wf-2', executionId: 'exec-2', storedAt: 'db' as const },
			];

			await executionPersistence.hardDelete(targets);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1', 'exec-2']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				{ type: 'execution', ...targets[0] },
				{ type: 'execution', ...targets[1] },
			]);
			expect(fsStore.delete).toHaveBeenCalledWith([targets[0]]);
		});

		it('should skip all operations when given empty array', async () => {
			await executionPersistence.hardDelete([]);

			expect(executionRepository.deleteByIds).not.toHaveBeenCalled();
			expect(binaryDataService.deleteMany).not.toHaveBeenCalled();
			expect(fsStore.delete).not.toHaveBeenCalled();
		});
	});
});
