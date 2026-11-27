import {
	BaseRepository,
	isForeignKeyConstraintError,
	Project,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { DataSource, In, Not, type EntityManager } from '@n8n/typeorm';

import {
	AgentKnowledgeDependency,
	KnowledgeCollection,
	KnowledgeFile,
	SharedKnowledgeCollection,
} from '../entities';

/** A shared collection with its home project and its totals. */
export interface KnowledgeCollectionSummary {
	collection: KnowledgeCollection;
	homeProject: Pick<Project, 'id' | 'name' | 'type'>;
	fileCount: number;
	totalFileSizeBytes: number;
	agentCount: number;
}

class KnowledgeCollectionTable extends BaseRepository<KnowledgeCollection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(KnowledgeCollection, dataSource.manager, transactionRunner);
	}
}

@Service()
export class KnowledgeCollectionRepository {
	private readonly table: KnowledgeCollectionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new KnowledgeCollectionTable(dataSource, transactionRunner);
	}

	async existsByProjectIdAndName(
		projectId: string,
		name: string,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(KnowledgeCollection, { projectId, name });
	}

	async findByIdAndProjectId(
		id: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<KnowledgeCollection | null> {
		return await this.table.managerFor(ctx).findOneBy(KnowledgeCollection, { id, projectId });
	}

	/** The ids of the agents that use the collection. */
	async findAgentIds(collectionId: string, ctx: OperationContext): Promise<string[]> {
		const dependencies = await this.table.managerFor(ctx).find(AgentKnowledgeDependency, {
			select: ['agentId'],
			where: { knowledgeCollectionId: collectionId },
		});

		return dependencies.map(({ agentId }) => agentId);
	}

	/** The ids of the collections that the agent uses. */
	async findAgentCollectionIds(agentId: string, ctx: OperationContext): Promise<string[]> {
		const dependencies = await this.table.managerFor(ctx).find(AgentKnowledgeDependency, {
			select: ['knowledgeCollectionId'],
			where: { agentId },
		});

		return dependencies.map(({ knowledgeCollectionId }) => knowledgeCollectionId);
	}

	/** The shared collections that the project owns. */
	async findSharedByProjectId(
		projectId: string,
		ctx: OperationContext,
	): Promise<KnowledgeCollection[]> {
		return await this.table.managerFor(ctx).findBy(KnowledgeCollection, {
			projectId,
			kind: 'shared',
		});
	}

	/** Adds the agent to the collection. A repeat add changes nothing. */
	async addAgent(collectionId: string, agentId: string, ctx: OperationContext): Promise<void> {
		try {
			await this.table
				.managerFor(ctx)
				.createQueryBuilder()
				.insert()
				.into(AgentKnowledgeDependency)
				.values({ agentId, knowledgeCollectionId: collectionId })
				.orIgnore()
				.execute();
		} catch (error) {
			// The agent or the collection was deleted after the caller's checks.
			if (isForeignKeyConstraintError(error)) {
				throw new NotFoundError('Agent or knowledge collection not found');
			}
			throw error;
		}
	}

	async removeAgent(collectionId: string, agentId: string, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.delete(AgentKnowledgeDependency, { agentId, knowledgeCollectionId: collectionId });
	}

	async existsBySlug(slug: string, ctx: OperationContext): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(KnowledgeCollection, { slug });
	}

	/**
	 * Inserts a shared collection and the owner row of its home project, in one
	 * transaction: a shared collection has exactly one owner row.
	 */
	async insertShared(
		collection: Pick<KnowledgeCollection, 'name' | 'description' | 'slug' | 'createdById'> & {
			projectId: string;
		},
		ctx: OperationContext,
	): Promise<KnowledgeCollection> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const saved = await manager.save(
				KnowledgeCollection,
				manager.create(KnowledgeCollection, { ...collection, kind: 'shared' }),
			);

			await manager.insert(SharedKnowledgeCollection, {
				knowledgeCollectionId: saved.id,
				projectId: collection.projectId,
				role: 'knowledgeCollection:owner',
			});

			return saved;
		});
	}

	async findSharedSummaryById(
		id: string,
		ctx: OperationContext,
	): Promise<KnowledgeCollectionSummary | null> {
		const manager = this.table.managerFor(ctx);
		const collection = await manager.findOneBy(KnowledgeCollection, { id, kind: 'shared' });

		if (!collection) {
			return null;
		}

		const [summary] = await this.summarize([collection], ctx);
		return summary ?? null;
	}

	/**
	 * Returns the kind=shared collections that the projects can use, newest first.
	 * It reads through the share rows, so a collection shared with a project
	 * shows up for it too, once.
	 */
	async findSharedSummaries(
		projectIds: string[] | 'all',
		ctx: OperationContext,
	): Promise<KnowledgeCollectionSummary[]> {
		if (projectIds !== 'all' && projectIds.length === 0) {
			return [];
		}

		const manager = this.table.managerFor(ctx);
		const query = manager
			.createQueryBuilder(KnowledgeCollection, 'collection')
			.innerJoin(SharedKnowledgeCollection, 'share', 'share.knowledgeCollectionId = collection.id')
			.where('collection.kind = :kind', { kind: 'shared' })
			.orderBy('collection.createdAt', 'DESC')
			.addOrderBy('collection.id', 'DESC');

		if (projectIds !== 'all') {
			query.andWhere('share.projectId IN (:...projectIds)', { projectIds });
		}

		const collections = await query.getMany();
		return await this.summarize(collections, ctx);
	}

	/** Whether another collection of the project, not `exceptCollectionId`, uses the name. */
	async isNameTakenInProject(
		projectId: string,
		name: string,
		exceptCollectionId: string,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.table
			.managerFor(ctx)
			.existsBy(KnowledgeCollection, { projectId, name, id: Not(exceptCollectionId) });
	}

	async updateNameAndDescription(
		id: string,
		changes: Partial<Pick<KnowledgeCollection, 'name' | 'description'>>,
		ctx: OperationContext,
	): Promise<void> {
		// `update` skips the entity hooks, so the update time is set here.
		await this.table
			.managerFor(ctx)
			.update(KnowledgeCollection, { id, kind: 'shared' }, { ...changes, updatedAt: new Date() });
	}

	/**
	 * Deletes nothing when the project has no shared collection with this id.
	 * The database cascade deletes the file, vector store, share and agent link rows too.
	 */
	async deleteSharedInProject(id: string, projectId: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(KnowledgeCollection, { id, projectId, kind: 'shared' });
	}

	/**
	 * Adds the home project and the totals to each collection. A collection
	 * without a home project is left out: only shared collections have one.
	 */
	private async summarize(
		collections: KnowledgeCollection[],
		ctx: OperationContext,
	): Promise<KnowledgeCollectionSummary[]> {
		const manager = this.table.managerFor(ctx);
		const collectionIds = collections.map((collection) => collection.id);
		const projectIds = [
			...new Set(collections.flatMap((collection) => collection.projectId ?? [])),
		];

		if (projectIds.length === 0) {
			return [];
		}

		// The three reads do not depend on each other.
		const [homeProjects, fileTotals, agentCounts] = await Promise.all([
			this.findHomeProjects(projectIds, manager),
			this.findFileTotals(collectionIds, ctx),
			this.findAgentCounts(collectionIds, manager),
		]);

		return collections.flatMap((collection) => {
			const homeProject = collection.projectId ? homeProjects.get(collection.projectId) : undefined;

			if (!homeProject) {
				return [];
			}

			const files = fileTotals.get(collection.id);

			return [
				{
					collection,
					homeProject,
					fileCount: files?.fileCount ?? 0,
					totalFileSizeBytes: files?.totalFileSizeBytes ?? 0,
					agentCount: agentCounts.get(collection.id) ?? 0,
				},
			];
		});
	}

	private async findHomeProjects(
		projectIds: string[],
		manager: EntityManager,
	): Promise<Map<string, KnowledgeCollectionSummary['homeProject']>> {
		const projects = await manager.find(Project, {
			select: { id: true, name: true, type: true },
			where: { id: In(projectIds) },
		});

		return new Map(projects.map(({ id, name, type }) => [id, { id, name, type }]));
	}

	/**
	 * The file count and total size of each collection. A collection
	 * without files is not in the map.
	 */
	async findFileTotals(
		collectionIds: string[],
		ctx: OperationContext,
	): Promise<Map<string, { fileCount: number; totalFileSizeBytes: number }>> {
		if (collectionIds.length === 0) {
			return new Map();
		}

		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(KnowledgeFile, 'file')
			.select('file.knowledgeCollectionId', 'collectionId')
			.addSelect('COUNT(*)', 'fileCount')
			.addSelect('COALESCE(SUM(file.fileSizeBytes), 0)', 'totalFileSizeBytes')
			.where('file.knowledgeCollectionId IN (:...collectionIds)', { collectionIds })
			.groupBy('file.knowledgeCollectionId')
			.getRawMany<{
				collectionId: string;
				fileCount: number | string;
				totalFileSizeBytes: number | string;
			}>();

		// PostgreSQL returns COUNT and SUM as strings.
		return new Map(
			rows.map((row) => [
				row.collectionId,
				{ fileCount: Number(row.fileCount), totalFileSizeBytes: Number(row.totalFileSizeBytes) },
			]),
		);
	}

	/** PostgreSQL returns COUNT as a string, so it goes through `Number`. */
	private async findAgentCounts(
		collectionIds: string[],
		manager: EntityManager,
	): Promise<Map<string, number>> {
		const rows = await manager
			.createQueryBuilder(AgentKnowledgeDependency, 'dependency')
			.select('dependency.knowledgeCollectionId', 'collectionId')
			.addSelect('COUNT(*)', 'agentCount')
			.where('dependency.knowledgeCollectionId IN (:...collectionIds)', { collectionIds })
			.groupBy('dependency.knowledgeCollectionId')
			.getRawMany<{ collectionId: string; agentCount: number | string }>();

		return new Map(rows.map((row) => [row.collectionId, Number(row.agentCount)]));
	}
}
