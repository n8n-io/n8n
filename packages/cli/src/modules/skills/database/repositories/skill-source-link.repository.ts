import { BaseRepository, TransactionRunner, chunkIds, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { SkillSourceLink } from '../entities/skill-source-link.entity';

class SkillSourceLinkTable extends BaseRepository<SkillSourceLink> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SkillSourceLink, dataSource.manager, transactionRunner);
	}
}

/** Persistence for the links that make skills synced skills (`skill_source_link`). */
@Service()
export class SkillSourceLinkRepository {
	private readonly table: SkillSourceLinkTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new SkillSourceLinkTable(dataSource, transactionRunner);
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
		const manager = this.table.managerFor(ctx);
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

	/** Whether the skill is a synced skill: a link makes it one. */
	async isLinked(skillId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(SkillSourceLink, { skillId });
	}

	/** The skills among `skillIds` that are synced skills. */
	async findLinkedSkillIds(skillIds: string[], ctx: OperationContext = {}): Promise<Set<string>> {
		const manager = this.table.managerFor(ctx);
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

	/**
	 * Stop syncing: the skill becomes a normal skill and keeps its versions. Answers false when
	 * the skill had no link, for example after a stop at the same time.
	 */
	async deleteBySkillId(skillId: string, ctx: OperationContext = {}): Promise<boolean> {
		const result = await this.table.managerFor(ctx).delete(SkillSourceLink, { skillId });
		return (result.affected ?? 0) > 0;
	}

	async findBySkillId(
		skillId: string,
		ctx: OperationContext = {},
	): Promise<SkillSourceLink | null> {
		return await this.table.managerFor(ctx).findOneBy(SkillSourceLink, { skillId });
	}
}
