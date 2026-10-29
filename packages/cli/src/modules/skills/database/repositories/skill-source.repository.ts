import {
	BaseRepository,
	TransactionRunner,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

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
export type SyncedFromRow = Pick<SkillSourceConnection, 'type' | 'locator'> & {
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
			remoteRef: link.remoteRef,
		};
	}
}
