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
import { Brackets, DataSource, In, IsNull, type EntityManager } from '@n8n/typeorm';
import type { SkillUsage } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentVersionSkillDependency } from '../entities/agent-version-skill-dependency.entity';
import { AgentHistory } from '../entities/agent-history.entity';
import { AgentSkillDependency } from '../entities/agent-skill-dependency.entity';
import { Agent } from '../entities/agent.entity';
import { SkillFile } from '../entities/skill-file.entity';
import { SkillVersion } from '../entities/skill-version.entity';
import { Skill, type SkillSource } from '../entities/skill.entity';
import {
	compareSkillFilePaths,
	skillContentHash,
	type SkillContent,
} from '../skills/skill-content-hash';

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

/** A skill ref of an agent draft. A ref with `versionId` is pinned to that saved version. */
export type SkillDependencyRef = { skillId: string; versionId?: string | null };

/** Which skills one user may list: instance skills always, plus the skills of these projects and of their agents. */
export type SkillVisibility = {
	projectIds: string[] | 'all';
};

/** Narrows the visible skills of `findVisiblePage` and cuts one page. */
export type SkillListFilter = {
	scope?: 'project' | 'agent' | 'instance';
	/** The skills of this project and of its agents. */
	projectId?: string;
	/** What this agent may attach: instance skills, its project's skills and its own. */
	attachableTo?: { agentId: string; projectId: string };
	search?: string;
	skip: number;
	take?: number;
};

export type { SkillUsage } from '@n8n/api-types';

/** Latest version of a skill without its content. */
export type SkillSummary = { name: string; description: string; version: number };

