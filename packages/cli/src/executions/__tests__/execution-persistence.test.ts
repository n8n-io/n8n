/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/unbound-method */

import type { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import {
	ExecutionEntity,
	type CreateExecutionPayload,
	type EntityManager,
	type ExecutionRepository,
} from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService, ErrorReporter, StorageConfig } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { createEmptyRunExecutionData, UnexpectedError } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { DbStore } from '@/executions/execution-data/db-store';
import type { FsStore } from '@/executions/execution-data/fs-store';
import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	const executionRepository = mock<ExecutionRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const fsStore = mock<FsStore>();
	const dbStore = mock<DbStore>();
	const errorReporter = mock<ErrorReporter>();
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
			dbStore,
			mock<StorageConfig>({ modeTag }),
			executionsConfig,
			mock<DatabaseConfig>({ type: dbType }),
			errorReporter,
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

			it('should create execution with `storedAt: db` and write data via dbStore in the transaction', async () => {
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
				expect(mockTx.insert).toHaveBeenCalledTimes(1);
				expect(dbStore.write).toHaveBeenCalledWith(
					{ workflowId: 'workflow-123', executionId: 'exec-1' },
					expect.objectContaining({
						data: expect.any(String) as string,
						workflowVersionId: 'version-abc',
					}),
					mockTx,
				);
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
					mockTx,
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

	describe('updateExistingExecution', () => {
		const executionId = 'exec-1';
		const workflowId = 'wf-1';

		beforeEach(() => {
			fsStore.write.mockReset();
			fsStore.read.mockReset();
			dbStore.write.mockReset();
			dbStore.read.mockReset();
			executionRepository.findOne.mockReset();
			executionRepository.update.mockReset();
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

		describe('condition guards', () => {
			it('throws when requireStatus and requireNotCanceled are combined (both constrain status)', async () => {
				const executionPersistence = createPersistenceService('db');

				await expect(
					executionPersistence.updateExistingExecution(
						executionId,
						{ status: 'running' },
						{ requireStatus: 'waiting', requireNotCanceled: true },
					),
				).rejects.toThrow(UnexpectedError);

				expect(executionRepository.update).not.toHaveBeenCalled();
			});
		});

		describe('metadata-only updates', () => {
			it('should update the entity directly without touching either data store', async () => {
				const executionPersistence = createPersistenceService('fs');
				executionRepository.update.mockResolvedValue({
					affected: 1,
					generatedMaps: [],
					raw: {},
				});

				const result = await executionPersistence.updateExistingExecution(executionId, {
					retrySuccessId: 'retry-1',
				});

				expect(result).toBe(true);
				expect(executionRepository.update).toHaveBeenCalledWith(
					{ id: executionId },
					{ retrySuccessId: 'retry-1' },
				);
				expect(executionRepository.findOne).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
				expect(fsStore.read).not.toHaveBeenCalled();
				expect(dbStore.write).not.toHaveBeenCalled();
				expect(dbStore.read).not.toHaveBeenCalled();
			});

			it('should apply conditions to the where clause and return false when no rows match', async () => {
				const executionPersistence = createPersistenceService('db');
				executionRepository.update.mockResolvedValue({
					affected: 0,
					generatedMaps: [],
					raw: {},
				});

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ status: 'success' },
					{ requireNotCanceled: true },
				);

				expect(result).toBe(false);
				expect(executionRepository.update).toHaveBeenCalledWith(
					expect.objectContaining({ id: executionId, status: expect.anything() as unknown }),
					{ status: 'success' },
				);
			});

			it('should return true when no entity fields are present after stripping immutables', async () => {
				const executionPersistence = createPersistenceService('db');

				const result = await executionPersistence.updateExistingExecution(executionId, {
					id: executionId,
					workflowId: 'wf-other',
					createdAt: new Date(),
				});

				expect(result).toBe(true);
				expect(executionRepository.update).not.toHaveBeenCalled();
			});
		});

		describe('data updates on db-mode executions', () => {
			it('should update entity in a transaction and write a fresh bundle via dbStore', async () => {
				const executionPersistence = createPersistenceService('fs'); // current mode is irrelevant for routing
				mockEntity('db');
				dbStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				const payload = {
					data: runData,
					workflowData,
					status: 'success' as const,
				};

				const result = await executionPersistence.updateExistingExecution(executionId, payload);

				expect(result).toBe(true);
				expect(executionRepository.findOne).toHaveBeenCalledWith({
					where: { id: executionId },
					select: ['id', 'workflowId', 'storedAt'],
				});
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ status: 'success' },
				);
				expect(dbStore.write).toHaveBeenCalledWith(
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
					mockTx,
				);
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should preserve fields not supplied in a partial payload', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');
				dbStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, { data: runData });

				expect(dbStore.write).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({
						workflowData: existingBundle.workflowData,
						workflowVersionId: existingBundle.workflowVersionId,
					}),
					mockTx,
				);
			});

			it('should apply requireStatus condition and skip the db write when no rows match', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');

				const mockTx = mock<EntityManager>();
				mockTx.update.mockResolvedValue({ affected: 0, generatedMaps: [], raw: {} });
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData, status: 'success' },
					{ requireStatus: 'waiting' },
				);

				expect(result).toBe(false);
				expect(dbStore.read).not.toHaveBeenCalled();
				expect(dbStore.write).not.toHaveBeenCalled();
			});

			it('should throw MissingExecutionDataError when the db row is missing', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');
				dbStore.read.mockResolvedValue(null);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await expect(
					executionPersistence.updateExistingExecution(executionId, { data: runData }),
				).rejects.toBeInstanceOf(MissingExecutionDataError);

				expect(dbStore.write).not.toHaveBeenCalled();
			});

			it('should return false when the execution does not exist', async () => {
				const executionPersistence = createPersistenceService('db');
				executionRepository.findOne.mockResolvedValue(null);

				const result = await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
				});

				expect(result).toBe(false);
				expect(dbStore.read).not.toHaveBeenCalled();
				expect(dbStore.write).not.toHaveBeenCalled();
				expect(fsStore.read).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should apply conditions to the outer lookup to fail fast', async () => {
				const executionPersistence = createPersistenceService('db');
				executionRepository.findOne.mockResolvedValue(null);

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireStatus: 'waiting' },
				);

				expect(result).toBe(false);
				expect(executionRepository.findOne).toHaveBeenCalledWith({
					where: { id: executionId, status: 'waiting' },
					select: ['id', 'workflowId', 'storedAt'],
				});
				expect(executionRepository.manager.transaction).not.toHaveBeenCalled();
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

				const result = await executionPersistence.updateExistingExecution(executionId, payload);

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
					mockTx,
				);
			});

			it('should preserve fields not supplied in a partial payload', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, { data: runData });

				expect(fsStore.write).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({
						workflowData: existingBundle.workflowData,
						workflowVersionId: existingBundle.workflowVersionId,
					}),
					mockTx,
				);
			});

			it('should apply requireStatus condition and skip the fs write when no rows match', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');

				const mockTx = mock<EntityManager>();
				mockTx.update.mockResolvedValue({ affected: 0, generatedMaps: [], raw: {} });
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(
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

				const result = await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
				});

				expect(result).toBe(true);
				expect(mockTx.update).not.toHaveBeenCalled();
				expect(fsStore.write).toHaveBeenCalled();
			});

			it('should skip the fs write on a data-only update when conditions do not match', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');

				const mockTx = createMockTransaction();
				mockTx.count.mockResolvedValue(0);
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireNotFinished: true },
				);

				expect(result).toBe(false);
				expect(mockTx.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: { id: executionId, finished: false },
				});
				expect(mockTx.update).not.toHaveBeenCalled();
				expect(fsStore.read).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should perform the fs write on a data-only update when conditions match', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				mockTx.count.mockResolvedValue(1);
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireNotFinished: true },
				);

				expect(result).toBe(true);
				expect(mockTx.count).toHaveBeenCalled();
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
					executionPersistence.updateExistingExecution(executionId, {
						data: runData,
						status: 'success',
					}),
				).rejects.toBe(writeError);
			});

			it('should throw MissingExecutionDataError when the fs bundle is missing', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(null);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await expect(
					executionPersistence.updateExistingExecution(executionId, { data: runData }),
				).rejects.toBeInstanceOf(MissingExecutionDataError);

				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should apply requireNotFinished condition', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(
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

				const result = await executionPersistence.updateExistingExecution(
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

				await executionPersistence.updateExistingExecution(
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

				await executionPersistence.updateExistingExecution(executionId, {
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

	describe('findSingleExecution', () => {
		const executionId = 'exec-1';
		const workflowId = 'wf-1';

		const bundle = {
			data: '[{"resultData":"1"},{}]',
			workflowData: {
				id: workflowId,
				name: 'snapshot',
				nodes: [],
				connections: {},
				settings: undefined,
			},
			workflowVersionId: 'v-1',
			version: 1 as const,
		};

		const mockEntity = (storedAt: 'db' | 'fs') =>
			({
				id: executionId,
				workflowId,
				storedAt,
				metadata: [{ key: 'k', value: 'v' }],
				annotation: undefined,
				status: 'success',
			}) as unknown as ExecutionEntity;

		beforeEach(() => {
			executionRepository.findOne.mockReset();
			executionRepository.findSingleExecution.mockReset();
			executionRepository.reportInvalidExecutions.mockReset();
			dbStore.read.mockReset();
			fsStore.read.mockReset();
		});

		it('should delegate to the repository when includeData is not set', async () => {
			const executionPersistence = createPersistenceService('fs');
			executionRepository.findSingleExecution.mockResolvedValue({ id: executionId } as never);

			const result = await executionPersistence.findSingleExecution(executionId);

			expect(result).toEqual({ id: executionId });
			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(executionId, undefined);
			expect(executionRepository.findOne).not.toHaveBeenCalled();
			expect(dbStore.read).not.toHaveBeenCalled();
			expect(fsStore.read).not.toHaveBeenCalled();
		});

		it('should load entity without the executionData JOIN and read data from DbStore for db-mode', async () => {
			const executionPersistence = createPersistenceService('fs');
			executionRepository.findOne.mockResolvedValue(mockEntity('db'));
			dbStore.read.mockResolvedValue(bundle);

			const result = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			expect(executionRepository.findOne).toHaveBeenCalledWith({
				where: { id: executionId },
				relations: { metadata: true },
			});
			expect(dbStore.read).toHaveBeenCalledWith({ workflowId, executionId });
			expect(fsStore.read).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				id: executionId,
				workflowId,
				data: bundle.data,
				workflowData: bundle.workflowData,
				workflowVersionId: 'v-1',
				customData: { k: 'v' },
			});
		});

		it('should read data from FsStore for fs-mode', async () => {
			const executionPersistence = createPersistenceService('fs');
			executionRepository.findOne.mockResolvedValue(mockEntity('fs'));
			fsStore.read.mockResolvedValue(bundle);

			const result = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			expect(fsStore.read).toHaveBeenCalledWith({ workflowId, executionId });
			expect(dbStore.read).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				data: bundle.data,
				workflowData: bundle.workflowData,
			});
		});

		it('should unflatten data when requested', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(mockEntity('db'));
			dbStore.read.mockResolvedValue(bundle);

			const result = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			expect(result?.data).not.toEqual(bundle.data);
			expect(result?.data).toBeTruthy();
		});

		it('should pass the annotation relation when requested', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(mockEntity('db'));
			dbStore.read.mockResolvedValue(bundle);

			await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				includeAnnotation: true,
			});

			expect(executionRepository.findOne).toHaveBeenCalledWith({
				where: { id: executionId },
				relations: { metadata: true, annotation: { tags: true } },
			});
		});

		it('should return undefined when entity not found', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(null);

			const result = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			expect(result).toBeUndefined();
			expect(dbStore.read).not.toHaveBeenCalled();
			expect(fsStore.read).not.toHaveBeenCalled();
		});

		it('should report invalid and return undefined when db bundle is missing', async () => {
			const executionPersistence = createPersistenceService('db');
			const entity = mockEntity('db');
			executionRepository.findOne.mockResolvedValue(entity);
			dbStore.read.mockResolvedValue(null);

			const result = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			expect(result).toBeUndefined();
			expect(executionRepository.reportInvalidExecutions).toHaveBeenCalledWith([entity]);
		});

		it('should throw when fs bundle is missing', async () => {
			const executionPersistence = createPersistenceService('fs');
			executionRepository.findOne.mockResolvedValue(mockEntity('fs'));
			fsStore.read.mockResolvedValue(null);

			await expect(
				executionPersistence.findSingleExecution(executionId, { includeData: true }),
			).rejects.toBeInstanceOf(MissingExecutionDataError);
			expect(executionRepository.reportInvalidExecutions).not.toHaveBeenCalled();
		});

		it('should merge caller `where` into the entity lookup', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(mockEntity('db'));
			dbStore.read.mockResolvedValue(bundle);

			await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				where: { status: 'success' },
			});

			expect(executionRepository.findOne).toHaveBeenCalledWith({
				where: { id: executionId, status: 'success' },
				relations: { metadata: true },
			});
		});
	});

	describe('findMultipleExecutions', () => {
		const wf = 'wf-1';

		const makeBundle = (id: string) => ({
			data: `[{"id":"${id}"},{}]`,
			workflowData: { id: wf, name: 's', nodes: [], connections: {}, settings: undefined },
			workflowVersionId: 'v',
			version: 1 as const,
		});

		const makeEntity = (id: string, storedAt: 'db' | 'fs') =>
			({
				id,
				workflowId: wf,
				storedAt,
				metadata: [],
				annotation: undefined,
				status: 'success',
			}) as unknown as ExecutionEntity;

		beforeEach(() => {
			executionRepository.find.mockReset();
			executionRepository.findMultipleExecutions.mockReset();
			executionRepository.reportInvalidExecutions.mockReset();
			dbStore.readMany.mockReset();
			fsStore.readMany.mockReset();
		});

		it('should delegate to the repository when includeData is not set', async () => {
			const executionPersistence = createPersistenceService('fs');
			executionRepository.findMultipleExecutions.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions({ where: { workflowId: wf } });

			expect(executionRepository.findMultipleExecutions).toHaveBeenCalledWith(
				{ where: { workflowId: wf } },
				undefined,
			);
			expect(executionRepository.find).not.toHaveBeenCalled();
		});

		it('should batch-fetch db bundles in a single readMany call', async () => {
			const executionPersistence = createPersistenceService('db');
			const entities = [makeEntity('a', 'db'), makeEntity('b', 'db')];
			executionRepository.find.mockResolvedValue(entities);
			dbStore.readMany.mockResolvedValue(
				new Map([
					['a', makeBundle('a')],
					['b', makeBundle('b')],
				]),
			);

			const result = await executionPersistence.findMultipleExecutions(
				{ where: { workflowId: wf } },
				{ includeData: true },
			);

			expect(dbStore.readMany).toHaveBeenCalledTimes(1);
			expect(dbStore.readMany).toHaveBeenCalledWith([
				{ workflowId: wf, executionId: 'a' },
				{ workflowId: wf, executionId: 'b' },
			]);
			expect(fsStore.readMany).not.toHaveBeenCalled();
			expect(result).toHaveLength(2);
		});

		it('should partition mixed batches between db and fs stores', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([
				makeEntity('a', 'db'),
				makeEntity('b', 'fs'),
				makeEntity('c', 'db'),
			]);
			dbStore.readMany.mockResolvedValue(
				new Map([
					['a', makeBundle('a')],
					['c', makeBundle('c')],
				]),
			);
			fsStore.readMany.mockResolvedValue(new Map([['b', makeBundle('b')]]));

			const result = await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(dbStore.readMany).toHaveBeenCalledWith([
				{ workflowId: wf, executionId: 'a' },
				{ workflowId: wf, executionId: 'c' },
			]);
			expect(fsStore.readMany).toHaveBeenCalledWith([{ workflowId: wf, executionId: 'b' }]);
			expect(result.map((e) => e.id)).toEqual(['a', 'b', 'c']);
		});

		it('should report missing bundles from both stores and drop them from the result', async () => {
			const executionPersistence = createPersistenceService('db');
			const dbA = makeEntity('a', 'db');
			const dbB = makeEntity('b', 'db'); // missing
			const fsC = makeEntity('c', 'fs'); // missing
			executionRepository.find.mockResolvedValue([dbA, dbB, fsC]);
			dbStore.readMany.mockResolvedValue(new Map([['a', makeBundle('a')]]));
			fsStore.readMany.mockResolvedValue(new Map());

			const result = await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(executionRepository.reportInvalidExecutions).toHaveBeenCalledWith([dbB, fsC]);
			expect(result.map((e) => e.id)).toEqual(['a']);
		});

		it('should add metadata relation (not executionData) when none was supplied', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ where: { workflowId: wf }, take: 5 },
				{ includeData: true },
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.relations).toEqual(['metadata']);
			expect(findArg?.where).toEqual({ workflowId: wf });
			expect(findArg?.take).toBe(5);
		});

		it('should append metadata to a caller-provided array of relations', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ relations: ['annotation'] },
				{ includeData: true },
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.relations).toEqual(['annotation', 'metadata']);
		});

		it('should add metadata to a caller-provided object of relations', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ relations: { annotation: true } },
				{ includeData: true },
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.relations).toEqual({ annotation: true, metadata: true });
		});

		it('should not duplicate metadata when the caller already requested it', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ relations: ['metadata'] },
				{ includeData: true },
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.relations).toEqual(['metadata']);
		});

		it('should force-select routing fields when a caller-provided array `select` omits them', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ select: ['id', 'mode'] },
				{ includeData: true },
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.select).toEqual(['id', 'mode', 'workflowId', 'storedAt']);
		});

		it('should force-select routing fields when a caller-provided object `select` omits them', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ select: { mode: true } },
				{ includeData: true },
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.select).toEqual({ mode: true, id: true, workflowId: true, storedAt: true });
		});

		it('should not touch `select` when the caller did not narrow columns', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			await executionPersistence.findMultipleExecutions(
				{ where: { workflowId: wf } },
				{
					includeData: true,
				},
			);

			const findArg = executionRepository.find.mock.calls[0][0];
			expect(findArg?.select).toBeUndefined();
		});

		it('should report a successful execution whose data is an empty stringified array', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([makeEntity('a', 'db')]);
			// Distinct snapshot id proves the report uses the bundle's workflow id, not the entity's.
			const bundle = {
				...makeBundle('a'),
				data: '[]',
				workflowData: { ...makeBundle('a').workflowData, id: 'wf-from-snapshot' },
			};
			dbStore.readMany.mockResolvedValue(new Map([['a', bundle]]));

			await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(errorReporter.error).toHaveBeenCalledWith(
				'Found successful execution where data is empty stringified array',
				{ extra: { executionId: 'a', workflowId: 'wf-from-snapshot' } },
			);
		});

		it('should return an empty array when no entities match', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([]);

			const result = await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(result).toEqual([]);
			expect(dbStore.readMany).not.toHaveBeenCalled();
			expect(fsStore.readMany).not.toHaveBeenCalled();
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
