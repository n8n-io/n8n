import {
	BaseRepository,
	TransactionRunner,
	chunkIds,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, LessThanOrEqual, Not, Or } from '@n8n/typeorm';
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
export type SyncedFromRow = Pick<
	SkillSourceConnection,
	'type' | 'locator' | 'projectId' | 'credentialId'
> & {
	sourceId: string;
	remoteRef: Record<string, unknown>;
};

/** An update from the source that waits for review on one link. */
export type PendingUpdate = {
	/** Null when n8n cannot parse the SKILL.md: the update is blocked and has nothing to accept. */
	content: Record<string, unknown> | null;
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
			credentialId: source.credentialId,
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

	/**
	 * Every source, the longest unchecked first, for the check task. A run that times out
	 * checks the others first next time.
	 */
	async findAllSources(): Promise<SkillSourceConnection[]> {
		const sources = await this.sources.managerFor({}).find(SkillSourceConnection);
		const time = (source: SkillSourceConnection) => source.lastCheckedAt?.getTime() ?? 0;
		return sources.sort((a, b) => time(a) - time(b));
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
	 * Claims Check now for a source: sets `lastCheckedAt` to `now` only when the last check is
	 * older than `intervalMs`, in one conditional update. Answers false when another click or
	 * a check, also on another main, came first.
	 */
	async claimCheckNow(sourceId: string, now: Date, intervalMs: number): Promise<boolean> {
		const result = await this.sources.managerFor({}).update(
			SkillSourceConnection,
			{
				id: sourceId,
				lastCheckedAt: Or(IsNull(), LessThan(new Date(now.getTime() - intervalMs))),
			},
			{ lastCheckedAt: now },
		);
		return (result.affected ?? 0) > 0;
	}

	/**
	 * A check that did not read the source, because its access still waits after a rate limit.
	 * Only the reason changes: `lastCheckedAt` keeps the time of the last read.
	 */
	async recordDelayed(sourceId: string): Promise<void> {
		await this.sources
			.managerFor({})
			.update(SkillSourceConnection, { id: sourceId }, { lastErrorReason: 'rate_limited' });
	}

	/**
	 * The result of one check of a source. `lastCheckedAt` and `lastErrorReason` change only
	 * when no check that started later wrote them first, so a slow check never hides a newer
	 * result. `probeCursor` moves only from the cursor that the check started from. When
	 * another check moved it first, the cursor is cleared instead, so the next check reads
	 * every skill again and fixes a link that the slower check could not write.
	 */
	async recordCheck(
		sourceId: string,
		result: {
			checkedAt: Date;
			errorReason: string | null;
			/** `to` null clears the cursor, so the next check reads every skill again. */
			probeCursor?: { from: string | null; to: string | null };
		},
	): Promise<void> {
		const manager = this.sources.managerFor({});
		const { checkedAt, errorReason, probeCursor } = result;
		await manager.update(
			SkillSourceConnection,
			{ id: sourceId, lastCheckedAt: Or(IsNull(), LessThanOrEqual(checkedAt)) },
			{ lastCheckedAt: checkedAt, lastErrorReason: errorReason },
		);
		if (!probeCursor) return;
		const moved = await manager.update(
			SkillSourceConnection,
			{ id: sourceId, probeCursor: probeCursor.from ?? IsNull() },
			{ probeCursor: probeCursor.to },
		);
		if ((moved.affected ?? 0) === 0) {
			await manager.update(SkillSourceConnection, { id: sourceId }, { probeCursor: null });
		}
	}

	/**
	 * The source has the base content at this revision: the base moves to it, and an update
	 * that waited for review is dropped, as the source reverted it. `readPendingHash` is the
	 * pending hash that the check read. Answers false, and writes nothing, when another check
	 * changed the link since: the check then clears the cursor, so the next one reads again.
	 */
	async moveBase(
		skillId: string,
		revision: string,
		readPendingHash: string | null,
	): Promise<boolean> {
		const result = await this.links.managerFor({}).update(
			SkillSourceLink,
			{ skillId, pendingContentHash: readPendingHash ?? IsNull() },
			{
				baseRevision: revision,
				pendingContent: null,
				pendingContentHash: null,
				pendingScan: null,
				pendingRevision: null,
				state: 'up_to_date',
			},
		);
		return (result.affected ?? 0) > 0;
	}

	/**
	 * Stores an update that waits for review, in place of the one that the check read
	 * (`readPendingHash`). Answers false, and writes nothing, when another check changed the
	 * link since, such as a check on another main: with the same content the update is
	 * reported once, and with other content the cleared cursor makes the next check read the
	 * skill again. Also false when the link is gone.
	 */
	async storePending(
		skillId: string,
		pending: PendingUpdate,
		readPendingHash: string | null,
	): Promise<boolean> {
		const result = await this.links.managerFor({}).update(
			SkillSourceLink,
			{ skillId, pendingContentHash: readPendingHash ?? IsNull() },
			// The partial-entity type of `update` rejects free-form JSON, as for `insert` above.
			{
				pendingContent: pending.content,
				pendingContentHash: pending.contentHash,
				pendingScan: pending.scan,
				pendingRevision: pending.revision,
				state: pending.state,
			} as QueryDeepPartialEntity<SkillSourceLink>,
		);
		return (result.affected ?? 0) > 0;
	}
}
