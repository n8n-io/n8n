import {
	BaseRepository,
	LIKE_ESCAPE_CLAUSE,
	Project,
	TransactionRunner,
	chunkIds,
	escapeLike,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { Brackets, DataSource, In, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { compareSkillFilePaths, skillContentHash, type SkillContent } from './skill-content-hash';
import { SkillFile } from './skill-file.entity';
import { SkillVersion } from './skill-version.entity';
import { Skill, type SkillSource } from './skill.entity';

/**
 * Where a skill lives: a project, one agent, or the instance (both null). An agent skill
 * has no projectId: its project is the agent's.
 */
export type SkillTarget = { projectId: string | null; agentId: string | null };

/** One skill with one of its version rows and that row's files, sorted by path. */
export type ResolvedSkillRow = {
	skill: Skill;
	version: SkillVersion;
	files: SkillFile[];
};

/**
 * Which skills one user may list: instance skills always, plus the skills of these
 * projects and of `agentIds`, the agents in these projects.
 */
export type SkillVisibility = {
	projectIds: string[] | 'all';
	agentIds: string[] | 'all';
};

/** Narrows the visible skills of `findVisiblePage` and cuts one page. */
export type SkillListFilter = {
	scope?: 'project' | 'agent' | 'instance';
	/** The skills of this project and of its agents. */
	project?: { id: string; agentIds: string[] };
	/** What this agent may attach: instance skills, its project's skills and its own. */
	attachableTo?: { agentId: string; projectId: string };
	search?: string;
	skip: number;
	take?: number;
};

/** Latest version of a skill without its content. */
export type SkillSummary = { name: string; description: string; version: number };

/** Persistence for skills, their versions and their files. */
@Service()
export class SkillRepository extends BaseRepository<Skill> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Skill, dataSource.manager, transactionRunner);
	}

	/**
	 * One page of the skills the user may see, newest change first, and the count of all
	 * matches. The filters, the search and the page cut run in the query, so the read grows
	 * with the page, not with the skills on the instance. The search matches the name or
	 * the description of the latest version. Without `take` every match is returned.
	 */
	async findVisiblePage(
		visibility: SkillVisibility,
		filter: SkillListFilter,
		ctx: OperationContext = {},
	): Promise<{ skills: Skill[]; count: number }> {
		const manager = this.managerFor(ctx);
		// An agent skill has no projectId: it is visible through its agent, one of `agentIds`.
		const { projectIds, agentIds } = visibility;
		const branches: string[] = [];
		if (!filter.scope || filter.scope === 'instance') {
			branches.push('skill.projectId IS NULL AND skill.agentId IS NULL');
		}
		if (filter.attachableTo !== undefined) {
			if (projectIds === 'all' || projectIds.includes(filter.attachableTo.projectId)) {
				branches.push('skill.projectId = :attachProjectId', 'skill.agentId = :attachAgentId');
			}
		} else {
			if (!filter.scope || filter.scope === 'project') {
				if (projectIds === 'all') branches.push('skill.projectId IS NOT NULL');
				else if (projectIds.length > 0) branches.push('skill.projectId IN (:...projectIds)');
			}
			if (!filter.scope || filter.scope === 'agent') {
				if (agentIds === 'all') branches.push('skill.agentId IS NOT NULL');
				else if (agentIds.length > 0) branches.push('skill.agentId IN (:...agentIds)');
			}
		}
		if (branches.length === 0) return { skills: [], count: 0 };

		const query = manager
			.createQueryBuilder(Skill, 'skill')
			.where(new Brackets((qb) => branches.forEach((branch) => qb.orWhere(`(${branch})`))))
			.setParameters({
				projectIds,
				agentIds,
				...(filter.attachableTo !== undefined && {
					attachProjectId: filter.attachableTo.projectId,
					attachAgentId: filter.attachableTo.agentId,
				}),
			});
		if (filter.project) {
			const { id, agentIds: projectAgentIds } = filter.project;
			query.andWhere(
				new Brackets((qb) => {
					qb.where('skill.projectId = :projectId');
					if (projectAgentIds.length > 0) qb.orWhere('skill.agentId IN (:...projectAgentIds)');
				}),
				{ projectId: id, projectAgentIds },
			);
		}
		if (filter.search) {
			query
				.innerJoin(SkillVersion, 'latest', 'latest.skillId = skill.id')
				.andWhere((qb) => {
					const highest = qb
						.subQuery()
						.select('MAX(later.version)')
						.from(SkillVersion, 'later')
						.where('later.skillId = skill.id')
						.getQuery();
					return `latest.version = ${highest}`;
				})
				.andWhere(
					new Brackets((qb) =>
						qb
							.where(`LOWER(latest.name) LIKE :search ${LIKE_ESCAPE_CLAUSE}`)
							.orWhere(`LOWER(latest.description) LIKE :search ${LIKE_ESCAPE_CLAUSE}`),
					),
					{ search: `%${escapeLike(filter.search.toLowerCase())}%` },
				);
		}
		query.orderBy('skill.updatedAt', 'DESC').addOrderBy('skill.id', 'ASC').offset(filter.skip);
		if (filter.take !== undefined) query.limit(filter.take);
		const [skills, count] = await query.getManyAndCount();
		return { skills, count };
	}

	async findByIds(ids: string[], ctx: OperationContext = {}): Promise<Skill[]> {
		const manager = this.managerFor(ctx);
		return await inChunks(
			ids,
			async (chunk) => await manager.find(Skill, { where: { id: In(chunk) } }),
		);
	}

	/** The highest version of each skill, keyed by skill id. A following ref reads it. */
	async findLatestSaved(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, ResolvedSkillRow>> {
		const manager = this.managerFor(ctx);
		const versions = await inChunks(
			skillIds,
			async (chunk) => await latestVersionsQuery(manager, chunk).getMany(),
		);
		return await this.resolveBySkill(versions, ctx);
	}

	/** Name, description and number of the latest version, without its content. */
	async findLatestSummaries(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, SkillSummary>> {
		const manager = this.managerFor(ctx);
		const versions = await inChunks(
			skillIds,
			async (chunk) =>
				await latestVersionsQuery(manager, chunk)
					.select(['version.skillId', 'version.name', 'version.description', 'version.version'])
					.getMany(),
		);
		return new Map(
			versions.map((v) => [
				v.skillId,
				{ name: v.name, description: v.description, version: v.version },
			]),
		);
	}

	/**
	 * The name of the latest version of every skill in one target: the same agent, the
	 * same project (its agent skills not included) or the instance. For the name check.
	 */
	async findLatestNamesInTarget(
		target: SkillTarget,
		ctx: OperationContext = {},
	): Promise<Array<{ skillId: string; name: string }>> {
		const query = highestVersionsQuery(this.managerFor(ctx))
			.innerJoin(Skill, 'skill', 'skill.id = version.skillId')
			.select(['version.skillId', 'version.name']);
		if (target.agentId) {
			query.andWhere('skill.agentId = :agentId', { agentId: target.agentId });
		} else if (target.projectId) {
			query
				.andWhere('skill.projectId = :projectId', { projectId: target.projectId })
				.andWhere('skill.agentId IS NULL');
		} else {
			query.andWhere('skill.projectId IS NULL').andWhere('skill.agentId IS NULL');
		}
		const versions = await query.getMany();
		return versions.map(({ skillId, name }) => ({ skillId, name }));
	}

	/** Version rows by id, keyed by version id. A pinned ref reads them. */
	async findVersionsByIds(
		versionIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, ResolvedSkillRow>> {
		if (versionIds.length === 0) return new Map();
		const versions = await this.managerFor(ctx).find(SkillVersion, {
			where: { id: In(unique(versionIds)) },
		});
		const rows = await this.resolve(versions, ctx);
		return new Map(rows.map((row) => [row.version.id, row]));
	}

	/** The next version number of a skill: the highest version plus one, or 1. */
	async nextVersionNumber(skillId: string, ctx: OperationContext = {}): Promise<number> {
		const latest = await this.managerFor(ctx).findOne(SkillVersion, {
			select: ['version'],
			where: { skillId },
			order: { version: 'DESC' },
		});
		return (latest?.version ?? 0) + 1;
	}

	/** Inserts the skill with its v1 and returns the id of that version. */
	async createSkill(
		skill: { id: string; target: SkillTarget; source: SkillSource; createdById: string | null },
		content: SkillContent,
		ctx: OperationContext = {},
	): Promise<string> {
		return await this.runInTransaction(ctx, async (manager) => {
			await manager.insert(Skill, {
				id: skill.id,
				projectId: skill.target.projectId,
				agentId: skill.target.agentId,
				source: skill.source,
				createdById: skill.createdById,
			});
			return await insertVersion(manager, skill.id, 1, content, skill.createdById);
		});
	}

	/** Inserts the next version with its files and returns its id. The skill moves up the list. */
	async insertSavedVersion(
		skillId: string,
		version: number,
		content: SkillContent,
		createdById: string | null,
		ctx: OperationContext = {},
	): Promise<string> {
		return await this.runInTransaction(ctx, async (manager) => {
			const id = await insertVersion(manager, skillId, version, content, createdById);
			await manager.update(Skill, { id: skillId }, { updatedAt: new Date() });
			return id;
		});
	}

	/** Whether a skill with this id exists. */
	async existsById(skillId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.managerFor(ctx).exists(Skill, { where: { id: skillId } });
	}

	/** Whether the agent owns a skill (an agent skill). */
	async existsForAgent(agentId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.managerFor(ctx).exists(Skill, { where: { agentId } });
	}

	/** The number of each version, keyed by version id. */
	async findVersionNumbers(
		versionIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		const manager = this.managerFor(ctx);
		const versions = await inChunks(
			versionIds,
			async (chunk) =>
				await manager.find(SkillVersion, {
					select: ['id', 'version'],
					where: { id: In(chunk) },
				}),
		);
		return new Map(versions.map((version) => [version.id, version.version]));
	}

	/** The content hash of each version, keyed by version id. */
	async findContentHashes(
		versionIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		const manager = this.managerFor(ctx);
		const versions = await inChunks(
			versionIds,
			async (chunk) =>
				await manager.find(SkillVersion, {
					select: ['id', 'contentHash'],
					where: { id: In(chunk) },
				}),
		);
		return new Map(versions.map((version) => [version.id, version.contentHash]));
	}

	/** The content hash of the latest version of each skill, keyed by skill id. */
	async findLatestContentHashes(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		const manager = this.managerFor(ctx);
		const versions = await inChunks(
			skillIds,
			async (chunk) =>
				await latestVersionsQuery(manager, chunk)
					.select(['version.skillId', 'version.contentHash'])
					.getMany(),
		);
		return new Map(versions.map((version) => [version.skillId, version.contentHash]));
	}

	/**
	 * Every version of the skills that one agent owns, and of `refSkillIds`, the skills its
	 * draft refers to. The startup copy reuses a version with the same content.
	 */
	async findVersionsOfAgentSkills(
		agentId: string,
		refSkillIds: string[],
		ctx: OperationContext = {},
	): Promise<Array<Pick<SkillVersion, 'id' | 'skillId' | 'version' | 'contentHash'>>> {
		const query = this.managerFor(ctx)
			.createQueryBuilder(SkillVersion, 'version')
			.innerJoin(Skill, 'skill', 'skill.id = version.skillId')
			.select(['version.id', 'version.skillId', 'version.version', 'version.contentHash'])
			.where('skill.agentId = :agentId', { agentId });
		if (refSkillIds.length > 0) {
			query.orWhere('skill.id IN (:...refSkillIds)', { refSkillIds: unique(refSkillIds) });
		}
		return await query.orderBy('version.version', 'ASC').getMany();
	}

	/** Moves a skill to a project, one agent or the instance. */
	async updateTarget(skillId: string, target: SkillTarget, ctx: OperationContext = {}) {
		await this.managerFor(ctx).update(
			Skill,
			{ id: skillId },
			{ projectId: target.projectId, agentId: target.agentId, updatedAt: new Date() },
		);
	}

	/** Name and type of each project, keyed by project id. A missing project is absent. */
	async findProjects(
		projectIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, Pick<Project, 'name' | 'type'>>> {
		const manager = this.managerFor(ctx);
		const projects = await inChunks(
			projectIds,
			async (chunk) =>
				await manager.find(Project, {
					where: { id: In(chunk) },
					select: ['id', 'name', 'type'],
				}),
		);
		return new Map(
			projects.map((project) => [project.id, { name: project.name, type: project.type }]),
		);
	}

	/**
	 * Deletes the skill. Its versions, files, dependency rows and pins go by cascade,
	 * so callers check usage first.
	 */
	async deleteSkill(skillId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).delete(Skill, { id: skillId });
	}

	/**
	 * Holds the skill rows for writing until the transaction ends, so a save and a publish
	 * that pins the same skill run one after the other. See `lockForPublish`.
	 */
	async lockForEdit(skillIds: string[], ctx: OperationContext = {}): Promise<void> {
		await this.lock(skillIds, 'pessimistic_write', ctx);
	}

	/** Shared lock: publishes run side by side, a save waits for them. */
	async lockForPublish(skillIds: string[], ctx: OperationContext = {}): Promise<void> {
		await this.lock(skillIds, 'pessimistic_read', ctx);
	}

	private async lock(
		skillIds: string[],
		mode: 'pessimistic_write' | 'pessimistic_read',
		ctx: OperationContext,
	): Promise<void> {
		if (!ctx.trx) throw new UnexpectedError('Skill row locks need a transaction');
		// SQLite allows one write transaction at a time, so the rows cannot change under us.
		if (skillIds.length === 0 || this.manager.connection.options.type !== 'postgres') return;
		await this.managerFor(ctx).find(Skill, {
			select: ['id'],
			where: { id: In(unique(skillIds)) },
			lock: { mode },
		});
	}

	private async resolveBySkill(
		versions: SkillVersion[],
		ctx: OperationContext,
	): Promise<Map<string, ResolvedSkillRow>> {
		const rows = await this.resolve(versions, ctx);
		return new Map(rows.map((row) => [row.skill.id, row]));
	}

	/** Adds the skill and the files, sorted by path, to each version row. */
	private async resolve(
		versions: SkillVersion[],
		ctx: OperationContext,
	): Promise<ResolvedSkillRow[]> {
		if (versions.length === 0) return [];
		const manager = this.managerFor(ctx);
		const skills = await this.findByIds(
			versions.map((version) => version.skillId),
			ctx,
		);
		const files = await inChunks(
			versions.map((version) => version.id),
			async (chunk) => await manager.find(SkillFile, { where: { skillVersionId: In(chunk) } }),
		);
		const skillById = new Map(skills.map((skill) => [skill.id, skill]));
		const filesByVersion = new Map<string, SkillFile[]>();
		for (const file of files.sort((a, b) => compareSkillFilePaths(a.path, b.path))) {
			filesByVersion.set(file.skillVersionId, [
				...(filesByVersion.get(file.skillVersionId) ?? []),
				file,
			]);
		}
		return versions.flatMap((version) => {
			const skill = skillById.get(version.skillId);
			return skill ? [{ skill, version, files: filesByVersion.get(version.id) ?? [] }] : [];
		});
	}
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

/** Runs `read` over the distinct ids in chunks that stay under the bind limit. */
async function inChunks<T>(ids: string[], read: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
	const results: T[] = [];
	for (const chunk of chunkIds(unique(ids))) results.push(...(await read(chunk)));
	return results;
}

/** The version rows that have the highest number of their skill. */
function highestVersionsQuery(manager: EntityManager) {
	return manager.createQueryBuilder(SkillVersion, 'version').where((qb) => {
		const highest = qb
			.subQuery()
			.select('MAX(later.version)')
			.from(SkillVersion, 'later')
			.where('later.skillId = version.skillId')
			.getQuery();
		return `version.version = ${highest}`;
	});
}

/** The version rows of these skills that have the highest number of their skill. */
function latestVersionsQuery(manager: EntityManager, skillIds: string[]) {
	return highestVersionsQuery(manager).andWhere('version.skillId IN (:...skillIds)', {
		skillIds,
	});
}

async function insertVersion(
	manager: EntityManager,
	skillId: string,
	version: number,
	content: SkillContent,
	createdById: string | null,
): Promise<string> {
	const id = randomUUID();
	// `save`, not `insert`: the partial-entity type of `insert` rejects free-form JSON.
	await manager.save(
		manager.create(SkillVersion, {
			id,
			skillId,
			version,
			name: content.name,
			description: content.description,
			instructions: content.instructions,
			frontmatter: content.frontmatter,
			contentHash: skillContentHash(content),
			createdById,
		}),
	);
	await insertFiles(manager, id, content.files);
	return id;
}

async function insertFiles(
	manager: EntityManager,
	skillVersionId: string,
	files: SkillContent['files'],
): Promise<void> {
	if (files.length === 0) return;
	await manager.insert(
		SkillFile,
		files.map((file) => ({
			skillVersionId,
			path: file.path,
			content: file.content,
		})),
	);
}
