/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { EntityManager, EntityMetadata } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { WorkflowPublicationOutbox } from '../../entities/workflow-publication-outbox';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { WorkflowPublicationOutboxRepository } from '../workflow-publication-outbox.repository';

describe('WorkflowPublicationOutboxRepository', () => {
	const entityManager = mockEntityManager(WorkflowPublicationOutbox);
	const globalConfig = mockInstance(GlobalConfig, {
		logging: { outputs: ['console'], scopes: [] },
	});
	const repository = Container.get(WorkflowPublicationOutboxRepository);

	// `claimNextPendingRecord` reads `this.metadata.tableName` on the Postgres
	// path. The default mock leaves it auto-mocked; pin it (and the target the
	// repo passes to TypeORM) so call assertions are deterministic.
	Object.defineProperty(repository, 'metadata', {
		value: mock<EntityMetadata>({
			target: WorkflowPublicationOutbox,
			tableName: 'workflow_publication_outbox',
		}),
		configurable: true,
	});

	// SQLite paths run `manager.transaction(fn)`. Stub the call so it forwards
	// to a transaction-scoped EntityManager mock and we can assert on what was
	// done inside.
	let txManager: ReturnType<typeof mock<EntityManager>>;

	beforeEach(() => {
		jest.resetAllMocks();
		txManager = mock<EntityManager>();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(entityManager.transaction as any).mockImplementation(
			async (runInTransaction: (mgr: EntityManager) => Promise<unknown>) =>
				await runInTransaction(txManager),
		);
	});

	describe('enqueue', () => {
		describe('on sqlite', () => {
			beforeEach(() => {
				globalConfig.database.type = 'sqlite';
			});

			it('inserts a new pending record when none exists for the workflow', async () => {
				const created = Object.assign(new WorkflowPublicationOutbox(), {
					id: 1,
					workflowId: 'wf-1',
					publishedVersionId: 'v-1',
					status: 'pending',
					errorMessage: null,
				});
				txManager.findOne.mockResolvedValueOnce(null);
				txManager.create.mockReturnValueOnce(created as never);
				txManager.save.mockResolvedValueOnce(created as never);

				const result = await repository.enqueue('wf-1', 'v-1');

				expect(entityManager.transaction).toHaveBeenCalled();
				expect(txManager.save).toHaveBeenCalledWith(created);
				expect(result).toBe(created);
			});

			it('supersedes the publishedVersionId on an existing pending record', async () => {
				const existing = Object.assign(new WorkflowPublicationOutbox(), {
					id: 9,
					workflowId: 'wf-1',
					publishedVersionId: 'v-old',
					status: 'pending',
					errorMessage: null,
				});
				txManager.findOne.mockResolvedValueOnce(existing);

				const result = await repository.enqueue('wf-1', 'v-new');

				expect(txManager.update).toHaveBeenCalledWith(WorkflowPublicationOutbox, 9, {
					publishedVersionId: 'v-new',
				});
				expect(txManager.save).not.toHaveBeenCalled();
				expect(result.publishedVersionId).toBe('v-new');
				expect(result.id).toBe(9);
			});
		});

		describe('on postgres', () => {
			beforeEach(() => {
				globalConfig.database.type = 'postgresdb';
			});

			it('issues a single ON CONFLICT upsert and returns the resulting row', async () => {
				const row = Object.assign(new WorkflowPublicationOutbox(), {
					id: 4,
					workflowId: 'wf-1',
					publishedVersionId: 'v-1',
					status: 'pending',
					errorMessage: null,
				});
				entityManager.query.mockResolvedValueOnce([row]);

				const result = await repository.enqueue('wf-1', 'v-1');

				expect(entityManager.query).toHaveBeenCalledTimes(1);
				const [sql, params] = entityManager.query.mock.calls[0]!;
				expect(sql).toContain('"workflow_publication_outbox"');
				expect(sql).toContain('ON CONFLICT ("workflowId") WHERE "status" = \'pending\'');
				expect(sql).toContain('DO UPDATE SET "publishedVersionId" = EXCLUDED."publishedVersionId"');
				expect(sql).toContain('RETURNING *');
				expect(params).toEqual(['wf-1', 'v-1']);
				expect(result).toBe(row);
			});
		});
	});

	describe('claimNextPendingRecord', () => {
		describe('on sqlite', () => {
			beforeEach(() => {
				globalConfig.database.type = 'sqlite';
			});

			it('claims the oldest pending record inside a transaction', async () => {
				const pending = Object.assign(new WorkflowPublicationOutbox(), {
					id: 7,
					workflowId: 'wf-1',
					publishedVersionId: 'v-1',
					status: 'pending',
					errorMessage: null,
				});
				txManager.findOne.mockResolvedValueOnce(pending);

				const result = await repository.claimNextPendingRecord();

				expect(entityManager.transaction).toHaveBeenCalled();
				expect(txManager.findOne).toHaveBeenCalledWith(WorkflowPublicationOutbox, {
					where: { status: 'pending' },
					order: { id: 'ASC' },
				});
				expect(txManager.update).toHaveBeenCalledWith(WorkflowPublicationOutbox, 7, {
					status: 'in_progress',
				});
				expect(result?.status).toBe('in_progress');
				expect(result?.id).toBe(7);
			});

			it('returns null without writing when nothing is pending', async () => {
				txManager.findOne.mockResolvedValueOnce(null);

				const result = await repository.claimNextPendingRecord();

				expect(result).toBeNull();
				expect(txManager.update).not.toHaveBeenCalled();
			});
		});

		describe('on postgres', () => {
			beforeEach(() => {
				globalConfig.database.type = 'postgresdb';
			});

			it('issues a single FOR UPDATE SKIP LOCKED claim query and returns the claimed row', async () => {
				const claimed = Object.assign(new WorkflowPublicationOutbox(), {
					id: 12,
					workflowId: 'wf-1',
					publishedVersionId: 'v-1',
					status: 'in_progress',
					errorMessage: null,
				});
				entityManager.query.mockResolvedValueOnce([claimed]);

				const result = await repository.claimNextPendingRecord();

				expect(entityManager.query).toHaveBeenCalledTimes(1);
				const sql = entityManager.query.mock.calls[0]![0] as string;
				expect(sql).toContain('"workflow_publication_outbox"');
				expect(sql).toContain("'in_progress'");
				expect(sql).toContain("'pending'");
				expect(sql).toContain('FOR UPDATE SKIP LOCKED');
				expect(sql).toContain('RETURNING *');
				expect(result).toBe(claimed);
			});

			it('returns null when the claim query finds no pending row', async () => {
				entityManager.query.mockResolvedValueOnce([]);

				const result = await repository.claimNextPendingRecord();

				expect(result).toBeNull();
			});
		});
	});

	describe('markCompleted', () => {
		it('clears the error message and sets status to completed', async () => {
			globalConfig.database.type = 'sqlite';

			await repository.markCompleted(42);

			expect(entityManager.update).toHaveBeenCalledWith(WorkflowPublicationOutbox, 42, {
				status: 'completed',
				errorMessage: null,
			});
		});
	});

	describe('markFailed', () => {
		it('records the error message and sets status to failed', async () => {
			globalConfig.database.type = 'sqlite';

			await repository.markFailed(42, 'boom');

			expect(entityManager.update).toHaveBeenCalledWith(WorkflowPublicationOutbox, 42, {
				status: 'failed',
				errorMessage: 'boom',
			});
		});
	});
});
