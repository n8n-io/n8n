import { GlobalConfig } from '@n8n/config';
import { In, type SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { IWorkflowSettings } from 'n8n-workflow';

import { WorkflowEntity } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { FolderRepository } from '../folder.repository';
import { WorkflowRepository } from '../workflow.repository';

describe('WorkflowRepository', () => {
	const entityManager = mockEntityManager(WorkflowEntity);
	const globalConfig = mockInstance(GlobalConfig, {
		database: { type: 'postgresdb' },
	});
	const folderRepository = mockInstance(FolderRepository);
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		globalConfig,
		folderRepository,
	);

	let queryBuilder: jest.Mocked<SelectQueryBuilder<WorkflowEntity>>;

	beforeEach(() => {
		jest.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<WorkflowEntity>>();
		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.orWhere.mockReturnThis();
		queryBuilder.select.mockReturnThis();
		queryBuilder.addSelect.mockReturnThis();
		queryBuilder.leftJoin.mockReturnThis();
		queryBuilder.innerJoin.mockReturnThis();
		queryBuilder.orderBy.mockReturnThis();
		queryBuilder.addOrderBy.mockReturnThis();
		queryBuilder.skip.mockReturnThis();
		queryBuilder.take.mockReturnThis();
		queryBuilder.getMany.mockResolvedValue([]);
		queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

		Object.defineProperty(queryBuilder, 'expressionMap', {
			value: {
				aliases: [],
			},
			writable: true,
		});

		jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('applyNameFilter', () => {
		it('should search for workflows containing any word from the query', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'Users database' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('OR'),
				expect.objectContaining({
					searchWord0: '%users%',
					searchWord1: '%database%',
				}),
			);
		});

		it('should handle single word searches', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'workflow' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					searchWord0: '%workflow%',
				}),
			);
		});

		it('should handle queries with extra whitespace', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: '  Users   database  ' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// Should still result in just two words
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					searchWord0: '%users%',
					searchWord1: '%database%',
				}),
			);
		});

		it('should not apply filter when query is empty', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: '' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// andWhere should not be called for name filter
			const nameFilterCalls = (queryBuilder.andWhere as jest.Mock).mock.calls.filter((call) =>
				call[0]?.includes('workflow.name'),
			);
			expect(nameFilterCalls).toHaveLength(0);
		});

		it('should not apply filter when query is only whitespace', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: '   ' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// andWhere should not be called for name filter
			const nameFilterCalls = (queryBuilder.andWhere as jest.Mock).mock.calls.filter((call) =>
				call[0]?.includes('workflow.name'),
			);
			expect(nameFilterCalls).toHaveLength(0);
		});

		it('should use SQLite concatenation syntax for SQLite database', async () => {
			// Create a new repository instance with SQLite config
			const sqliteConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite' },
			});
			const sqliteWorkflowRepository = new WorkflowRepository(
				entityManager.connection,
				sqliteConfig,
				folderRepository,
			);
			jest.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test search' },
			};

			await sqliteWorkflowRepository.getMany(workflowIds, options);

			// Check for SQLite-specific concatenation syntax (||)
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining("workflow.name || ' ' || COALESCE"),
				expect.any(Object),
			);
		});

		it('should use CONCAT syntax for non-SQLite databases', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test search' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// Check for CONCAT syntax
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('CONCAT(workflow.name'),
				expect.any(Object),
			);
		});

		it('should search in both name and description fields', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'automation' },
			};

			await workflowRepository.getMany(workflowIds, options);

			const andWhereCall = (queryBuilder.andWhere as jest.Mock).mock.calls.find((call) =>
				call[0]?.includes('workflow.name'),
			);

			expect(andWhereCall).toBeDefined();
			expect(andWhereCall[0]).toContain('workflow.name');
			expect(andWhereCall[0]).toContain('workflow.description');
		});

		it('should handle special characters in search query', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test% _query' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					searchWord0: '%test%%',
					searchWord1: '%_query%',
				}),
			);
		});

		it('should be case-insensitive', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'USERS Database' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('LOWER'),
				expect.objectContaining({
					searchWord0: '%users%',
					searchWord1: '%database%',
				}),
			);
		});
	});

	describe('getMany', () => {
		it('should apply multiple filters together', async () => {
			const workflowIds = ['workflow1', 'workflow2'];
			const options = {
				filter: {
					query: 'automation task',
					active: true,
					projectId: 'project1',
				},
				take: 10,
				skip: 0,
			};

			await workflowRepository.getMany(workflowIds, options);

			// Check that filters were applied
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('workflow.name'),
				expect.objectContaining({
					searchWord0: '%automation%',
					searchWord1: '%task%',
				}),
			);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith('workflow.activeVersionId IS NOT NULL');

			expect(queryBuilder.innerJoin).toHaveBeenCalledWith('workflow.shared', 'shared');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('shared.projectId = :projectId', {
				projectId: 'project1',
			});

			// Check pagination
			expect(queryBuilder.skip).toHaveBeenCalledWith(0);
			expect(queryBuilder.take).toHaveBeenCalledWith(10);
		});
	});

	describe('applyActiveVersionRelation', () => {
		it('should join activeVersion relation when select.activeVersion is true', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				select: { activeVersion: true } as const,
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith([
				'activeVersion.versionId',
				'activeVersion.nodes',
				'activeVersion.connections',
			]);
		});

		it('should not join activeVersion relation by default when select is undefined', async () => {
			const workflowIds = ['workflow1'];

			await workflowRepository.getMany(workflowIds, {});

			const leftJoinCalls = (queryBuilder.leftJoin as jest.Mock).mock.calls.filter(
				(call) => call[0] === 'workflow.activeVersion',
			);
			expect(leftJoinCalls).toHaveLength(0);
		});

		it('should not join activeVersion relation when activeVersion is not in select', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				select: { name: true, createdAt: true } as const,
			};

			await workflowRepository.getMany(workflowIds, options);

			const leftJoinCalls = (queryBuilder.leftJoin as jest.Mock).mock.calls.filter(
				(call) => call[0] === 'workflow.activeVersion',
			);
			expect(leftJoinCalls).toHaveLength(0);
		});
	});

	describe('caller allowlist purge', () => {
		let writes: Array<{ id: string; callerIds: string }>;
		let writtenSettings: Array<IWorkflowSettings | undefined>;
		let selectQb: { where: jest.Mock; andWhere: jest.Mock; setLock: jest.Mock };

		const stubCandidates = (candidates: Array<Partial<WorkflowEntity>>) => {
			writes = [];
			writtenSettings = [];

			const select = {
				select: jest.fn(),
				where: jest.fn(),
				andWhere: jest.fn(),
				setLock: jest.fn(),
				getMany: jest.fn().mockResolvedValue(candidates),
			};
			select.select.mockReturnValue(select);
			select.where.mockReturnValue(select);
			select.andWhere.mockReturnValue(select);
			select.setLock.mockReturnValue(select);

			let pendingId = '';
			let pendingCallerIds = '';
			let pendingSettings: IWorkflowSettings | undefined;
			const update = {
				update: jest.fn(),
				set: jest.fn(),
				where: jest.fn(),
				setParameter: jest.fn(),
				execute: jest.fn(async () => {
					writes.push({ id: pendingId, callerIds: pendingCallerIds });
					writtenSettings.push(pendingSettings);
				}),
			};
			update.update.mockReturnValue(update);
			// Postgres writes the whole document, SQLite the one key through a parameter.
			update.set.mockImplementation((values: { settings: unknown }) => {
				if (typeof values.settings === 'object' && values.settings !== null) {
					pendingSettings = values.settings as IWorkflowSettings;
					pendingCallerIds = pendingSettings.callerIds ?? '';
				}
				return update;
			});
			update.where.mockImplementation((_sql: string, parameters: { workflowId: string }) => {
				pendingId = parameters.workflowId;
				return update;
			});
			update.setParameter.mockImplementation((_name: string, value: string) => {
				pendingCallerIds = value;
				return update;
			});

			jest
				.mocked(entityManager.createQueryBuilder)
				.mockImplementation(((...args: unknown[]) => (args.length > 0 ? select : update)) as never);

			entityManager.transaction.mockImplementation((async (...args: unknown[]) => {
				const runInTransaction = args.find((arg) => typeof arg === 'function');
				if (typeof runInTransaction !== 'function')
					throw new Error('Transaction callback is required');
				return await runInTransaction(entityManager);
			}) as never);

			selectQb = select;
			return select;
		};

		it('removes the entry and keeps the rest in order, whatever whitespace separates them', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,\n second , ,\tthird' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['second']);

			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'first,third' }]);
		});

		it('rewrites only the allowlists that hold the id as an entry of its own', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'abc,abcdef' },
				},
				{
					id: 'subworkflow-2',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'abcdef' },
				},
				{ id: 'subworkflow-3', settings: { callerPolicy: 'workflowsFromAList' } },
			]);

			await workflowRepository.removeFromCallerAllowlists(['abc']);

			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'abcdef' }]);
		});

		it('leaves an allowlist alone when the id only appears inside another entry', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'abc-1, abc-2' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['abc']);

			expect(writes).toEqual([]);
		});

		it('rewrites every workflow that names the id', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second' },
				},
				{
					id: 'subworkflow-2',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'second,third' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['second']);

			expect(writes).toEqual([
				{ id: 'subworkflow-1', callerIds: 'first' },
				{ id: 'subworkflow-2', callerIds: 'third' },
			]);
		});

		it('takes every id out of one allowlist in a single write', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second,third' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['first', 'third']);

			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'second' }]);
		});

		it('reads the candidates once, whatever the batch size, and locks only the ones it rewrites', async () => {
			const select = stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'one,first' },
				},
				{
					id: 'subworkflow-2',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['one', 'two']);

			expect(select.where).toHaveBeenCalledTimes(2);
			expect(select.where).toHaveBeenNthCalledWith(1, expect.stringContaining('callerIds'));
			expect(select.where).toHaveBeenNthCalledWith(2, 'workflow.id IN (:...ids)', {
				ids: ['subworkflow-1'],
			});
			expect(select.setLock).toHaveBeenCalledTimes(1);
			expect(select.setLock).toHaveBeenCalledWith('pessimistic_write');
			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'first' }]);
		});

		it('locks nothing when no allowlist names a removed id', async () => {
			const select = stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['one']);

			expect(select.setLock).not.toHaveBeenCalled();
			expect(writes).toEqual([]);
		});

		it('matches candidates on the stored document, never on a value read out of it', async () => {
			const select = stubCandidates([]);

			await workflowRepository.removeFromCallerAllowlists(['one']);

			expect(select.where).toHaveBeenCalledWith('workflow.settings::text LIKE \'%"callerIds"%\'');
		});

		it('keeps a value the binary JSON form has no room for', async () => {
			const noBinaryJsonForm = String.fromCharCode(0);
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: {
						callerPolicy: 'workflowsFromAList',
						callerIds: 'first,second',
						errorWorkflow: `error-workflow${noBinaryJsonForm}`,
					},
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['second']);

			expect(writtenSettings).toEqual([
				{
					callerPolicy: 'workflowsFromAList',
					callerIds: 'first',
					errorWorkflow: `error-workflow${noBinaryJsonForm}`,
				},
			]);
		});

		it('purges a row that exists at an id being removed', async () => {
			stubCandidates([
				{
					id: 'recreated-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['recreated-1', 'second']);

			expect(writes).toEqual([{ id: 'recreated-1', callerIds: 'first' }]);
		});

		it('writes nothing when given no ids', async () => {
			stubCandidates([]);

			await workflowRepository.removeFromCallerAllowlists([]);

			expect(selectQb.where).not.toHaveBeenCalled();
			expect(writes).toEqual([]);
		});

		it('removes only the entries naming an id without a row', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'deleted,survivor,other' },
				},
			]);
			jest.mocked(entityManager.find).mockResolvedValue([{ id: 'survivor' }, { id: 'other' }]);

			await workflowRepository.removeMissingFromCallerAllowlists();

			expect(entityManager.find).toHaveBeenCalledWith(WorkflowEntity, {
				select: ['id'],
				where: { id: In(['deleted', 'survivor', 'other']) },
			});
			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'survivor,other' }]);
		});

		it('locks and writes nothing when every named id has a row', async () => {
			const select = stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second' },
				},
			]);
			jest.mocked(entityManager.find).mockResolvedValue([{ id: 'first' }, { id: 'second' }]);

			await workflowRepository.removeMissingFromCallerAllowlists();

			expect(select.setLock).not.toHaveBeenCalled();
			expect(writes).toEqual([]);
		});
	});
});
