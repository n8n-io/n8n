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

		if (collectionIds.length === 0 || projectIds.length === 0) {
			return [];
		}

		const projects = await manager.find(Project, {
			select: { id: true, name: true, type: true },
			where: { id: In(projectIds) },
		});

		const fileTotals = await manager
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

		const agentCounts = await manager
			.createQueryBuilder(AgentKnowledgeDependency, 'dependency')
			.select('dependency.knowledgeCollectionId', 'collectionId')
			.addSelect('COUNT(*)', 'agentCount')
			.where('dependency.knowledgeCollectionId IN (:...collectionIds)', { collectionIds })
			.groupBy('dependency.knowledgeCollectionId')
			.getRawMany<{ collectionId: string; agentCount: number | string }>();

		const projectById = new Map(projects.map((project) => [project.id, project]));
		// PostgreSQL returns COUNT and SUM as strings.
		const fileTotalsById = new Map(fileTotals.map((row) => [row.collectionId, row]));
		const agentCountById = new Map(
			agentCounts.map((row) => [row.collectionId, Number(row.agentCount)]),
		);

		return collections.flatMap((collection) => {
			const homeProject = collection.projectId ? projectById.get(collection.projectId) : undefined;

			if (!homeProject) {
				return [];
			}

			const files = fileTotalsById.get(collection.id);

			return [
				{
					collection,
					homeProject: { id: homeProject.id, name: homeProject.name, type: homeProject.type },
					fileCount: Number(files?.fileCount ?? 0),
					totalFileSizeBytes: Number(files?.totalFileSizeBytes ?? 0),
					agentCount: agentCountById.get(collection.id) ?? 0,
				},
			];
		});
	}
}
