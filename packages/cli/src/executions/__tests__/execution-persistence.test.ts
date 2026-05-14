/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/unbound-method */

import type { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import {
	ExecutionData,
	ExecutionEntity,
	type CreateExecutionPayload,
	type EntityManager,
	type ExecutionRepository,
} from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService, StorageConfig } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { FsStore } from '@/executions/execution-data/fs-store';
import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	const executionRepository = mock<ExecutionRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const fsStore = mock<FsStore>();
	const executionsConfig = mock<ExecutionsConfig>({
		pruneData: true,
		pruneDataHardDeleteBuffer: 1,
	});

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

	const createPersistenceService = (
		modeTag: 'db' | 'fs',
		dbType: DatabaseConfig['type'] = 'postgresdb',
	) =>
		new ExecutionPersistence(
			executionRepository,
			binaryDataService,
			fsStore,
			mock<StorageConfig>({ modeTag }),
			executionsConfig,
			mock<DatabaseConfig>({ type: dbType }),
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

		describe('deduplication key handling', () => {
			const executionPersistence = createPersistenceService('db');

			const makeUniqueViolationError = (
				message = 'duplicate key value violates unique constraint on deduplicationKey',
			) => {
				const driverError = Object.assign(new Error(message), { code: '23505' });
				return new QueryFailedError('Query', [], driverError);
			};

			it('converts unique-violation into DuplicateExecutionError when payload has a deduplicationKey', async () => {
				const uniqueViolation = makeUniqueViolationError();
				executionRepository.manager.transaction = jest.fn().mockRejectedValue(uniqueViolation);

				const payloadWithKey: CreateExecutionPayload = {
					...createPayload,
					deduplicationKey: 'wf-1:node-1:1700000000000',
				};

				await expect(executionPersistence.create(payloadWithKey)).rejects.toBeInstanceOf(
					DuplicateExecutionError,
				);
				await expect(executionPersistence.create(payloadWithKey)).rejects.toMatchObject({
					deduplicationKey: 'wf-1:node-1:1700000000000',
					cause: uniqueViolation,
				});
			});

			it('rethrows original unique-violation when payload has no deduplicationKey', async () => {
				const uniqueViolation = makeUniqueViolationError();
				executionRepository.manager.transaction = jest.fn().mockRejectedValue(uniqueViolation);

				await expect(executionPersistence.create(createPayload)).rejects.toBe(uniqueViolation);
			});

			it('rethrows non-unique-violation QueryFailedError unchanged', async () => {
				const otherError = new QueryFailedError(
					'Query',
					[],
					Object.assign(new Error('not null'), { code: '23502' }),
				);
				executionRepository.manager.transaction = jest.fn().mockRejectedValue(otherError);

				const payloadWithKey: CreateExecutionPayload = {
					...createPayload,
					deduplicationKey: 'wf-1:node-1:1700000000000',
				};

				await expect(executionPersistence.create(payloadWithKey)).rejects.toBe(otherError);
			});

			it('rethrows unique-violation on a different column unchanged', async () => {
				const otherUniqueViolation = makeUniqueViolationError(
					'duplicate key value violates unique constraint on someOtherColumn',
				);
				executionRepository.manager.transaction = jest.fn().mockRejectedValue(otherUniqueViolation);

				const payloadWithKey: CreateExecutionPayload = {
					...createPayload,
					deduplicationKey: 'wf-1:node-1:1700000000000',
				};

				await expect(executionPersistence.create(payloadWithKey)).rejects.toBe(
					otherUniqueViolation,
				);
			});

			it.each([
				{
					name: 'extended code',
					code: 'SQLITE_CONSTRAINT_UNIQUE',
					message: 'UNIQUE constraint failed: execution_entity.deduplicationKey',
				},
				{
					name: 'base code',
					code: 'SQLITE_CONSTRAINT',
					message: 'SQLITE_CONSTRAINT: UNIQUE constraint failed: execution_entity.deduplicationKey',
				},
			])(
				'converts SQLite unique-violation ($name) into DuplicateExecutionError',
				async ({ code, message }) => {
					const sqlitePersistence = createPersistenceService('db', 'sqlite');
					const sqliteError = new QueryFailedError(
						'Query',
						[],
						Object.assign(new Error(message), { code }),
					);
					executionRepository.manager.transaction = jest.fn().mockRejectedValue(sqliteError);

					const payloadWithKey: CreateExecutionPayload = {
						...createPayload,
						deduplicationKey: 'wf-1:node-1:1700000000000',
					};

					await expect(sqlitePersistence.create(payloadWithKey)).rejects.toBeInstanceOf(
						DuplicateExecutionError,
					);
				},
			);

			it('returns executionId on happy path when deduplicationKey is provided', async () => {
				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				const payloadWithKey: CreateExecutionPayload = {
					...createPayload,
					deduplicationKey: 'wf-1:node-1:1700000000000',
				};

				const executionId = await executionPersistence.create(payloadWithKey);

				expect(executionId).toBe('exec-1');
				expect(mockTx.insert).toHaveBeenCalledWith(
					ExecutionEntity,
					expect.objectContaining({
						deduplicationKey: 'wf-1:node-1:1700000000000',
					}),
				);
			});
		});
	});

	describe('update', () => {
		const executionId = 'exec-1';
		const workflowId = 'wf-1';

		beforeEach(() => {
			fsStore.write.mockReset();
			fsStore.read.mockReset();
			executionRepository.findOne.mockReset();
			executionRepository.updateExistingExecution.mockReset();
		});

		const existingBundle = {
			data: '[{"resultData":"1"},{}]',
			workflowData: {
				id: workflowId,
				name: 'snapshot',
				nodes: [],
				connections: {},
				settings: undefined,
			},
			workflowVersionId: 'v-original',
			version: 1 as const,
		};

		const mockEntity = (storedAt: 'db' | 'fs') => {
			executionRepository.findOne.mockResolvedValue({
				id: executionId,
				workflowId,
				storedAt,
			} as unknown as Awaited<ReturnType<ExecutionRepository['findOne']>>);
		};

		describe('metadata-only updates', () => {
			it('should delegate to the repository without touching the data store', async () => {
				const executionPersistence = createPersistenceService('fs');
				executionRepository.updateExistingExecution.mockResolvedValue(true);

				const result = await executionPersistence.update(executionId, {
					retrySuccessId: 'retry-1',
				});

				expect(result).toBe(true);
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					{ retrySuccessId: 'retry-1' },
					undefined,
				);
				expect(executionRepository.findOne).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
				expect(fsStore.read).not.toHaveBeenCalled();
			});

			it('should forward conditions to the repository', async () => {
				const executionPersistence = createPersistenceService('db');
				executionRepository.updateExistingExecution.mockResolvedValue(false);

				const result = await executionPersistence.update(
					executionId,
					{ status: 'success' },
					{ requireNotCanceled: true },
				);

				expect(result).toBe(false);
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					{ status: 'success' },
					{ requireNotCanceled: true },
				);
			});
		});

		describe('data updates on db-mode executions', () => {
			it('should look up the entity and delegate the full payload to the repository', async () => {
				const executionPersistence = createPersistenceService('fs'); // current mode is irrelevant for routing
				mockEntity('db');
				executionRepository.updateExistingExecution.mockResolvedValue(true);

				const payload = {
					data: runData,
					status: 'success' as const,
				};

				const result = await executionPersistence.update(executionId, payload);

				expect(result).toBe(true);
				expect(executionRepository.findOne).toHaveBeenCalledWith({
					where: { id: executionId },
					select: ['id', 'workflowId', 'storedAt'],
				});
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					payload,
					undefined,
				);
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should return false when the execution does not exist', async () => {
				const executionPersistence = createPersistenceService('db');
				executionRepository.findOne.mockResolvedValue(null);

				const result = await executionPersistence.update(executionId, { data: runData });

				expect(result).toBe(false);
				expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});
		});

		describe('data updates on fs-mode executions', () => {
			it('should update entity in a transaction and write a fresh bundle to fs', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				const payload = {
					data: runData,
					workflowData,
					status: 'success' as const,
				};

				const result = await executionPersistence.update(executionId, payload);

				expect(result).toBe(true);
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ status: 'success' },
				);
				expect(fsStore.write).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({
						data: expect.any(String) as string,
						workflowData: {
							id: workflowData.id,
							name: workflowData.name,
							nodes: workflowData.nodes,
							connections: workflowData.connections,
							settings: workflowData.settings,
						},
						workflowVersionId: 'v-original',
					}),
				);
			});

			it('should preserve fields not supplied in a partial payload', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.update(executionId, { data: runData });

				expect(fsStore.write).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({
						workflowData: existingBundle.workflowData,
						workflowVersionId: existingBundle.workflowVersionId,
					}),
				);
			});

			it('should apply requireStatus condition and skip the fs write when no rows match', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');

				const mockTx = mock<EntityManager>();
				mockTx.update.mockResolvedValue({ affected: 0, generatedMaps: [], raw: {} });
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.update(
					executionId,
					{ data: runData, status: 'success' },
					{ requireStatus: 'waiting' },
				);

				expect(result).toBe(false);
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId, status: 'waiting' },
					{ status: 'success' },
				);
				expect(fsStore.read).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should still write the bundle when the payload contains no entity fields', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.update(executionId, { data: runData });

				expect(result).toBe(true);
				expect(mockTx.update).not.toHaveBeenCalled();
				expect(fsStore.write).toHaveBeenCalled();
			});

			it('should roll the transaction back if the fs write fails', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const writeError = new Error('disk full');
				fsStore.write.mockRejectedValue(writeError);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await expect(
					executionPersistence.update(executionId, { data: runData, status: 'success' }),
				).rejects.toBe(writeError);
			});

			it('should throw MissingExecutionDataError when the fs bundle is missing', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(null);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await expect(
					executionPersistence.update(executionId, { data: runData }),
				).rejects.toBeInstanceOf(MissingExecutionDataError);

				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should apply requireNotFinished condition', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.update(
					executionId,
					{ data: runData, status: 'success' },
					{ requireNotFinished: true },
				);

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId, finished: false },
					{ status: 'success' },
				);
			});

			it('should treat undefined `affected` from the driver as zero rows updated', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');

				const mockTx = mock<EntityManager>();
				mockTx.update.mockResolvedValue({ affected: undefined, generatedMaps: [], raw: {} });
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.update(
					executionId,
					{ data: runData, status: 'success' },
					{ requireStatus: 'waiting' },
				);

				expect(result).toBe(false);
				expect(fsStore.read).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should apply requireNotCanceled condition', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.update(
					executionId,
					{ data: runData, status: 'running' },
					{ requireNotCanceled: true },
				);

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					expect.objectContaining({ id: executionId, status: expect.anything() as unknown }),
					{ status: 'running' },
				);
			});

			it('should strip immutable fields before updating the entity', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.update(executionId, {
					id: executionId,
					data: runData,
					workflowId: 'other-wf',
					workflowVersionId: 'v-new',
					createdAt: new Date(),
					startedAt: new Date(),
					customData: { foo: 'bar' },
					status: 'success',
				});

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ status: 'success' },
				);
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

	describe('deleteUnsaved', () => {
		const target = { workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'db' as const };

		it('should soft-delete with backdated `deletedAt` when pruning is enabled', async () => {
			jest.useFakeTimers();
			const now = Date.now();

			executionsConfig.pruneData = true;
			executionsConfig.pruneDataHardDeleteBuffer = 1;
			const executionPersistence = createPersistenceService('db');

			await executionPersistence.deleteInFlightExecution(target);

			expect(executionRepository.update).toHaveBeenCalledWith('exec-1', {
				deletedAt: new Date(now - 3600_000),
			});
			expect(executionRepository.deleteByIds).not.toHaveBeenCalled();

			jest.useRealTimers();
		});

		it('should hard-delete immediately when pruning is disabled', async () => {
			executionsConfig.pruneData = false;
			const executionPersistence = createPersistenceService('db');

			await executionPersistence.deleteInFlightExecution(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(executionRepository.update).not.toHaveBeenCalled();
		});
	});
});
