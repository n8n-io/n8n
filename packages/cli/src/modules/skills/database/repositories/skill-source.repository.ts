import {
	BaseRepository,
	TransactionRunner,
	chunkIds,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource, In, IsNull } from '@n8n/typeorm';

import {
	SkillSourceConnection,
	type OpaqueSourceValue,
	type SkillSourceType,
} from '../entities/skill-source-connection.entity';
import { SkillSourceLink } from '../entities/skill-source-link.entity';

class SkillSourceTable extends BaseRepository<SkillSourceConnection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SkillSourceConnection, dataSource.manager, transactionRunner);
	}
}

class SkillSourceLinkTable extends BaseRepository<SkillSourceLink> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SkillSourceLink, dataSource.manager, transactionRunner);
	}
}

/** A source with the same identity in some scope, for the duplicate rules. */
export type SameSource = Pick<SkillSourceConnection, 'id' | 'projectId'>;

/** The source of a synced skill, and where the skill is in it. */
export type SyncedFromRow = Pick<SkillSourceConnection, 'type' | 'locator' | 'projectId'> & {
	sourceId: string;
	remoteRef: Record<string, unknown>;
};

/** Two sources for one identity in one scope. The partial unique indexes refuse the second. */
export class DuplicateSkillSourceError extends Error {}

/**
 * Persistence for skill sources (`skill_source`) and the links that make skills synced skills
 * (`skill_source_link`). A link has no meaning without its source, so one repository holds both.
 */
@Service()
export class SkillSourceRepository {
	private readonly sources: SkillSourceTable;

