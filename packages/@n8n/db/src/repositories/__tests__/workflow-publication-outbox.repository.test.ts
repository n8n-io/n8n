/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { EntityMetadata } from '@n8n/typeorm';
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

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('enqueue', () => {
		describe('on sqlite', () => {
			beforeEach(() => {
				globalConfig.database.type = 'sqlite';
			});

			it('inserts a new pending record when none exists for the workflow', async () => {
				entityManager.findOne.mockResolvedValueOnce(null);
				entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

				const result = await repository.enqueue('wf-1', 'v-1');

				expect(entityManager.save).toHaveBeenCalledWith(
					WorkflowPublicationOutbox,
					expect.objectContaining({
						workflowId: 'wf-1',
						publishedVersionId: 'v-1',
						status: 'pending',
					}),
					undefined,
				);
				expect(entityManager.update).not.toHaveBeenCalled();
				expect(result.status).toBe('pending');
			});

			it('supersedes the publishedVersionId on an existing pending record', async () => {
				const existing = Object.assign(new WorkflowPublicationOutbox(), {
					id: 9,
					workflowId: 'wf-1',
					publishedVersionId: 'v-old',
					status: 'pending',
					errorMessage: null,
				});
				entityManager.findOne.mockResolvedValueOnce(existing);

				const result = await repository.enqueue('wf-1', 'v-new');

				expect(entityManager.update).toHaveBeenCalledWith(WorkflowPublicationOutbox, 9, {
					publishedVersionId: 'v-new',
				});
				expect(entityManager.save).not.toHaveBeenCalled();
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
				expect(entityManager.findOne).not.toHaveBeenCalled();
				expect(result).toBe(row);
			});
		});
	});

	describe('claimNextPendingRecord', () => {
		describe('on sqlite', () => {
			beforeEach(() => {
				globalConfig.database.type = 'sqlite';
			});

			it('returns null when no record is pending', async () => {
				entityManager.findOne.mockResolvedValueOnce(null);

				const result = await repository.claimNextPendingRecord();

				expect(result).toBeNull();
				expect(entityManager.update).not.toHaveBeenCalled();
			});

			it('claims the oldest pending record and transitions it to in_progress', async () => {
				const pending = Object.assign(new WorkflowPublicationOutbox(), {
					id: 7,
					workflowId: 'wf-1',
					publishedVersionId: 'v-1',
					status: 'pending',
					errorMessage: null,
				});
				entityManager.findOne.mockResolvedValueOnce(pending);

				const result = await repository.claimNextPendingRecord();

				expect(entityManager.findOne).toHaveBeenCalledWith(WorkflowPublicationOutbox, {
					where: { status: 'pending' },
					order: { id: 'ASC' },
				});
				expect(entityManager.update).toHaveBeenCalledWith(WorkflowPublicationOutbox, 7, {
					status: 'in_progress',
				});
				expect(result?.status).toBe('in_progress');
				expect(result?.id).toBe(7);
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
				// We never read the SQLite path on postgres.
				expect(entityManager.findOne).not.toHaveBeenCalled();
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
