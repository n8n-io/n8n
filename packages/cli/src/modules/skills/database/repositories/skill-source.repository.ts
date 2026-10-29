import {
	BaseRepository,
	TransactionRunner,
	chunkIds,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import {
	SkillSourceConnection,
	type OpaqueSourceValue,
	type SkillSourceType,
} from '../entities/skill-source-connection.entity';
import { SkillSourceLink, type SkillSourceLinkState } from '../entities/skill-source-link.entity';

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

/** An update from the source that waits for review on one link. */
export type PendingUpdate = {
	content: Record<string, unknown>;
	contentHash: string;
	scan: Record<string, unknown>;
	revision: string;
	state: Extract<SkillSourceLinkState, 'update_available' | 'update_blocked'>;
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
			/** Null for a public source. */
			credentialId: string | null;
			createdById: string;
			/** The revision that the import read, so the first check fetches nothing if it holds. */
			probeCursor: string | null;
		},
		ctx: OperationContext = {},
	): Promise<void> {
		// `save`, not `insert`: the partial-entity type of `insert` rejects free-form JSON.
		const manager = this.sources.managerFor(ctx);
		try {
			await manager.save(
				manager.create(SkillSourceConnection, {
					...source,
					status: 'connected',
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
			projectId: source.projectId,
			remoteRef: link.remoteRef,
		};
	}

	/** Whether the skill is a synced skill: a link makes it one. */
	async isLinked(skillId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.links.managerFor(ctx).existsBy(SkillSourceLink, { skillId });
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

	/** Every source, oldest first, for the check task. */
	async findAllSources(): Promise<SkillSourceConnection[]> {
		return await this.sources
			.managerFor({})
			.find(SkillSourceConnection, { order: { createdAt: 'ASC' } });
	}

	async findLinksBySource(sourceId: string): Promise<SkillSourceLink[]> {
		return await this.links.managerFor({}).find(SkillSourceLink, { where: { sourceId } });
	}

	/** The sync state of each synced skill among `skillIds`. A skill without a link is absent. */
	async findSyncStates(skillIds: string[]): Promise<Map<string, SkillSourceLinkState>> {
		const states = new Map<string, SkillSourceLinkState>();
		for (const chunk of chunkIds(skillIds)) {
			const links = await this.links.managerFor({}).find(SkillSourceLink, {
				select: ['skillId', 'state'],
				where: { skillId: In(chunk) },
			});
			for (const { skillId, state } of links) states.set(skillId, state);
		}
		return states;
	}

	/** Synced skills of the source with an update that waits for review. */
	async countPendingUpdates(sourceId: string): Promise<number> {
		return await this.links.managerFor({}).countBy(SkillSourceLink, {
			sourceId,
			pendingContentHash: Not(IsNull()),
		});
	}

	/**
	 * The result of one check of a source. A cursor is stored only when the check read every
	 * skill at it, so a failed check reads the source again next time.
	 */
	async recordCheck(
		sourceId: string,
		result: { checkedAt: Date; errorReason: string | null; probeCursor?: string },
	): Promise<void> {
		await this.sources.managerFor({}).update(
			SkillSourceConnection,
			{ id: sourceId },
			{
				lastCheckedAt: result.checkedAt,
				lastErrorReason: result.errorReason,
				...(result.probeCursor !== undefined ? { probeCursor: result.probeCursor } : {}),
			},
		);
	}

	/**
	 * The source has the content of the latest version at a newer revision: the base moves to
	 * it, and an update that waited for review is dropped, as the source reverted it.
	 */
	async moveBase(skillId: string, revision: string): Promise<void> {
		await this.links.managerFor({}).update(
			SkillSourceLink,
			{ skillId },
			{
				baseRevision: revision,
				pendingContent: null,
				pendingContentHash: null,
				pendingScan: null,
				pendingRevision: null,
				state: 'up_to_date',
			},
		);
	}

	/**
	 * Stores an update that waits for review, in place of an older one. Answers false when the
	 * link already holds this content, such as after a check on another main at the same time,
	 * so the caller reports each update once.
	 */
	async storePending(skillId: string, pending: PendingUpdate): Promise<boolean> {
		const manager = this.links.managerFor({});
		// The partial-entity type of `update` rejects free-form JSON, as for `insert` above.
		const set = {
			pendingContent: pending.content,
			pendingContentHash: pending.contentHash,
			pendingScan: pending.scan,
			pendingRevision: pending.revision,
			state: pending.state,
		} as QueryDeepPartialEntity<SkillSourceLink>;
		// Two conditional updates in place of one with OR: the first that matches sets the hash,
		// so the other one, and a check on another main, match nothing.
		const first = await manager.update(
			SkillSourceLink,
			{ skillId, pendingContentHash: IsNull() },
			set,
		);
		if ((first.affected ?? 0) > 0) return true;
		const result = await manager.update(
			SkillSourceLink,
			{ skillId, pendingContentHash: Not(pending.contentHash) },
			set,
		);
		return (result.affected ?? 0) > 0;
	}
}
