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

import {
	compareSkillFilePaths,
	skillContentHash,
	type SkillContent,
} from '../../utils/skill-content-hash';
import type {
	AssistantSkillSummary,
	ResolvedSkillRow,
	SkillTarget,
} from '../../utils/skill-content';
import { SkillFile } from '../entities/skill-file.entity';
import { SkillVersion } from '../entities/skill-version.entity';
import { Skill, type SkillSource } from '../entities/skill.entity';

/** The scope fields checked by Assistant reads. */
export type AssistantSkillAccess = Pick<
	Skill,
	'id' | 'projectId' | 'agentId' | 'availableToAssistant'
>;

type AssistantSkillAccessRow = {
	assistantProjectId: string | null;
	assistantAgentId: string | null;
	assistantAvailableToAssistant: boolean | number;
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
	/** The skills this agent uses (`skillIds`) and its own agent skills. */
	usedBy?: { agentId: string; skillIds: string[] };
	createdById?: string;
	search?: string;
	/** Most recently changed first when absent. */
	sort?: SkillListSort;
	skip: number;
	take?: number;
};

/** Name sorts by the latest version, without case. */
export type SkillListSort = { by: 'name' | 'updatedAt'; order: 'ASC' | 'DESC' };

/** Latest version of a skill without its content. */
export type SkillSummary = { name: string; description: string; version: number };

class SkillTable extends BaseRepository<Skill> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Skill, dataSource.manager, transactionRunner);
	}
}

