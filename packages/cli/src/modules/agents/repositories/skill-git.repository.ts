import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { SkillGitLink } from '../entities/skill-git-link.entity';
import { SkillGitUpdate } from '../entities/skill-git-update.entity';
import { Skill } from '../entities/skill.entity';

/** A link with the place of its skill, so imports can tell where a folder is synced already. */
export type SkillGitLinkWithTarget = SkillGitLink & { projectId: string | null };

/** Persistence for the GitHub links of skills and the updates that wait for a decision. */
@Service()
export class SkillGitRepository extends BaseRepository<SkillGitLink> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SkillGitLink, dataSource.manager, transactionRunner);
	}

	async findLink(skillId: string, ctx: OperationContext = {}): Promise<SkillGitLink | null> {
		return await this.managerFor(ctx).findOne(SkillGitLink, { where: { skillId } });
	}

	async findLinks(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, SkillGitLink>> {
		if (skillIds.length === 0) return new Map();
		const rows = await this.managerFor(ctx).find(SkillGitLink, {
			where: { skillId: In([...new Set(skillIds)]) },
		});
		return new Map(rows.map((row) => [row.skillId, row]));
	}

	/** Links that follow a branch, oldest check first, for the scheduled check. */
	async findBranchLinks(ctx: OperationContext = {}): Promise<SkillGitLink[]> {
		return await this.managerFor(ctx).find(SkillGitLink, {
			where: { refType: 'branch' },
			order: { lastCheckedAt: 'ASC' },
		});
	}

	/** Every link to one folder of one repository, with the place of its skill. */
	async findLinksToFolders(
		owner: string,
		repo: string,
		ctx: OperationContext = {},
	): Promise<SkillGitLinkWithTarget[]> {
		const rows = await this.managerFor(ctx)
			.createQueryBuilder(SkillGitLink, 'link')
			.innerJoin(Skill, 'skill', 'skill.id = link.skillId')
			.select(['link'])
			.addSelect('skill.projectId', 'projectId')
			.where('LOWER(link.owner) = LOWER(:owner) AND LOWER(link.repo) = LOWER(:repo)', {
				owner,
				repo,
			})
			.getRawAndEntities<{ projectId: string | null }>();
		return rows.entities.map((link, index) => ({
			...link,
			projectId: rows.raw[index]?.projectId ?? null,
		}));
	}

	async insertLink(
		link: Omit<SkillGitLink, 'createdAt' | 'updatedAt' | 'setUpdateDate'>,
		ctx: OperationContext = {},
	) {
		await this.managerFor(ctx).insert(SkillGitLink, link);
	}

	async updateLink(
		skillId: string,
		changes: Partial<
			Pick<
				SkillGitLink,
				| 'syncedCommitSha'
				| 'seenCommitSha'
				| 'seenTreeSha'
				| 'status'
				| 'lastError'
				| 'lastCheckedAt'
			>
		>,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).update(SkillGitLink, { skillId }, changes);
	}

	/** Stop syncing: the link and any waiting update go. The skill and its versions stay. */
	async deleteLink(skillId: string, ctx: OperationContext = {}): Promise<void> {
		await this.runInTransaction(ctx, async (manager) => {
			await manager.delete(SkillGitUpdate, { skillId });
			await manager.delete(SkillGitLink, { skillId });
		});
	}

	async findUpdate(skillId: string, ctx: OperationContext = {}): Promise<SkillGitUpdate | null> {
		return await this.managerFor(ctx).findOne(SkillGitUpdate, { where: { skillId } });
	}

	async findUpdates(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, SkillGitUpdate>> {
		if (skillIds.length === 0) return new Map();
		const rows = await this.managerFor(ctx).find(SkillGitUpdate, {
			select: ['skillId', 'status', 'toCommitSha'],
			where: { skillId: In([...new Set(skillIds)]) },
		});
		return new Map(rows.map((row) => [row.skillId, row]));
	}

	/** Stores the waiting update of a skill. A newer one replaces the older one. */
	async upsertUpdate(
		update: Omit<SkillGitUpdate, 'createdAt' | 'updatedAt' | 'setUpdateDate'>,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.runInTransaction(ctx, async (manager) => {
			await manager.delete(SkillGitUpdate, { skillId: update.skillId });
			// `save`, not `insert`: the partial-entity type of `insert` rejects free-form JSON.
			await manager.save(manager.create(SkillGitUpdate, update));
		});
	}

	async deleteUpdate(skillId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).delete(SkillGitUpdate, { skillId });
	}
}
