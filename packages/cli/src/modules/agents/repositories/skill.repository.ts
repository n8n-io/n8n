import { BaseRepository, Project, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	In,
	IsNull,
	Not,
	type EntityManager,
	type FindOptionsWhere,
} from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentHistorySkill } from '../entities/agent-history-skill.entity';
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

/** Where a skill lives. Both null is an instance skill. */
export type SkillTarget = { userId: string | null; projectId: string | null };

/** One skill with one of its version rows and that row's files, sorted by path. */
export type ResolvedSkillRow = {
	skill: Skill;
	version: SkillVersion;
	files: SkillFile[];
};

/** A skill ref of an agent draft. A ref with `versionId` is pinned to that saved version. */
export type SkillDependencyRef = { skillId: string; versionId?: string | null };

/** Which skills one user may list: instance skills always, plus these users' and projects'. */
export type SkillVisibility = {
	userId: string;
	/** Read access to the "Just you" skills of every user. */
	allUsers: boolean;
	projectIds: string[] | 'all';
};

export type SkillUsage = {
	drafts: Array<{ agentId: string; agentName: string; projectId: string }>;
	pins: Array<{
		agentId: string;
		agentName: string;
		agentVersionId: string;
		version: number;
		isActive: boolean;
	}>;
};

/** Persistence for skills, their versions and files, and the agent rows that use them. */
@Service()
export class SkillRepository extends BaseRepository<Skill> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Skill, dataSource.manager, transactionRunner);
	}

	/** Every skill the user may see, newest change first. */
	async findVisible(visibility: SkillVisibility, ctx: OperationContext = {}): Promise<Skill[]> {
		const where: Array<FindOptionsWhere<Skill>> = [{ userId: IsNull(), projectId: IsNull() }];
		where.push(visibility.allUsers ? { userId: Not(IsNull()) } : { userId: visibility.userId });
		if (visibility.projectIds === 'all') where.push({ projectId: Not(IsNull()) });
		else if (visibility.projectIds.length > 0) where.push({ projectId: In(visibility.projectIds) });
		return await this.managerFor(ctx).find(Skill, { where, order: { updatedAt: 'DESC' } });
	}

	async findByIds(ids: string[], ctx: OperationContext = {}): Promise<Skill[]> {
		if (ids.length === 0) return [];
		return await this.managerFor(ctx).find(Skill, { where: { id: In(unique(ids)) } });
	}

	/** The highest version of each skill, keyed by skill id. A following ref reads it. */
	async findLatestSaved(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, ResolvedSkillRow>> {
		if (skillIds.length === 0) return new Map();
		const versions = await this.managerFor(ctx).find(SkillVersion, {
			where: { skillId: In(unique(skillIds)) },
			order: { version: 'DESC' },
		});
		return await this.resolveBySkill(latestPerSkill(versions), ctx);
	}

	/** Name and description of the latest version, without files. */
	async findLatestSummaries(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, { name: string; description: string }>> {
		if (skillIds.length === 0) return new Map();
		const versions = await this.managerFor(ctx).find(SkillVersion, {
			select: ['skillId', 'version', 'name', 'description'],
			where: { skillId: In(unique(skillIds)) },
			order: { version: 'DESC' },
		});
		return new Map(
			latestPerSkill(versions).map((v) => [
				v.skillId,
				{ name: v.name, description: v.description },
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

	/** The pinned version of each skill of one published agent version, keyed by skill id. */
	async findPinned(
		agentVersionId: string,
		ctx: OperationContext = {},
	): Promise<Map<string, ResolvedSkillRow>> {
		const pins = await this.managerFor(ctx).find(AgentHistorySkill, { where: { agentVersionId } });
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
				userId: skill.target.userId,
				projectId: skill.target.projectId,
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

	async insertPins(
		pins: Array<{ agentVersionId: string; skillId: string; skillVersionId: string }>,
		ctx: OperationContext = {},
	): Promise<void> {
		if (pins.length === 0) return;
		await this.managerFor(ctx).insert(AgentHistorySkill, pins);
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

	/** "Used by": agent drafts that reference the skill, plus every pin, current or older. */
	async findUsage(skillId: string, ctx: OperationContext = {}): Promise<SkillUsage> {
		const manager = this.managerFor(ctx);
		const deps = await manager.find(AgentSkillDependency, { where: { skillId } });
		const draftAgents = deps.length
			? await manager.find(Agent, {
					where: { id: In(deps.map((dep) => dep.agentId)) },
					select: ['id', 'name', 'projectId'],
				})
			: [];
		const pins = await this.findPinsWithAgents([skillId], manager);
		return {
			drafts: draftAgents.map((agent) => ({
				agentId: agent.id,
				agentName: agent.name,
				projectId: agent.projectId,
			})),
			pins: pins.map(({ pin, version, agent }) => ({
				agentId: agent.id,
				agentName: agent.name,
				agentVersionId: pin.agentVersionId,
				version: version.version,
				isActive: agent.activeVersionId === pin.agentVersionId,
			})),
		};
	}

	/** Distinct agents per skill, drafts and pins together. Skills nobody uses are left out. */
	async countUsingAgents(
		skillIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		if (skillIds.length === 0) return new Map();
		const manager = this.managerFor(ctx);
		const agentsBySkill = new Map<string, Set<string>>();
		const add = (skillId: string, agentId: string) =>
			agentsBySkill.set(skillId, (agentsBySkill.get(skillId) ?? new Set()).add(agentId));
		const deps = await manager.find(AgentSkillDependency, {
			where: { skillId: In(unique(skillIds)) },
		});
		for (const dep of deps) add(dep.skillId, dep.agentId);
		for (const { version, agent } of await this.findPinsWithAgents(skillIds, manager)) {
			add(version.skillId, agent.id);
		}
		return new Map([...agentsBySkill].map(([skillId, agents]) => [skillId, agents.size]));
	}

	async findProjectNames(
		projectIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		if (projectIds.length === 0) return new Map();
		const projects = await this.managerFor(ctx).find(Project, {
			where: { id: In(unique(projectIds)) },
			select: ['id', 'name'],
		});
		return new Map(projects.map((project) => [project.id, project.name]));
	}

	/**
	 * Deletes the skill. Its versions, files and dependency rows go by cascade. A pin
	 * blocks the delete at the database, so callers check usage first.
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

	private async findPinsWithAgents(skillIds: string[], manager: EntityManager) {
		const versions = await manager.find(SkillVersion, {
			select: ['id', 'skillId', 'version'],
			where: { skillId: In(unique(skillIds)) },
		});
		if (versions.length === 0) return [];
		const pins = await manager.find(AgentHistorySkill, {
			where: { skillVersionId: In(versions.map((version) => version.id)) },
		});
		if (pins.length === 0) return [];
		const histories = await manager.find(AgentHistory, {
			select: ['versionId', 'agentId'],
			where: { versionId: In(unique(pins.map((pin) => pin.agentVersionId))) },
		});
		const agents = await manager.find(Agent, {
			select: ['id', 'name', 'activeVersionId'],
			where: { id: In(unique(histories.map((history) => history.agentId))) },
		});
		const versionById = new Map(versions.map((version) => [version.id, version]));
		const agentById = new Map(agents.map((agent) => [agent.id, agent]));
		const agentByHistory = new Map(
			histories.map((history) => [history.versionId, agentById.get(history.agentId)]),
		);
		return pins.flatMap((pin) => {
			const version = versionById.get(pin.skillVersionId);
			const agent = agentByHistory.get(pin.agentVersionId);
			return version && agent ? [{ pin, version, agent }] : [];
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
		const files = await manager.find(SkillFile, {
			where: { skillVersionId: In(versions.map((version) => version.id)) },
		});
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

/** The first row per skill of a list sorted by version, highest first. */
function latestPerSkill(versions: SkillVersion[]): SkillVersion[] {
	const latest = new Map<string, SkillVersion>();
	for (const version of versions) {
		if (!latest.has(version.skillId)) latest.set(version.skillId, version);
	}
	return [...latest.values()];
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