	private readonly links: SkillSourceLinkTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.sources = new SkillSourceTable(dataSource, transactionRunner);
		this.links = new SkillSourceLinkTable(dataSource, transactionRunner);
	}

	/** Every source with this identity, in any scope. */
	async findSameSources(identityKey: string, ctx: OperationContext = {}): Promise<SameSource[]> {
		return await this.sources.managerFor(ctx).find(SkillSourceConnection, {
			select: ['id', 'projectId'],
			where: { identityKey },
		});
	}

	/**
	 * Inserts a connected source. Throws `DuplicateSkillSourceError` when its scope already has
	 * a source with the same identity, also when two connects race.
	 */
	async insertConnected(
		source: {
			id: string;
			type: SkillSourceType;
			locator: OpaqueSourceValue;
			identityKey: string;
			projectId: string | null;
			createdById: string;
		},
		ctx: OperationContext = {},
	): Promise<void> {
		// `save`, not `insert`: the partial-entity type of `insert` rejects free-form JSON.
		const manager = this.sources.managerFor(ctx);
		try {
			await manager.save(
				manager.create(SkillSourceConnection, {
					...source,
					credentialId: null,
					status: 'connected',
					probeCursor: null,
					lastCheckedAt: new Date(),
					lastErrorReason: null,
				}),
			);
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new DuplicateSkillSourceError();
			throw error;
		}
	}

	/** Links a skill that an import just created to its source. Nothing waits for review. */
	async insertImported(
		link: {
			skillId: string;
			sourceId: string;
			remoteRef: Record<string, unknown>;
			baseRevision: string;
			baseContentHash: string;
			skippedFiles: string[];
		},
		ctx: OperationContext = {},
	): Promise<void> {
		// `save`, not `insert`: the partial-entity type of `insert` rejects free-form JSON.
		const manager = this.links.managerFor(ctx);
		await manager.save(
			manager.create(SkillSourceLink, {
				...link,
				pendingContent: null,
				pendingContentHash: null,
				pendingScan: null,
				pendingRevision: null,
				skippedContentHash: null,
				state: 'up_to_date',
			}),
		);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<SkillSourceConnection | null> {
		return await this.sources.managerFor(ctx).findOneBy(SkillSourceConnection, { id });
	}

	/** Global sources and sources in projects the user can list. */
	async findVisible(projectIds: string[] | 'all'): Promise<SkillSourceConnection[]> {
		return await this.sources.manager.find(SkillSourceConnection, {
			where:
				projectIds === 'all'
					? {}
					: [
							{ projectId: IsNull() },
							...(projectIds.length ? [{ projectId: In(projectIds) }] : []),
						],
			order: { createdAt: 'DESC' },
		});
	}

	/** Counts links without loading skill content or remote refs. */
	async countSkills(sourceIds: string[]): Promise<Map<string, number>> {
		const counts = new Map<string, number>();
		for (const ids of chunkIds(sourceIds)) {
			const rows = await this.links.manager
				.createQueryBuilder(SkillSourceLink, 'link')
				.select('link.sourceId', 'sourceId')
				.addSelect('COUNT(*)', 'count')
				.where('link.sourceId IN (:...ids)', { ids })
				.groupBy('link.sourceId')
				.getRawMany<{ sourceId: string; count: string | number }>();
			for (const row of rows) counts.set(row.sourceId, Number(row.count));
		}
		return counts;
	}

	async findImportedRefs(
		sourceId: string,
		ctx: OperationContext = {},
	): Promise<Record<string, unknown>[]> {
		const links = await this.links.managerFor(ctx).find(SkillSourceLink, {
			select: ['remoteRef'],
			where: { sourceId },
		});
		return links.map((link) => link.remoteRef);
	}

	/** Serializes imports of one source before they check its links. */
	async lockForImport(id: string, ctx: OperationContext): Promise<SkillSourceConnection | null> {
		if (!ctx.trx) throw new UnexpectedError('Source row locks need a transaction');
		return await this.sources.managerFor(ctx).findOne(SkillSourceConnection, {
			where: { id },
			// SQLite serializes write transactions. PostgreSQL needs a row lock.
			...(this.sources.manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
	}

	/** The source of a synced skill, in one query. Null for a skill without a source. */
	async findSyncedFrom(skillId: string, ctx: OperationContext = {}): Promise<SyncedFromRow | null> {
		const link = await this.links
			.managerFor(ctx)
			.createQueryBuilder(SkillSourceLink, 'link')
			.innerJoinAndMapOne(
				'link.source',
				SkillSourceConnection,
				'source',
				'source.id = link.sourceId',
			)
			.where('link.skillId = :skillId', { skillId })
			.getOne();
		// The entities declare no relation, so the join maps the source onto an extra property.
		const source: unknown = link && Reflect.get(link, 'source');
		if (!link || !(source instanceof SkillSourceConnection)) return null;
		return {
			sourceId: source.id,
			type: source.type,
			locator: source.locator,
			projectId: source.projectId,
			remoteRef: link.remoteRef,
		};
	}

	/** Whether the skill is a synced skill: a link makes it one. */
	async isLinked(skillId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.links.managerFor(ctx).existsBy(SkillSourceLink, { skillId });
	}

	/** The skills among `skillIds` that are synced skills. */
	async findLinkedSkillIds(skillIds: string[], ctx: OperationContext = {}): Promise<Set<string>> {
		const manager = this.links.managerFor(ctx);
		const linked = new Set<string>();
		for (const chunk of chunkIds(skillIds)) {
			const links = await manager.find(SkillSourceLink, {
				select: ['skillId'],
				where: { skillId: In(chunk) },
			});
			for (const { skillId } of links) linked.add(skillId);
		}
		return linked;
	}

	async findLinkBySkillId(
		skillId: string,
		ctx: OperationContext = {},
	): Promise<SkillSourceLink | null> {
		return await this.links.managerFor(ctx).findOneBy(SkillSourceLink, { skillId });
	}

	/**
	 * Stop syncing: the skill becomes a normal skill and keeps its versions. Answers false when
	 * the skill had no link, for example after a stop at the same time.
	 */
	async deleteLink(skillId: string, ctx: OperationContext = {}): Promise<boolean> {
		const result = await this.links.managerFor(ctx).delete(SkillSourceLink, { skillId });
		return (result.affected ?? 0) > 0;
	}
}