/** Persistence for skills, their versions and files, and the agent rows that use them. */
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
		// An agent skill has no projectId: its project comes from its agent.
		const agentsOf = (projectCondition: string) =>
			manager
				.createQueryBuilder()
				.subQuery()
				.select('owner.id')
				.from(Agent, 'owner')
				.where(projectCondition)
				.getQuery();
		const { projectIds } = visibility;
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
				if (projectIds === 'all') branches.push('skill.agentId IS NOT NULL');
				else if (projectIds.length > 0) {
					branches.push(`skill.agentId IN ${agentsOf('owner.projectId IN (:...projectIds)')}`);
				}
			}
		}
		if (branches.length === 0) return { skills: [], count: 0 };

		const query = manager
			.createQueryBuilder(Skill, 'skill')
			.where(new Brackets((qb) => branches.forEach((branch) => qb.orWhere(`(${branch})`))))
			.setParameters({
				projectIds,
				...(filter.attachableTo !== undefined && {
					attachProjectId: filter.attachableTo.projectId,
					attachAgentId: filter.attachableTo.agentId,
				}),
			});
		if (filter.projectId) {
			query.andWhere(
				new Brackets((qb) =>
					qb
						.where('skill.projectId = :projectId')
						.orWhere(`skill.agentId IN ${agentsOf('owner.projectId = :projectId')}`),
				),
				{ projectId: filter.projectId },
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

	/**
	 * The pinned version of each skill of one published agent version, keyed by skill id,
	 * in the order of the draft refs at publish.
	 */
	async findPinned(
		agentVersionId: string,
		ctx: OperationContext = {},
	): Promise<Map<string, ResolvedSkillRow>> {
		const pins = await this.managerFor(ctx).find(AgentVersionSkillDependency, {
			where: { agentVersionId },
			order: { createdAt: 'ASC' },
		});
		const versions = await this.findVersionsByIds(
			pins.map((pin) => pin.skillVersionId),
			ctx,
		);
		const result = new Map<string, ResolvedSkillRow>();
		for (const pin of pins) {
			const row = versions.get(pin.skillVersionId);
			if (row) result.set(pin.skillId, row);
		}
		return result;
	}

	/**
	 * The skill ids one published agent version pins, in the order of the draft refs at
	 * publish. Reads no version or file rows.
	 */
	async findPinnedSkillIds(agentVersionId: string, ctx: OperationContext = {}): Promise<string[]> {
		const pins = await this.managerFor(ctx).find(AgentVersionSkillDependency, {
			select: ['skillId'],
			where: { agentVersionId },
			order: { createdAt: 'ASC' },
		});
		return pins.map((pin) => pin.skillId);
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

	/** Inserts the skill with its v1. */
	async createSkill(
		skill: { id: string; target: SkillTarget; source: SkillSource; createdById: string | null },
		content: SkillContent,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.runInTransaction(ctx, async (manager) => {
			await manager.insert(Skill, {
				id: skill.id,
				projectId: skill.target.projectId,
				agentId: skill.target.agentId,
				source: skill.source,
				createdById: skill.createdById,
			});
			await insertVersion(manager, skill.id, 1, content, skill.createdById);
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

	/**
	 * Inserts the pins of one publish in the given order. `createdAt` orders the skills of
	 * a published version, so each pin gets its own timestamp, like `replaceDependencies`.
	 */
	async insertPins(
		pins: Array<{ agentVersionId: string; skillId: string; skillVersionId: string }>,
		ctx: OperationContext = {},
	): Promise<void> {
		if (pins.length === 0) return;
		const first = Date.now();
		await this.managerFor(ctx).insert(
			AgentVersionSkillDependency,
			pins.map((pin, index) => ({ ...pin, createdAt: new Date(first + index) })),
		);
	}

	/**
	 * Sets the dependency rows of one agent to these refs. Refs to unknown skills are
	 * skipped. A row that stays keeps its `createdAt`, which orders an agent's skills, and
	 * new rows sort after it in the given order. When one skill has a following ref and a
	 * pinned ref, the following ref wins, because the draft then runs the latest version.
	 */
	async replaceDependencies(
		agentId: string,
		refs: SkillDependencyRef[],
		ctx: OperationContext = {},
	): Promise<void> {
		const pinBySkill = new Map<string, string | null>();
		for (const ref of refs) {
			if (pinBySkill.get(ref.skillId) === null) continue;
			pinBySkill.set(ref.skillId, ref.versionId ?? null);
		}
		await this.runInTransaction(ctx, async (manager, txCtx) => {
			const known = new Set(
				(await this.findByIds([...pinBySkill.keys()], txCtx)).map((skill) => skill.id),
			);
			const current = await manager.find(AgentSkillDependency, { where: { agentId } });
			const removed = current.filter(
				(row) => !known.has(row.skillId) || !pinBySkill.has(row.skillId),
			);
			if (removed.length > 0) {
				await manager.delete(AgentSkillDependency, {
					agentId,
					skillId: In(removed.map((row) => row.skillId)),
				});
			}
			const kept = new Map(current.map((row) => [row.skillId, row]));
			for (const [skillId, skillVersionId] of pinBySkill) {
				const row = kept.get(skillId);
				if (row && row.skillVersionId !== skillVersionId) {
					await manager.update(AgentSkillDependency, { agentId, skillId }, { skillVersionId });
				}
			}
			const added = [...pinBySkill].filter(([skillId]) => known.has(skillId) && !kept.has(skillId));
			if (added.length === 0) return;
			// One insert gives every row the same timestamp, so each new row gets its own.
			const newest = Math.max(Date.now(), ...current.map((row) => row.createdAt.getTime() + 1));
			await manager.insert(
				AgentSkillDependency,
				added.map(([skillId, skillVersionId], index) => ({
					agentId,
					skillId,
					skillVersionId,
					createdAt: new Date(newest + index),
				})),
			);
		});
	}

	/** Agents whose draft follows the skill (no pin). */
	async findFollowingAgents(
		skillId: string,
		ctx: OperationContext = {},
	): Promise<Array<Pick<Agent, 'id' | 'name'>>> {
		const agentIds = await this.findFollowingAgentIds([skillId], ctx);
		if (agentIds.length === 0) return [];
		return await this.managerFor(ctx).find(Agent, {
			where: { id: In(agentIds) },
			select: ['id', 'name'],
		});
	}

	/** The skill refs of each agent's draft, in the order they were attached. */
	async findDependencies(
		agentIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, Array<{ skillId: string; versionId: string | null }>>> {
		if (agentIds.length === 0) return new Map();
		const rows = await this.managerFor(ctx).find(AgentSkillDependency, {
			where: { agentId: In(unique(agentIds)) },
			order: { createdAt: 'ASC' },
		});
		const result = new Map<string, Array<{ skillId: string; versionId: string | null }>>();
		for (const row of rows) {
			const refs = result.get(row.agentId) ?? [];
			refs.push({ skillId: row.skillId, versionId: row.skillVersionId });
			result.set(row.agentId, refs);
		}
		return result;
	}

	/** Ids of the agents whose draft follows any of these skills (no pin). */
	async findFollowingAgentIds(skillIds: string[], ctx: OperationContext = {}): Promise<string[]> {
		if (skillIds.length === 0) return [];
		const rows = await this.managerFor(ctx).find(AgentSkillDependency, {
			where: { skillId: In(unique(skillIds)), skillVersionId: IsNull() },
		});
		return unique(rows.map((row) => row.agentId));
	}

	/**
	 * "Used by": each agent that uses the skill once, as a draft ref, as a published pin, or
	 * both. A pin row shows the version the agent's current published version runs, or
	 * null when only older published versions use the skill. Agents outside `projectIds`
	 * are only counted. The read grows with the agents, not with their publishes.
	 */
	async findUsage(
		skillId: string,
		projectIds: string[] | 'all' = 'all',
		ctx: OperationContext = {},
	): Promise<SkillUsage> {
		const manager = this.managerFor(ctx);
		const drafted = await manager
			.createQueryBuilder(Agent, 'agent')
			.innerJoin(AgentSkillDependency, 'dep', 'dep.agentId = agent.id')
			.where('dep.skillId = :skillId', { skillId })
			.select(['agent.id', 'agent.name', 'agent.projectId'])
			.getMany();
		const published = await manager
			.createQueryBuilder(Agent, 'agent')
			.where((qb) => {
				const pinned = qb
					.subQuery()
					.select('history.agentId')
					.from(AgentHistory, 'history')
					.innerJoin(AgentVersionSkillDependency, 'pin', 'pin.agentVersionId = history.versionId')
					.where('pin.skillId = :skillId')
					.getQuery();
				return `agent.id IN ${pinned}`;
			})
			.setParameter('skillId', skillId)
			.select(['agent.id', 'agent.name', 'agent.projectId', 'agent.activeVersionId'])
			.getMany();

		const isVisible = (agent: Pick<Agent, 'projectId'>) =>
			projectIds === 'all' || projectIds.includes(agent.projectId);
		const hidden = new Set(
			[...drafted, ...published].filter((agent) => !isVisible(agent)).map((agent) => agent.id),
		);
		const visiblePublished = published.filter(isVisible);
		const activeVersions = await this.findActivePinVersions(
			skillId,
			visiblePublished.flatMap((agent) => (agent.activeVersionId ? [agent.activeVersionId] : [])),
			manager,
		);
		return {
			drafts: drafted.filter(isVisible).map((agent) => ({
				agentId: agent.id,
				agentName: agent.name,
				projectId: agent.projectId,
			})),
			pins: visiblePublished.map((agent) => ({
				agentId: agent.id,
				agentName: agent.name,
				projectId: agent.projectId,
				version: activeVersions.get(agent.activeVersionId ?? '') ?? null,
			})),
			hiddenAgents: hidden.size,
		};
	}

	/** The agents that use the skill: a draft ref or a published pin. */
	async findUsingAgentIds(skillId: string, ctx: OperationContext = {}): Promise<string[]> {
		const manager = this.managerFor(ctx);
		const drafts = await manager.find(AgentSkillDependency, {
			select: ['agentId'],
			where: { skillId },
		});
		const pins = await manager
			.createQueryBuilder(AgentVersionSkillDependency, 'pin')
			.innerJoin(AgentHistory, 'history', 'history.versionId = pin.agentVersionId')
			.where('pin.skillId = :skillId', { skillId })
			.select('history.agentId', 'agentId')
			.distinct(true)
			.getRawMany<{ agentId: string }>();
		return unique([...drafts, ...pins].map((row) => row.agentId));
	}

	/** Moves a skill to a project, one agent or the instance. */
	async updateTarget(skillId: string, target: SkillTarget, ctx: OperationContext = {}) {
		await this.managerFor(ctx).update(
			Skill,
			{ id: skillId },
			{ projectId: target.projectId, agentId: target.agentId, updatedAt: new Date() },
		);
	}

	/** Distinct agents per skill, drafts and pins together. Skills nobody uses are left out. */
	async countUsingAgents(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		const manager = this.managerFor(ctx);
		const pairs = await inChunks(skillIds, async (chunk) => {
			const drafts = await manager.find(AgentSkillDependency, {
				select: ['skillId', 'agentId'],
				where: { skillId: In(chunk) },
			});
			const pins = await manager
				.createQueryBuilder(AgentVersionSkillDependency, 'pin')
				.innerJoin(AgentHistory, 'history', 'history.versionId = pin.agentVersionId')
				.where('pin.skillId IN (:...chunk)', { chunk })
				.select('pin.skillId', 'skillId')
				.addSelect('history.agentId', 'agentId')
				.distinct(true)
				.getRawMany<{ skillId: string; agentId: string }>();
			return [...drafts, ...pins];
		});
		const agentsBySkill = new Map<string, Set<string>>();
		for (const { skillId, agentId } of pairs) {
			agentsBySkill.set(skillId, (agentsBySkill.get(skillId) ?? new Set()).add(agentId));
		}
		return new Map([...agentsBySkill].map(([skillId, agents]) => [skillId, agents.size]));
	}

	async findProjectNames(
		projectIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		const manager = this.managerFor(ctx);
		const projects = await inChunks(
			projectIds,
			async (chunk) =>
				await manager.find(Project, { where: { id: In(chunk) }, select: ['id', 'name'] }),
		);
		return new Map(projects.map((project) => [project.id, project.name]));
	}

	/** Name and project of each agent, keyed by agent id. An agent skill takes its project from them. */
	async findAgents(
		agentIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, Pick<Agent, 'name' | 'projectId'>>> {
		const manager = this.managerFor(ctx);
		const agents = await inChunks(
			agentIds,
			async (chunk) =>
				await manager.find(Agent, {
					where: { id: In(chunk) },
					select: ['id', 'name', 'projectId'],
				}),
		);
		return new Map(agents.map(({ id, name, projectId }) => [id, { name, projectId }]));
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

	/** The skill version number each of these published agent versions pins. */
	private async findActivePinVersions(
		skillId: string,
		agentVersionIds: string[],
		manager: EntityManager,
	): Promise<Map<string, number>> {
		const rows = await inChunks(
			agentVersionIds,
			async (chunk) =>
				await manager
					.createQueryBuilder(AgentVersionSkillDependency, 'pin')
					.innerJoin(SkillVersion, 'version', 'version.id = pin.skillVersionId')
					.where('pin.skillId = :skillId', { skillId })
					.andWhere('pin.agentVersionId IN (:...chunk)', { chunk })
					.select('pin.agentVersionId', 'agentVersionId')
					.addSelect('version.version', 'version')
					.getRawMany<{ agentVersionId: string; version: number | string }>(),
		);
		return new Map(rows.map((row) => [row.agentVersionId, Number(row.version)]));
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

/** The version rows of these skills that have the highest number of their skill. */
function latestVersionsQuery(manager: EntityManager, skillIds: string[]) {
	return manager
		.createQueryBuilder(SkillVersion, 'version')
		.where('version.skillId IN (:...skillIds)', { skillIds })
		.andWhere((qb) => {
			const highest = qb
				.subQuery()
				.select('MAX(later.version)')
				.from(SkillVersion, 'later')
				.where('later.skillId = version.skillId')
				.getQuery();
			return `version.version = ${highest}`;
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
