/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/unbound-method */

import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import {
	ExecutionEntity,
	type CreateExecutionPayload,
	type EntityManager,
	type ExecutionRepository,
} from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import type { BinaryDataService, ErrorReporter, StorageConfig } from 'n8n-core';
import type { IBinaryData, IRunExecutionData, IWorkflowBase } from 'n8n-workflow';
import { createEmptyRunExecutionData, UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import type { DbStore } from '@/executions/execution-data/db-store';
import type { FsStore } from '@/executions/execution-data/fs-store';
import type { ExecutionDataStore } from '@/executions/execution-data/types';
import { CorruptedExecutionDataError } from '@/executions/execution-data/corrupted-execution-data.error';
import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	const executionRepository = mock<ExecutionRepository>();
	const binaryDataService = mock<BinaryDataService>();
	const fsStore = mock<FsStore>();
	const dbStore = mock<DbStore>();
	const errorReporter = mock<ErrorReporter>();
	const eventService = mock<EventService>();
	const logger = mock<Logger>();
	const executionsConfig = mock<ExecutionsConfig>({
		pruneData: true,
		pruneDataHardDeleteBuffer: 1,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const workflowData = mock<IWorkflowBase>({
		id: 'workflow-123',
		name: 'Test Workflow',
		nodes: [],
		connections: {},
		versionId: 'version-abc',
	});

	const runData = createEmptyRunExecutionData();

	/** Build run data carrying the given binary maps on one node's main output items. */
	const runDataWithBinary = (
		binaryMaps: Array<Record<string, Partial<IBinaryData>>>,
	): IRunExecutionData => {
		const data = createEmptyRunExecutionData();
		data.resultData.runData = {
			Node: [{ data: { main: [binaryMaps.map((b) => ({ json: {}, binary: b }))] } }],
		} as unknown as IRunExecutionData['resultData']['runData'];
		return data;
	};

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
		vi.fn().mockImplementation(async <T>(cb: (em: EntityManager) => Promise<T>) => await cb(tx));

	const createPersistenceService = (
		modeTag: 'db' | 'fs' | 's3' | 'az',
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
			eventService,
			logger,
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

			it('persists the byte size the store reports and emits it on the write event', async () => {
				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);
				dbStore.write.mockResolvedValue(4321);

				await executionPersistence.create(createPayload);

				// size is whatever the store reports, persisted after the timed write (not on the insert)
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: 'exec-1' },
					{ jsonSizeBytes: 4321, binaryDataSizeBytes: 0 },
				);
				expect(eventService.emit).toHaveBeenCalledWith(
					'execution-data-write',
					expect.objectContaining({ jsonSizeBytes: 4321 }),
				);
			});

			it('persists binaryDataSizeBytes: offloaded blobs deduped by id, inline binary excluded', async () => {
				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);
				dbStore.write.mockResolvedValue(4321);

				await executionPersistence.create({
					...createPayload,
					data: runDataWithBinary([
						{ a: { id: 'fs:1', bytes: 100 }, b: { id: 'fs:2', bytes: 50 } },
						{ a: { id: 'fs:1', bytes: 100 } }, // same blob referenced again — counted once
						{ c: { bytes: 999 } }, // inline (no id) — excluded, lives in jsonSizeBytes
					]),
				});

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: 'exec-1' },
					{ jsonSizeBytes: 4321, binaryDataSizeBytes: 150 },
				);
			});

			it('records the workflow version id on the entity from the workflow snapshot', async () => {
				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.create(createPayload);

				expect(mockTx.insert).toHaveBeenCalledWith(
					ExecutionEntity,
					expect.objectContaining({ workflowVersionId: 'version-abc' }),
				);
			});

			it('records a null workflow version id when the workflow has no version', async () => {
				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.create({
					...createPayload,
					workflowData: { ...workflowData, versionId: undefined },
				});

				expect(mockTx.insert).toHaveBeenCalledWith(
					ExecutionEntity,
					expect.objectContaining({ workflowVersionId: null }),
				);
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
					nodeGroups: workflowData.nodeGroups,
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
				executionRepository.manager.transaction = vi.fn().mockRejectedValue(uniqueViolation);

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
				executionRepository.manager.transaction = vi.fn().mockRejectedValue(uniqueViolation);

				await expect(executionPersistence.create(createPayload)).rejects.toBe(uniqueViolation);
			});

			it('rethrows non-unique-violation QueryFailedError unchanged', async () => {
				const otherError = new QueryFailedError(
					'Query',
					[],
					Object.assign(new Error('not null'), { code: '23502' }),
				);
				executionRepository.manager.transaction = vi.fn().mockRejectedValue(otherError);

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
				executionRepository.manager.transaction = vi.fn().mockRejectedValue(otherUniqueViolation);

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
					executionRepository.manager.transaction = vi.fn().mockRejectedValue(sqliteError);

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
				workflowVersionId: 'v-entity',
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
			it('should overwrite the bundle in place without reading the existing bundle first', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');
				dbStore.overwrite.mockResolvedValue(123);

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
					select: ['id', 'workflowId', 'storedAt', 'workflowVersionId'],
				});
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ status: 'success' },
				);
				expect(dbStore.overwrite).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({
						data: expect.any(String) as string,
						workflowData: {
							id: workflowData.id,
							name: workflowData.name,
							nodes: workflowData.nodes,
							connections: workflowData.connections,
							settings: workflowData.settings,
							nodeGroups: workflowData.nodeGroups,
						},
						// sourced from the entity row, not the incoming workflowData.versionId
						workflowVersionId: 'v-entity',
					}),
					mockTx,
				);
				expect(dbStore.read).not.toHaveBeenCalled();
				expect(dbStore.write).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('takes the fast path on full overwrite even when the entity has no version id', async () => {
				const executionPersistence = createPersistenceService('db');
				// pre-migration row: workflowVersionId was never backfilled, so it's null on the entity
				executionRepository.findOne.mockResolvedValue({
					id: executionId,
					workflowId,
					storedAt: 'db',
					workflowVersionId: null,
				} as unknown as Awaited<ReturnType<ExecutionRepository['findOne']>>);
				dbStore.overwrite.mockResolvedValue(256);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
					workflowData,
				});

				// db overwrite never writes the version-id column, so a null entity value can't clobber it
				expect(dbStore.overwrite).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({ workflowVersionId: null }),
					mockTx,
				);
				expect(dbStore.read).not.toHaveBeenCalled();
			});

			it('should propagate MissingExecutionDataError when the store reports the data row is gone', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');
				dbStore.overwrite.mockRejectedValue(
					new MissingExecutionDataError({ workflowId, executionId }),
				);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await expect(
					executionPersistence.updateExistingExecution(executionId, {
						data: runData,
						workflowData,
						status: 'success',
					}),
				).rejects.toBeInstanceOf(MissingExecutionDataError);

				expect(dbStore.read).not.toHaveBeenCalled();
				expect(dbStore.write).not.toHaveBeenCalled();
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
						// partial update reads & preserves both workflowData and version id from the bundle
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
					select: ['id', 'workflowId', 'storedAt', 'workflowVersionId'],
				});
				expect(executionRepository.manager.transaction).not.toHaveBeenCalled();
			});
		});

		describe('data updates on fs-mode executions', () => {
			it('should overwrite a fresh bundle on fs without reading the existing one', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');

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
				// full overwrite goes through the fast path for fs too (a write is a full replace),
				// skipping the read
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
							nodeGroups: workflowData.nodeGroups,
						},
						// from the entity row, not the incoming workflowData.versionId
						workflowVersionId: 'v-entity',
					}),
					mockTx,
				);
				expect(fsStore.read).not.toHaveBeenCalled();
			});

			it('falls back to read-merge on full overwrite when the entity has no version id, preserving the bundle value', async () => {
				const executionPersistence = createPersistenceService('fs');
				// pre-migration row: workflowVersionId was never backfilled, so it's null on the entity
				executionRepository.findOne.mockResolvedValue({
					id: executionId,
					workflowId,
					storedAt: 'fs',
					workflowVersionId: null,
				} as unknown as Awaited<ReturnType<ExecutionRepository['findOne']>>);
				fsStore.read.mockResolvedValue(existingBundle); // bundle still holds the real version id

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
					workflowData,
				});

				// must read the bundle (read-merge) to recover the real version id, rather than take the
				// no-read fast path and clobber it with the entity's null
				expect(fsStore.read).toHaveBeenCalled();
				expect(fsStore.write).toHaveBeenCalledWith(
					{ workflowId, executionId },
					expect.objectContaining({ workflowVersionId: existingBundle.workflowVersionId }),
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
						// partial update reads & preserves both workflowData and version id from the bundle
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
				fsStore.write.mockResolvedValue(512);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
				});

				expect(result).toBe(true);
				expect(fsStore.write).toHaveBeenCalled();
				// No caller-supplied entity columns, so the only entity-row update is the bundle size.
				expect(mockTx.update).toHaveBeenCalledTimes(1);
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes: 512, binaryDataSizeBytes: 0 },
				);
			});

			it('should skip the fs write on a data-only update when conditions do not match', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');

				const mockTx = createMockTransaction();
				mockTx.findOne.mockResolvedValue(null);
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireNotFinished: true },
				);

				expect(result).toBe(false);
				expect(mockTx.update).not.toHaveBeenCalled();
				expect(fsStore.read).not.toHaveBeenCalled();
				expect(fsStore.write).not.toHaveBeenCalled();
			});

			it('should take a pessimistic row lock to re-verify conditions on the data-only path (postgres)', async () => {
				const executionPersistence = createPersistenceService('fs', 'postgresdb');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				mockTx.findOne.mockResolvedValue({ id: executionId });
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireNotFinished: true },
				);

				expect(mockTx.findOne).toHaveBeenCalledWith(ExecutionEntity, {
					where: { id: executionId, finished: false },
					select: ['id'],
					lock: { mode: 'pessimistic_write' },
				});
			});

			it('should not take a lock on the data-only path under sqlite', async () => {
				const executionPersistence = createPersistenceService('fs', 'sqlite');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				mockTx.findOne.mockResolvedValue({ id: executionId });
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireNotFinished: true },
				);

				expect(mockTx.findOne).toHaveBeenCalledWith(ExecutionEntity, {
					where: { id: executionId, finished: false },
					select: ['id'],
				});
			});

			it('should perform the fs write on a data-only update when conditions match', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);

				const mockTx = createMockTransaction();
				mockTx.findOne.mockResolvedValue({ id: executionId });
				executionRepository.manager.transaction = createMockTx(mockTx);

				const result = await executionPersistence.updateExistingExecution(
					executionId,
					{ data: runData },
					{ requireNotFinished: true },
				);

				expect(result).toBe(true);
				expect(mockTx.findOne).toHaveBeenCalled();
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

		describe('jsonSizeBytes tracking', () => {
			it('persists the size the store reports on the read-merge path and emits it', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);
				fsStore.write.mockResolvedValue(2048);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, { data: runData });

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes: 2048, binaryDataSizeBytes: 0 },
				);
				expect(eventService.emit).toHaveBeenCalledWith(
					'execution-data-write',
					expect.objectContaining({ jsonSizeBytes: 2048 }),
				);
			});

			it('persists the size the store reports for the db fast path and emits it', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');
				dbStore.overwrite.mockResolvedValue(1536);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				// fast path overwrites via `dbStore.overwrite`, which reports the byte size
				await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
					workflowData,
				});

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes: 1536, binaryDataSizeBytes: 0 },
				);
				expect(eventService.emit).toHaveBeenCalledWith(
					'execution-data-write',
					expect.objectContaining({ jsonSizeBytes: 1536 }),
				);
			});

			it('records the reported size and ignores a caller-supplied jsonSizeBytes', async () => {
				const executionPersistence = createPersistenceService('db');
				mockEntity('db');
				dbStore.overwrite.mockResolvedValue(1536);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, {
					data: runData,
					workflowData,
					jsonSizeBytes: 999_999,
				});

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes: 1536, binaryDataSizeBytes: 0 },
				);
				expect(mockTx.update).not.toHaveBeenCalledWith(
					ExecutionEntity,
					expect.anything(),
					expect.objectContaining({ jsonSizeBytes: 999_999 }),
				);
			});

			it('does not touch jsonSizeBytes on a metadata-only update', async () => {
				const executionPersistence = createPersistenceService('db');
				executionRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });

				await executionPersistence.updateExistingExecution(executionId, { status: 'success' });

				expect(executionRepository.update).toHaveBeenCalledWith(
					{ id: executionId },
					expect.not.objectContaining({ jsonSizeBytes: expect.anything() }),
				);
			});
		});

		describe('binaryDataSizeBytes tracking', () => {
			it('persists the summed offloaded binary size when data is provided', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);
				fsStore.write.mockResolvedValue(2048);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, {
					data: runDataWithBinary([{ a: { id: 'fs:1', bytes: 200 } }]),
				});

				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes: 2048, binaryDataSizeBytes: 200 },
				);
			});

			it('leaves binaryDataSizeBytes untouched on a workflowData-only update', async () => {
				const executionPersistence = createPersistenceService('fs');
				mockEntity('fs');
				fsStore.read.mockResolvedValue(existingBundle);
				fsStore.write.mockResolvedValue(512);

				const mockTx = createMockTransaction();
				executionRepository.manager.transaction = createMockTx(mockTx);

				await executionPersistence.updateExistingExecution(executionId, { workflowData });

				// data was not supplied, so only jsonSizeBytes is written; binary can't be derived here.
				expect(mockTx.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes: 512 },
				);
				expect(mockTx.update).not.toHaveBeenCalledWith(
					ExecutionEntity,
					expect.anything(),
					expect.objectContaining({ binaryDataSizeBytes: expect.anything() }),
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
				jsonSizeBytes: 4096,
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
				jsonSizeBytes: 4096,
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
				jsonSizeBytes: 4096,
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

			expect(executionRepository.reportInvalidExecutions).toHaveBeenCalledWith([dbB]);
			expect(executionRepository.reportInvalidExecutions).toHaveBeenCalledWith([fsC]);
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

	describe('getExecutionsForPublicApi', () => {
		const wf = 'wf-1';
		const where = { workflowId: wf };
		const publicApiSelect = [
			'id',
			'mode',
			'retryOf',
			'retrySuccessId',
			'startedAt',
			'stoppedAt',
			'workflowId',
			'waitTill',
			'finished',
			'status',
		];

		beforeEach(() => {
			executionRepository.getFindExecutionsForPublicApiCondition.mockReturnValue(where);
		});

		it('should query per the repository where condition, without data when not requested', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findMultipleExecutions.mockResolvedValue([]);
			const params = { limit: 10, workflowIds: [wf] };

			await executionPersistence.getExecutionsForPublicApi(params);

			expect(executionRepository.getFindExecutionsForPublicApiCondition).toHaveBeenCalledWith(
				params,
			);
			expect(executionRepository.findMultipleExecutions).toHaveBeenCalledWith(
				{ select: publicApiSelect, where, order: { id: 'DESC' }, take: 10 },
				{ includeData: undefined, unflattenData: true },
			);
		});

		it('should read data from the matching store when data is requested', async () => {
			const executionPersistence = createPersistenceService('db');
			const s3Store = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);

			const entity = {
				id: 'exec-1',
				workflowId: wf,
				storedAt: 's3',
				metadata: [],
				status: 'success',
			} as unknown as ExecutionEntity;
			executionRepository.find.mockResolvedValue([entity]);
			s3Store.readMany.mockResolvedValue(
				new Map([
					[
						'exec-1',
						{
							data: '[{},{}]',
							workflowData: { id: wf, name: 'wf', nodes: [], connections: {} },
							workflowVersionId: 'v1',
							version: 1 as const,
						},
					],
				]),
			);

			const result = await executionPersistence.getExecutionsForPublicApi({
				limit: 10,
				includeData: true,
			});

			expect(s3Store.readMany).toHaveBeenCalledWith([{ workflowId: wf, executionId: 'exec-1' }]);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('exec-1');
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

		it('should delete execution, binary data, and s3 data when storedAt is s3', async () => {
			const s3Store = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);
			const target = { ...baseTarget, storedAt: 's3' as const };

			await executionPersistence.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ type: 'execution', ...target }]);
			expect(s3Store.delete).toHaveBeenCalledWith([target]);
			expect(fsStore.delete).not.toHaveBeenCalled();
		});

		it('should route mixed targets to their respective stores', async () => {
			const s3Store = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);
			const targets = [
				{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'fs' as const },
				{ workflowId: 'wf-2', executionId: 'exec-2', storedAt: 's3' as const },
				{ workflowId: 'wf-3', executionId: 'exec-3', storedAt: 'db' as const },
			];

			await executionPersistence.hardDelete(targets);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1', 'exec-2', 'exec-3']);
			expect(fsStore.delete).toHaveBeenCalledWith([targets[0]]);
			expect(s3Store.delete).toHaveBeenCalledWith([targets[1]]);
		});

		it('should warn and still delete entities when s3 data exists but no s3 store is set', async () => {
			const executionPersistenceWithoutS3 = createPersistenceService('db');
			const target = { ...baseTarget, storedAt: 's3' as const };

			await executionPersistenceWithoutS3.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				executionIds: ['exec-1'],
			});
		});

		it('should delete execution, binary data, and az data when storedAt is az', async () => {
			const azStore = mock<ExecutionDataStore>();
			executionPersistence.setAzStore(azStore);
			const target = { ...baseTarget, storedAt: 'az' as const };

			await executionPersistence.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ type: 'execution', ...target }]);
			expect(azStore.delete).toHaveBeenCalledWith([target]);
			expect(fsStore.delete).not.toHaveBeenCalled();
		});

		it('should route mixed targets including az to their respective stores', async () => {
			const s3Store = mock<ExecutionDataStore>();
			const azStore = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);
			executionPersistence.setAzStore(azStore);
			const targets = [
				{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'fs' as const },
				{ workflowId: 'wf-2', executionId: 'exec-2', storedAt: 's3' as const },
				{ workflowId: 'wf-3', executionId: 'exec-3', storedAt: 'az' as const },
				{ workflowId: 'wf-4', executionId: 'exec-4', storedAt: 'db' as const },
			];

			await executionPersistence.hardDelete(targets);

			expect(fsStore.delete).toHaveBeenCalledWith([targets[0]]);
			expect(s3Store.delete).toHaveBeenCalledWith([targets[1]]);
			expect(azStore.delete).toHaveBeenCalledWith([targets[2]]);
		});

		it('should warn and still delete entities when az data exists but no az store is set', async () => {
			const executionPersistenceWithoutAz = createPersistenceService('db');
			const target = { ...baseTarget, storedAt: 'az' as const };

			await executionPersistenceWithoutAz.hardDelete(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				executionIds: ['exec-1'],
			});
		});
	});

	describe('hardDeleteBy', () => {
		const executionPersistence = createPersistenceService('db');
		const criteria = {
			filters: { id: '1' },
			accessibleWorkflowIds: ['wf-1'],
			deleteConditions: { ids: ['1'] },
		};

		it('should delete fs and s3 data per the refs returned by the repository', async () => {
			const s3Store = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);
			const refs = [
				{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'fs' as const },
				{ workflowId: 'wf-2', executionId: 'exec-2', storedAt: 's3' as const },
				{ workflowId: 'wf-3', executionId: 'exec-3', storedAt: 'db' as const },
			];
			executionRepository.deleteExecutionsByFilter.mockResolvedValue(refs);

			await executionPersistence.hardDeleteBy(criteria);

			expect(executionRepository.deleteExecutionsByFilter).toHaveBeenCalledWith(criteria);
			expect(fsStore.delete).toHaveBeenCalledWith([refs[0]]);
			expect(s3Store.delete).toHaveBeenCalledWith([refs[1]]);
		});

		it('should not call any store when no refs are returned', async () => {
			const s3Store = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);
			executionRepository.deleteExecutionsByFilter.mockResolvedValue([]);

			await executionPersistence.hardDeleteBy(criteria);

			expect(fsStore.delete).not.toHaveBeenCalled();
			expect(s3Store.delete).not.toHaveBeenCalled();
		});

		it('should warn and skip s3 data deletion when no s3 store is set', async () => {
			const executionPersistenceWithoutS3 = createPersistenceService('db');
			const refs = [{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 's3' as const }];
			executionRepository.deleteExecutionsByFilter.mockResolvedValue(refs);

			await expect(executionPersistenceWithoutS3.hardDeleteBy(criteria)).resolves.not.toThrow();

			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				executionIds: ['exec-1'],
			});
		});

		it('should delete fs, s3, and az data per the refs returned by the repository', async () => {
			const s3Store = mock<ExecutionDataStore>();
			const azStore = mock<ExecutionDataStore>();
			executionPersistence.setS3Store(s3Store);
			executionPersistence.setAzStore(azStore);
			const refs = [
				{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'fs' as const },
				{ workflowId: 'wf-2', executionId: 'exec-2', storedAt: 's3' as const },
				{ workflowId: 'wf-3', executionId: 'exec-3', storedAt: 'az' as const },
				{ workflowId: 'wf-4', executionId: 'exec-4', storedAt: 'db' as const },
			];
			executionRepository.deleteExecutionsByFilter.mockResolvedValue(refs);

			await executionPersistence.hardDeleteBy(criteria);

			expect(fsStore.delete).toHaveBeenCalledWith([refs[0]]);
			expect(s3Store.delete).toHaveBeenCalledWith([refs[1]]);
			expect(azStore.delete).toHaveBeenCalledWith([refs[2]]);
		});

		it('should warn and skip az data deletion when no az store is set', async () => {
			const executionPersistenceWithoutAz = createPersistenceService('db');
			const refs = [{ workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'az' as const }];
			executionRepository.deleteExecutionsByFilter.mockResolvedValue(refs);

			await expect(executionPersistenceWithoutAz.hardDeleteBy(criteria)).resolves.not.toThrow();

			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				executionIds: ['exec-1'],
			});
		});
	});

	describe('deleteUnsaved', () => {
		const target = { workflowId: 'wf-1', executionId: 'exec-1', storedAt: 'db' as const };

		it('should soft-delete with backdated `deletedAt` when pruning is enabled', async () => {
			vi.useFakeTimers();
			const now = Date.now();

			executionsConfig.pruneData = true;
			executionsConfig.pruneDataHardDeleteBuffer = 1;
			const executionPersistence = createPersistenceService('db');

			await executionPersistence.deleteInFlightExecution(target);

			expect(executionRepository.update).toHaveBeenCalledWith('exec-1', {
				deletedAt: new Date(now - 3600_000),
			});
			expect(executionRepository.deleteByIds).not.toHaveBeenCalled();

			vi.useRealTimers();
		});

		it('should hard-delete immediately when pruning is disabled', async () => {
			executionsConfig.pruneData = false;
			const executionPersistence = createPersistenceService('db');

			await executionPersistence.deleteInFlightExecution(target);

			expect(executionRepository.deleteByIds).toHaveBeenCalledWith(['exec-1']);
			expect(executionRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('execution data metrics events', () => {
		const createPayload: CreateExecutionPayload = {
			data: runData,
			workflowData,
			mode: 'manual',
			finished: false,
			status: 'new',
			workflowId: 'workflow-123',
		};

		const readBundle = {
			data: '[{"resultData":"1"},{}]',
			workflowData: { id: 'wf-1', name: 's', nodes: [], connections: {}, settings: undefined },
			workflowVersionId: 'v-1',
			version: 1 as const,
		};

		const entity = (storedAt: 'db' | 'fs', id = 'exec-1') =>
			({
				id,
				workflowId: 'wf-1',
				storedAt,
				metadata: [],
				annotation: undefined,
				status: 'success',
			}) as unknown as ExecutionEntity;

		it('emits a successful write event on create', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.manager.transaction = createMockTx(createMockTransaction());

			await executionPersistence.create(createPayload);

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-write',
				expect.objectContaining({ mode: 'db', success: true, durationMs: expect.any(Number) }),
			);
		});

		it('emits a failed write event when the store write throws', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.manager.transaction = createMockTx(createMockTransaction());
			dbStore.write.mockRejectedValueOnce(new Error('disk full'));

			await expect(executionPersistence.create(createPayload)).rejects.toThrow('disk full');

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-write',
				expect.objectContaining({ mode: 'db', success: false }),
			);
		});

		it('emits a successful read event when a single bundle is found', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			dbStore.read.mockResolvedValue(readBundle);

			await executionPersistence.findSingleExecution('exec-1', { includeData: true });

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: true, unreadableBundles: 0 }),
			);
		});

		it('emits a failed read with one unreadable bundle when a single bundle is missing', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			dbStore.read.mockResolvedValue(null);

			await executionPersistence.findSingleExecution('exec-1', { includeData: true });

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 1 }),
			);
		});

		it('emits a read failure and no write when the read-merge bundle is missing', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			executionRepository.manager.transaction = createMockTx(createMockTransaction());
			dbStore.read.mockResolvedValue(null);

			await expect(
				executionPersistence.updateExistingExecution('exec-1', { data: runData }),
			).rejects.toBeInstanceOf(MissingExecutionDataError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 1 }),
			);
			expect(eventService.emit).not.toHaveBeenCalledWith('execution-data-write', expect.anything());
		});

		it('counts dropped bundles from a partial batch read as unreadable', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.find.mockResolvedValue([entity('db', 'exec-1'), entity('db', 'exec-2')]);
			dbStore.readMany.mockResolvedValue(new Map([['exec-1', readBundle]]));

			await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: true, unreadableBundles: 1 }),
			);
		});

		it('emits a failed read with zero unreadable bundles when the store read throws', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			dbStore.read.mockRejectedValueOnce(new Error('db connection lost'));

			await expect(
				executionPersistence.findSingleExecution('exec-1', { includeData: true }),
			).rejects.toThrow('db connection lost');

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 0 }),
			);
		});

		it('emits a failed read with one unreadable bundle when a fetched bundle fails to deserialize', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			dbStore.read.mockResolvedValue({ ...readBundle, data: 'not-valid-flatted' });

			await expect(
				executionPersistence.findSingleExecution('exec-1', {
					includeData: true,
					unflattenData: true,
				}),
			).rejects.toBeInstanceOf(CorruptedExecutionDataError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 1 }),
			);
		});

		it('emits a failed read with one unreadable bundle when the store read reports corruption', async () => {
			const executionPersistence = createPersistenceService('fs');
			executionRepository.findOne.mockResolvedValue(entity('fs'));
			fsStore.read.mockRejectedValueOnce(
				new CorruptedExecutionDataError(
					{ workflowId: 'wf-1', executionId: 'exec-1' },
					new Error('x'),
				),
			);

			await expect(
				executionPersistence.findSingleExecution('exec-1', { includeData: true }),
			).rejects.toBeInstanceOf(CorruptedExecutionDataError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'fs', success: false, unreadableBundles: 1 }),
			);
		});

		it('emits a read failure with one unreadable bundle when the read-merge read reports corruption', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			executionRepository.manager.transaction = createMockTx(createMockTransaction());
			dbStore.read.mockRejectedValueOnce(
				new CorruptedExecutionDataError(
					{ workflowId: 'wf-1', executionId: 'exec-1' },
					new Error('x'),
				),
			);

			await expect(
				executionPersistence.updateExistingExecution('exec-1', { data: runData }),
			).rejects.toBeInstanceOf(CorruptedExecutionDataError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 1 }),
			);
		});

		it('counts a corrupt bundle in a batch as unreadable, reports it, and returns the rest', async () => {
			const executionPersistence = createPersistenceService('db');
			const good = entity('db', 'exec-1');
			const corrupt = entity('db', 'exec-2');
			executionRepository.find.mockResolvedValue([good, corrupt]);
			dbStore.readMany.mockResolvedValue(
				new Map([
					['exec-1', readBundle],
					['exec-2', { ...readBundle, data: 'not-valid-flatted' }],
				]),
			);

			const result = await executionPersistence.findMultipleExecutions(
				{},
				{ includeData: true, unflattenData: true },
			);

			expect(result.map((e) => e.id)).toEqual(['exec-1']);
			expect(executionRepository.reportInvalidExecutions).toHaveBeenCalledWith([corrupt]);
			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: true, unreadableBundles: 1 }),
			);
		});

		it('fails the batch when an assembly error is not a corrupt bundle', async () => {
			const executionPersistence = createPersistenceService('db');
			// `metadata: undefined` makes assembly throw a plain `TypeError`, not a corruption error.
			const broken = {
				id: 'exec-1',
				workflowId: 'wf-1',
				storedAt: 'db',
				metadata: undefined,
				annotation: undefined,
				status: 'success',
			} as unknown as ExecutionEntity;
			executionRepository.find.mockResolvedValue([broken]);
			dbStore.readMany.mockResolvedValue(new Map([['exec-1', readBundle]]));

			await expect(
				executionPersistence.findMultipleExecutions({}, { includeData: true }),
			).rejects.toThrow();

			expect(executionRepository.reportInvalidExecutions).not.toHaveBeenCalled();
		});

		it('treats an unsupported execution-data version as a corrupt bundle', async () => {
			const executionPersistence = createPersistenceService('db');
			executionRepository.findOne.mockResolvedValue(entity('db'));
			// Parses fine, but carries a version the migration step does not support.
			dbStore.read.mockResolvedValue({ ...readBundle, data: '[{"version":99}]' });

			await expect(
				executionPersistence.findSingleExecution('exec-1', {
					includeData: true,
					unflattenData: true,
				}),
			).rejects.toBeInstanceOf(CorruptedExecutionDataError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 1 }),
			);
		});

		it('keeps the missing-bundle count when an unexpected error fails the batch', async () => {
			const executionPersistence = createPersistenceService('db');
			const missing = entity('db', 'exec-1');
			// `metadata: undefined` makes assembly throw a plain `TypeError`, not a corruption error.
			const broken = {
				id: 'exec-2',
				workflowId: 'wf-1',
				storedAt: 'db',
				metadata: undefined,
				annotation: undefined,
				status: 'success',
			} as unknown as ExecutionEntity;
			executionRepository.find.mockResolvedValue([missing, broken]);
			dbStore.readMany.mockResolvedValue(new Map([['exec-2', readBundle]]));

			await expect(
				executionPersistence.findMultipleExecutions({}, { includeData: true }),
			).rejects.toThrow();

			expect(eventService.emit).toHaveBeenCalledWith(
				'execution-data-read',
				expect.objectContaining({ mode: 'db', success: false, unreadableBundles: 1 }),
			);
		});
	});

	describe('s3 mode', () => {
		const s3Store = mock<ExecutionDataStore>();

		const createPayload: CreateExecutionPayload = {
			data: runData,
			workflowData,
			mode: 'manual',
			finished: false,
			status: 'new',
			workflowId: 'workflow-123',
		};

		const bundle = {
			data: '[{"resultData":"1"},{}]',
			workflowData: { id: 'wf-1', name: 's', nodes: [], connections: {}, settings: undefined },
			workflowVersionId: 'v-1',
			version: 1 as const,
		};

		const s3Entity = (id = 'exec-1') =>
			({
				id,
				workflowId: 'wf-1',
				storedAt: 's3',
				metadata: [],
				annotation: undefined,
				status: 'success',
			}) as unknown as ExecutionEntity;

		it('throws when an execution routes to s3 but no S3 store is registered', async () => {
			const executionPersistence = createPersistenceService('s3');
			executionRepository.manager.transaction = createMockTx(createMockTransaction());

			await expect(executionPersistence.create(createPayload)).rejects.toThrow(UnexpectedError);
		});

		it('writes via the registered S3 store on create with `storedAt: s3`', async () => {
			const executionPersistence = createPersistenceService('s3');
			executionPersistence.setS3Store(s3Store);
			const mockTx = createMockTransaction();
			executionRepository.manager.transaction = createMockTx(mockTx);

			const executionId = await executionPersistence.create(createPayload);

			expect(executionId).toBe('exec-1');
			expect(mockTx.insert).toHaveBeenCalledWith(
				ExecutionEntity,
				expect.objectContaining({ storedAt: 's3' }),
			);
			expect(s3Store.write).toHaveBeenCalledWith(
				{ workflowId: 'workflow-123', executionId: 'exec-1' },
				expect.objectContaining({ workflowVersionId: 'version-abc' }),
				mockTx,
			);
			expect(dbStore.write).not.toHaveBeenCalled();
			expect(fsStore.write).not.toHaveBeenCalled();
		});

		it('reads via the registered S3 store on findSingleExecution', async () => {
			const executionPersistence = createPersistenceService('s3');
			executionPersistence.setS3Store(s3Store);
			executionRepository.findOne.mockResolvedValue(s3Entity());
			s3Store.read.mockResolvedValue(bundle);

			const result = await executionPersistence.findSingleExecution('exec-1', {
				includeData: true,
			});

			expect(s3Store.read).toHaveBeenCalledWith({ workflowId: 'wf-1', executionId: 'exec-1' });
			expect(result).toMatchObject({ data: bundle.data, workflowData: bundle.workflowData });
			expect(dbStore.read).not.toHaveBeenCalled();
			expect(fsStore.read).not.toHaveBeenCalled();
		});

		it('hard-fails a missing s3 bundle like fs (throw), unlike db (report + undefined)', async () => {
			const executionPersistence = createPersistenceService('s3');
			executionPersistence.setS3Store(s3Store);
			const entity = s3Entity();
			executionRepository.findOne.mockResolvedValue(entity);
			s3Store.read.mockResolvedValue(null);

			await expect(
				executionPersistence.findSingleExecution('exec-1', { includeData: true }),
			).rejects.toBeInstanceOf(MissingExecutionDataError);
			expect(executionRepository.reportInvalidExecutions).not.toHaveBeenCalled();
		});

		it('partitions a multi-read to the S3 store', async () => {
			const executionPersistence = createPersistenceService('s3');
			executionPersistence.setS3Store(s3Store);
			executionRepository.find.mockResolvedValue([s3Entity('a'), s3Entity('b')]);
			s3Store.readMany.mockResolvedValue(
				new Map([
					['a', bundle],
					['b', bundle],
				]),
			);

			const result = await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(s3Store.readMany).toHaveBeenCalledWith([
				{ workflowId: 'wf-1', executionId: 'a' },
				{ workflowId: 'wf-1', executionId: 'b' },
			]);
			expect(result).toHaveLength(2);
			expect(dbStore.readMany).not.toHaveBeenCalled();
			expect(fsStore.readMany).not.toHaveBeenCalled();
		});
	});

	describe('azure mode', () => {
		const azStore = mock<ExecutionDataStore>();

		const createPayload: CreateExecutionPayload = {
			data: runData,
			workflowData,
			mode: 'manual',
			finished: false,
			status: 'new',
			workflowId: 'workflow-123',
		};

		const bundle = {
			data: '[{"resultData":"1"},{}]',
			workflowData: { id: 'wf-1', name: 's', nodes: [], connections: {}, settings: undefined },
			workflowVersionId: 'v-1',
			version: 1 as const,
		};

		const azEntity = (id = 'exec-1') =>
			({
				id,
				workflowId: 'wf-1',
				storedAt: 'az',
				metadata: [],
				annotation: undefined,
				status: 'success',
			}) as unknown as ExecutionEntity;

		it('throws when an execution routes to az but no Azure store is registered', async () => {
			const executionPersistence = createPersistenceService('az');
			executionRepository.manager.transaction = createMockTx(createMockTransaction());

			await expect(executionPersistence.create(createPayload)).rejects.toThrow(UnexpectedError);
		});

		it('writes via the registered Azure store on create with `storedAt: az`', async () => {
			const executionPersistence = createPersistenceService('az');
			executionPersistence.setAzStore(azStore);
			const mockTx = createMockTransaction();
			executionRepository.manager.transaction = createMockTx(mockTx);

			const executionId = await executionPersistence.create(createPayload);

			expect(executionId).toBe('exec-1');
			expect(mockTx.insert).toHaveBeenCalledWith(
				ExecutionEntity,
				expect.objectContaining({ storedAt: 'az' }),
			);
			expect(azStore.write).toHaveBeenCalledWith(
				{ workflowId: 'workflow-123', executionId: 'exec-1' },
				expect.objectContaining({ workflowVersionId: 'version-abc' }),
				mockTx,
			);
			expect(dbStore.write).not.toHaveBeenCalled();
			expect(fsStore.write).not.toHaveBeenCalled();
		});

		it('reads via the registered Azure store on findSingleExecution', async () => {
			const executionPersistence = createPersistenceService('az');
			executionPersistence.setAzStore(azStore);
			executionRepository.findOne.mockResolvedValue(azEntity());
			azStore.read.mockResolvedValue(bundle);

			const result = await executionPersistence.findSingleExecution('exec-1', {
				includeData: true,
			});

			expect(azStore.read).toHaveBeenCalledWith({ workflowId: 'wf-1', executionId: 'exec-1' });
			expect(result).toMatchObject({ data: bundle.data, workflowData: bundle.workflowData });
			expect(dbStore.read).not.toHaveBeenCalled();
			expect(fsStore.read).not.toHaveBeenCalled();
		});

		it('hard-fails a missing az bundle like fs (throw), unlike db (report + undefined)', async () => {
			const executionPersistence = createPersistenceService('az');
			executionPersistence.setAzStore(azStore);
			const entity = azEntity();
			executionRepository.findOne.mockResolvedValue(entity);
			azStore.read.mockResolvedValue(null);

			await expect(
				executionPersistence.findSingleExecution('exec-1', { includeData: true }),
			).rejects.toBeInstanceOf(MissingExecutionDataError);
			expect(executionRepository.reportInvalidExecutions).not.toHaveBeenCalled();
		});

		it('partitions a multi-read to the Azure store', async () => {
			const executionPersistence = createPersistenceService('az');
			executionPersistence.setAzStore(azStore);
			executionRepository.find.mockResolvedValue([azEntity('a'), azEntity('b')]);
			azStore.readMany.mockResolvedValue(
				new Map([
					['a', bundle],
					['b', bundle],
				]),
			);

			const result = await executionPersistence.findMultipleExecutions({}, { includeData: true });

			expect(azStore.readMany).toHaveBeenCalledWith([
				{ workflowId: 'wf-1', executionId: 'a' },
				{ workflowId: 'wf-1', executionId: 'b' },
			]);
			expect(result).toHaveLength(2);
			expect(dbStore.readMany).not.toHaveBeenCalled();
			expect(fsStore.readMany).not.toHaveBeenCalled();
		});
	});
});