/** Persistence for skills, their versions and their files. */
@Service()
export class SkillRepository {
	private readonly table: SkillTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new SkillTable(dataSource, transactionRunner);
	}

	/**
	 * One page of the skills the user may see, newest change first unless `sort` says
	 * otherwise, and the count of all matches. The filters, the search, the sort and the page
	 * cut run in the query, so the read grows with the page, not with the skills on the
	 * instance. The search matches the name or the description of the latest version.
	 * Without `take` every match is returned.
	 */
	async findVisiblePage(
		visibility: SkillVisibility,
		filter: SkillListFilter,
		ctx: OperationContext = {},
	): Promise<{ skills: Skill[]; count: number }> {
		const query = this.visibleQuery(visibility, filter, ctx);
		if (!query) return { skills: [], count: 0 };
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
		if (filter.usedBy) {
			const { agentId, skillIds } = filter.usedBy;
			query.andWhere(
				new Brackets((qb) => {
					qb.where('skill.agentId = :usedByAgentId');
					if (skillIds.length > 0) qb.orWhere('skill.id IN (:...usedSkillIds)');
				}),
				{ usedByAgentId: agentId, usedSkillIds: skillIds },
			);
		}
		if (filter.createdById !== undefined) {
			query.andWhere('skill.createdById = :createdById', { createdById: filter.createdById });
		}
		const sortByName = filter.sort?.by === 'name';
		if (filter.search || sortByName) {
			query.innerJoin(SkillVersion, 'latest', 'latest.skillId = skill.id').andWhere((qb) => {
				const highest = qb
					.subQuery()
					.select('MAX(later.version)')
					.from(SkillVersion, 'later')
					.where('later.skillId = skill.id')
					.getQuery();
				return `latest.version = ${highest}`;
			});
		}
		if (filter.search) {
			query.andWhere(
				new Brackets((qb) =>
					qb
						.where(`LOWER(latest.name) LIKE :search ${LIKE_ESCAPE_CLAUSE}`)
						.orWhere(`LOWER(latest.description) LIKE :search ${LIKE_ESCAPE_CLAUSE}`),
				),
				{ search: `%${escapeLike(filter.search.toLowerCase())}%` },
			);
		}
		const order = filter.sort?.order ?? 'DESC';
		query.orderBy(sortByName ? 'LOWER(latest.name)' : 'skill.updatedAt', order);
		// The id breaks ties, so a skill never shows on two pages or on none.
		query.addOrderBy('skill.id', 'ASC').offset(filter.skip);
		if (filter.take !== undefined) query.limit(filter.take);
		const [skills, count] = await query.getManyAndCount();
		return { skills, count };
	}

	/** The distinct creators of the skills the user may see, for the creator filter. */
	async findVisibleCreatorIds(
		visibility: SkillVisibility,
		ctx: OperationContext = {},
	): Promise<string[]> {
		const query = this.visibleQuery(visibility, {}, ctx);
		if (!query) return [];
		const rows = await query
			.andWhere('skill.createdById IS NOT NULL')
			.select('skill.createdById', 'createdById')
			.distinct(true)
			.getRawMany<{ createdById: string }>();
		return rows.map((row) => row.createdById);
	}

	/** The skills `visibility` allows, narrowed by scope or by the agent that attaches them. */
	private visibleQuery(
		visibility: SkillVisibility,
		filter: Pick<SkillListFilter, 'scope' | 'attachableTo'>,
		ctx: OperationContext,
	) {
		const manager = this.table.managerFor(ctx);
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
		if (branches.length === 0) return null;

		return manager
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
	}

	async findAssistantSkillSummaries(projectId: string | null): Promise<AssistantSkillSummary[]> {
		return await assistantVersionsQuery(this.table.manager, projectId)
			.select('skill.id', 'id')
			.addSelect('skill.projectId', 'projectId')
			.addSelect('version.id', 'versionId')
			.addSelect('version.version', 'version')
			.addSelect('version.name', 'name')
			.addSelect('version.description', 'description')
			.orderBy('skill.id', 'ASC')
			.getRawMany<AssistantSkillSummary>();
	}

	/** Reads instructions and reference names without reference bodies. */
	async findAssistantSkill(
		skillId: string,
		projectId: string | null,
		versionId?: string,
	): Promise<{
		skill: AssistantSkillAccess;
		version: SkillVersion;
		files: Array<{ path: string }>;
	} | null> {
		const {
			entities: [version],
			raw: [scope],
		} = await assistantVersionsQuery(this.table.manager, projectId, versionId)
			.andWhere('skill.id = :skillId', { skillId })
			.addSelect('skill.projectId', 'assistantProjectId')
			.addSelect('skill.agentId', 'assistantAgentId')
			.addSelect('skill.availableToAssistant', 'assistantAvailableToAssistant')
			.getRawAndEntities<AssistantSkillAccessRow>();
		if (!version || !scope) return null;
		const skill: AssistantSkillAccess = {
			id: skillId,
			projectId: scope.assistantProjectId,
			agentId: scope.assistantAgentId,
			availableToAssistant: Boolean(scope.assistantAvailableToAssistant),
		};
		const files = await this.table.manager.find(SkillFile, {
			where: { skillVersionId: version.id },
			select: { path: true },
		});
		files.sort((left, right) => compareSkillFilePaths(left.path, right.path));
		return { skill, version, files: files.map(({ path }) => ({ path })) };
	}

	async findAssistantSkillFile(
		skillId: string,
		projectId: string | null,
		versionId: string,
		path: string,
	): Promise<{ skill: AssistantSkillAccess; file: SkillFile } | null> {
		const {
			entities: [file],
			raw: [scope],
		} = await this.table.manager
			.createQueryBuilder(SkillFile, 'file')
			.innerJoin(SkillVersion, 'version', 'version.id = file.skillVersionId')
			.innerJoin(Skill, 'skill', 'skill.id = version.skillId')
			.where('version.id = :versionId AND skill.id = :skillId', { versionId, skillId })
			.andWhere('file.path = :path', { path })
			.andWhere('skill.availableToAssistant = :enabled', { enabled: true })
			.andWhere('skill.agentId IS NULL')
			.andWhere('(skill.projectId IS NULL OR skill.projectId = :projectId)', { projectId })
			.addSelect('skill.projectId', 'assistantProjectId')
			.addSelect('skill.agentId', 'assistantAgentId')
			.addSelect('skill.availableToAssistant', 'assistantAvailableToAssistant')
			.getRawAndEntities<AssistantSkillAccessRow>();
		if (!file || !scope) return null;
		return {
			skill: {
				id: skillId,
				projectId: scope.assistantProjectId,
				agentId: scope.assistantAgentId,
				availableToAssistant: Boolean(scope.assistantAvailableToAssistant),
			},
			file,
		};
	}

	async setAssistantAvailability(
		skillId: string,
		available: boolean,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).update(Skill, skillId, { availableToAssistant: available });
	}

	async findByIds(ids: string[], ctx: OperationContext = {}): Promise<Skill[]> {
		const manager = this.table.managerFor(ctx);
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
		const manager = this.table.managerFor(ctx);
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
		const manager = this.table.managerFor(ctx);
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

	/** The id of the latest version of each skill, keyed by skill id, without its content. */
	async findLatestVersionIds(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		const manager = this.table.managerFor(ctx);
		const versions = await inChunks(
			skillIds,
			async (chunk) =>
				await latestVersionsQuery(manager, chunk)
					.select(['version.id', 'version.skillId'])
					.getMany(),
		);
		return new Map(versions.map((version) => [version.skillId, version.id]));
	}

	/**
	 * The name of the latest version of every skill in one target: the same agent, the
	 * same project (its agent skills not included) or the instance. For the name check.
	 */
	async findLatestNamesInTarget(
		target: SkillTarget,
		ctx: OperationContext = {},
	): Promise<Array<{ skillId: string; name: string }>> {
		const query = highestVersionsQuery(this.table.managerFor(ctx))
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
		const versions = await this.table.managerFor(ctx).find(SkillVersion, {
			where: { id: In(unique(versionIds)) },
		});
		const rows = await this.resolve(versions, ctx);
		return new Map(rows.map((row) => [row.version.id, row]));
	}

	/** The next version number of a skill: the highest version plus one, or 1. */
	async nextVersionNumber(skillId: string, ctx: OperationContext = {}): Promise<number> {
		const latest = await this.table.managerFor(ctx).findOne(SkillVersion, {
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
		return await this.table.runInTransaction(ctx, async (manager) => {
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
		return await this.table.runInTransaction(ctx, async (manager) => {
			const id = await insertVersion(manager, skillId, version, content, createdById);
			await manager.update(Skill, { id: skillId }, { updatedAt: new Date() });
			return id;
		});
	}

	/** The skill of each version, keyed by version id, without its content. */
	async findSkillIdsOfVersions(
		versionIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		const manager = this.table.managerFor(ctx);
		const versions = await inChunks(
			unique(versionIds),
			async (chunk) =>
				await manager.find(SkillVersion, {
					select: ['id', 'skillId'],
					where: { id: In(chunk) },
				}),
		);
		return new Map(versions.map((version) => [version.id, version.skillId]));
	}

	/** The number of each version, keyed by version id. */
	async findVersionNumbers(
		versionIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		const manager = this.table.managerFor(ctx);
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

	/** Moves a skill to a project, one agent or the instance. */
	async updateTarget(skillId: string, target: SkillTarget, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).update(
			Skill,
			{ id: skillId },
			{
				projectId: target.projectId,
				agentId: target.agentId,
				...(target.agentId !== null ? { availableToAssistant: false } : {}),
				updatedAt: new Date(),
			},
		);
	}

	/** Name and type of each project, keyed by project id. A missing project is absent. */
	async findProjects(
		projectIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, Pick<Project, 'name' | 'type'>>> {
		const manager = this.table.managerFor(ctx);
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

	/** Ids of every skill, optionally of one source, in id order. For test fixtures. */
	async findAllIds(filter: { source?: SkillSource } = {}): Promise<string[]> {
		const skills = await this.table.find({ select: ['id'], where: filter, order: { id: 'ASC' } });
		return skills.map((skill) => skill.id);
	}

	/** Every row of the skill tables, in a fixed order. For test fixtures. */
	async findAllRows(): Promise<[Skill[], SkillVersion[], SkillFile[]]> {
		const { manager } = this.table;
		return await Promise.all([
			manager.find(Skill, { order: { id: 'ASC' } }),
			manager.find(SkillVersion, { order: { id: 'ASC' } }),
			manager.find(SkillFile, { order: { skillVersionId: 'ASC', path: 'ASC' } }),
		]);
	}

	/** Deletes every skill, with the same cascades as `deleteSkill`. For test fixtures. */
	async deleteAll(): Promise<void> {
		await this.table.manager.delete(Skill, {});
	}

	/**
	 * Deletes the skill. Its versions, files, dependency rows and pins go by cascade,
	 * so callers check usage first.
	 */
	async deleteSkill(skillId: string, ctx: OperationContext = {}): Promise<void> {
		await this.table.managerFor(ctx).delete(Skill, { id: skillId });
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
		if (skillIds.length === 0 || this.table.manager.connection.options.type !== 'postgres') return;
		await this.table.managerFor(ctx).find(Skill, {
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
		const manager = this.table.managerFor(ctx);
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

function assistantVersionsQuery(
	manager: EntityManager,
	projectId: string | null,
	versionId?: string,
) {
	const versions =
		versionId !== undefined
			? manager
					.createQueryBuilder(SkillVersion, 'version')
					.where('version.id = :versionId', { versionId })
			: highestVersionsQuery(manager);
	return versions
		.innerJoin(Skill, 'skill', 'skill.id = version.skillId')
		.andWhere('skill.availableToAssistant = :enabled', { enabled: true })
		.andWhere('skill.agentId IS NULL')
		.andWhere('(skill.projectId IS NULL OR skill.projectId = :projectId)', { projectId });
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
