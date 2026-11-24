import { BaseRepository, Project, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager } from '@n8n/typeorm';

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

		return dependencies.map((dependency) => dependency.agentId);
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

		const [summary] = await this.summarize([collection], manager);
		return summary ?? null;
	}

	/**
	 * Returns the shared collections that the projects can use, newest first.
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
		return await this.summarize(collections, manager);
	}

	/**
	 * Adds the home project and the totals to each collection. A collection
	 * without a home project is left out: only shared collections have one.
	 */
	private async summarize(
		collections: KnowledgeCollection[],
		manager: EntityManager,
	): Promise<KnowledgeCollectionSummary[]> {
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
			this.findFileTotals(collectionIds, manager),
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

	/** PostgreSQL returns COUNT and SUM as strings, so both go through `Number`. */
	private async findFileTotals(
		collectionIds: string[],
		manager: EntityManager,
	): Promise<Map<string, { fileCount: number; totalFileSizeBytes: number }>> {
		const rows = await manager
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
