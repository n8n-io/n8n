import { Project } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not, type EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentHistorySkill } from '../entities/agent-history-skill.entity';
import { AgentHistory } from '../entities/agent-history.entity';
import { AgentSkillDependency } from '../entities/agent-skill-dependency.entity';
import { Agent } from '../entities/agent.entity';
import { SkillFile } from '../entities/skill-file.entity';
import { SkillVersion, type SkillFrontmatter } from '../entities/skill-version.entity';
import { Skill, type SkillSource } from '../entities/skill.entity';
import { skillContentHash } from '../skills-hub/skill-content-hash';

export type SkillTarget = { userId: string | null; projectId: string | null };

/** Everything a version row holds, the free-text name included. */
export type SkillContent = {
	name: string;
	description: string;
	instructions: string;
	frontmatter: SkillFrontmatter | null;
	files: Array<{ path: string; content: string }>;
};

/** One skill with the content of one of its version rows. */
export type ResolvedSkillRow = {
	skill: Skill;
	version: SkillVersion;
	files: SkillFile[];
};

/** A skill ref of an agent draft as the dependency table records it. */
export type SkillDependencyRef = { skillId: string; versionId?: string | null };

/** Which skills one user may list: instance skills always, plus these users' and projects'. */
export type SkillVisibility = {
	userId: string;
	/** Global read on other users' "Just you" skills. */
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

/** Persistence for the skills hub. Methods take an optional transaction manager. */
@Service()
export class SkillHubRepository {
	constructor(private readonly dataSource: DataSource) {}

	private m(trx?: EntityManager): EntityManager {
		return trx ?? this.dataSource.manager;
	}

	/** Joins the caller's transaction, or opens one. */
	async inTransaction<T>(
		trx: EntityManager | undefined,
		fn: (trx: EntityManager) => Promise<T>,
	): Promise<T> {
		if (trx) return await fn(trx);
		return await this.dataSource.manager.transaction(fn);
	}

	/** Every skill the user may see, newest change first. Same shape of OR as AI preferences. */
	async findVisibleSkills(visibility: SkillVisibility, trx?: EntityManager): Promise<Skill[]> {
		const qb = this.m(trx)
			.createQueryBuilder(Skill, 's')
			.where('s.userId IS NULL AND s.projectId IS NULL');
		if (visibility.allUsers) qb.orWhere('s.userId IS NOT NULL');
		else qb.orWhere('s.userId = :userId', { userId: visibility.userId });
		if (visibility.projectIds === 'all') qb.orWhere('s.projectId IS NOT NULL');
		else if (visibility.projectIds.length > 0) {
			qb.orWhere('s.projectId IN (:...projectIds)', { projectIds: visibility.projectIds });
		}
		return await qb.orderBy('s.updatedAt', 'DESC').getMany();
	}

	/** Distinct agents per skill that use it: draft refs plus every published pin. */
	async countUsingAgents(skillIds: string[], trx?: EntityManager): Promise<Map<string, number>> {
		const agentsBySkill = new Map<string, Set<string>>();
		if (skillIds.length === 0) return new Map();
		const manager = this.m(trx);
		const add = (skillId: string, agentId: string) => {
			const set = agentsBySkill.get(skillId) ?? new Set<string>();
			set.add(agentId);
			agentsBySkill.set(skillId, set);
		};
		const deps = await manager.find(AgentSkillDependency, { where: { skillId: In(skillIds) } });
		for (const dep of deps) add(dep.skillId, dep.agentId);

		const versions = await manager.find(SkillVersion, {
			where: { skillId: In(skillIds), version: Not(IsNull()) },
			select: ['id', 'skillId'],
		});
		const skillByVersion = new Map(versions.map((v) => [v.id, v.skillId]));
		const pins = versions.length
			? await manager.find(AgentHistorySkill, {
					where: { skillVersionId: In([...skillByVersion.keys()]) },
				})
			: [];
		const histories = pins.length
			? await manager.find(AgentHistory, {
					where: { versionId: In([...new Set(pins.map((p) => p.agentVersionId))]) },
					select: ['versionId', 'agentId'],
				})
			: [];
		const agentByHistory = new Map(histories.map((h) => [h.versionId, h.agentId]));
		for (const pin of pins) {
			const skillId = skillByVersion.get(pin.skillVersionId);
			const agentId = agentByHistory.get(pin.agentVersionId);
			if (skillId && agentId) add(skillId, agentId);
		}
		return new Map([...agentsBySkill].map(([skillId, agents]) => [skillId, agents.size]));
	}

	/** Project names for the scope badge of project skills, keyed by project id. */
	async findProjectNames(projectIds: string[], trx?: EntityManager): Promise<Map<string, string>> {
		const ids = [...new Set(projectIds)];
		if (ids.length === 0) return new Map();
		const projects = await this.m(trx).find(Project, {
			where: { id: In(ids) },
			select: ['id', 'name'],
		});
		return new Map(projects.map((project) => [project.id, project.name]));
	}

	async findSkillsByIds(ids: string[], trx?: EntityManager): Promise<Skill[]> {
		if (ids.length === 0) return [];
		return await this.m(trx).find(Skill, { where: { id: In(ids) } });
	}

	/**
	 * Locks skill rows for the rest of the transaction, so a skill edit and a publish
	 * that pins the skill run one after the other. Postgres only: SQLite runs one
	 * write transaction at a time.
	 */
	async lockSkills(ids: string[], mode: 'edit' | 'publish', trx: EntityManager): Promise<void> {
		if (ids.length === 0 || trx.connection.options.type !== 'postgres') return;
		await trx.find(Skill, {
			where: { id: In(ids) },
			lock: { mode: mode === 'edit' ? 'pessimistic_write' : 'pessimistic_read' },
		});
	}

	/** Draft rows (version NULL) with their files, keyed by skill id. */
	async findDrafts(
		skillIds: string[],
		trx?: EntityManager,
	): Promise<Map<string, ResolvedSkillRow>> {
		const result = new Map<string, ResolvedSkillRow>();
		if (skillIds.length === 0) return result;
		const manager = this.m(trx);
		const skills = await manager.find(Skill, { where: { id: In(skillIds) } });
		if (skills.length === 0) return result;
		const versions = await manager.find(SkillVersion, {
			where: { skillId: In(skills.map((s) => s.id)), version: IsNull() },
		});
		const files = await this.filesFor(
			versions.map((v) => v.id),
			manager,
		);
		const versionBySkill = new Map(versions.map((v) => [v.skillId, v]));
		for (const skill of skills) {
			const version = versionBySkill.get(skill.id);
			if (!version) continue;
			result.set(skill.id, { skill, version, files: files.get(version.id) ?? [] });
		}
		return result;
	}

	/** The pinned version of every skill ref of one published agent version, keyed by ref id. */
	async findPinned(
		agentVersionId: string,
		trx?: EntityManager,
	): Promise<Map<string, ResolvedSkillRow>> {
		const manager = this.m(trx);
		const pins = await manager.find(AgentHistorySkill, { where: { agentVersionId } });
		const result = new Map<string, ResolvedSkillRow>();
		if (pins.length === 0) return result;
		const versions = await manager.find(SkillVersion, {
			where: { id: In(pins.map((p) => p.skillVersionId)) },
		});
		const skills = await manager.find(Skill, {
			where: { id: In([...new Set(versions.map((v) => v.skillId))]) },
		});
		const files = await this.filesFor(
			versions.map((v) => v.id),
			manager,
		);
		const versionById = new Map(versions.map((v) => [v.id, v]));
		const skillById = new Map(skills.map((s) => [s.id, s]));
		for (const pin of pins) {
			const version = versionById.get(pin.skillVersionId);
			const skill = version ? skillById.get(version.skillId) : undefined;
			if (!version || !skill) continue;
			result.set(pin.skillRefId, { skill, version, files: files.get(version.id) ?? [] });
		}
		return result;
	}

	/** Version rows by id, with their skill and files, keyed by version id. */
	async findVersionsByIds(
		versionIds: string[],
		trx?: EntityManager,
	): Promise<Map<string, ResolvedSkillRow>> {
		const result = new Map<string, ResolvedSkillRow>();
		if (versionIds.length === 0) return result;
		const manager = this.m(trx);
		const versions = await manager.find(SkillVersion, {
			where: { id: In([...new Set(versionIds)]) },
		});
		if (versions.length === 0) return result;
		const skills = await manager.find(Skill, {
			where: { id: In([...new Set(versions.map((v) => v.skillId))]) },
		});
		const files = await this.filesFor(
			versions.map((v) => v.id),
			manager,
		);
		const skillById = new Map(skills.map((s) => [s.id, s]));
		for (const version of versions) {
			const skill = skillById.get(version.skillId);
			if (!skill) continue;
			result.set(version.id, { skill, version, files: files.get(version.id) ?? [] });
		}
		return result;
	}

	/**
	 * The newest saved (numbered) version of each skill, with its files, keyed by skill
	 * id. This is what a following agent ref resolves to.
	 */
	async findLatestSavedVersions(
		skillIds: string[],
		trx?: EntityManager,
	): Promise<Map<string, ResolvedSkillRow>> {
		const result = new Map<string, ResolvedSkillRow>();
		const ids = [...new Set(skillIds)];
		if (ids.length === 0) return result;
		const manager = this.m(trx);
		const skills = await manager.find(Skill, { where: { id: In(ids) } });
		if (skills.length === 0) return result;
		const versions = await manager.find(SkillVersion, {
			where: { skillId: In(skills.map((s) => s.id)), version: Not(IsNull()) },
			order: { version: 'DESC' },
		});
		const latestBySkill = new Map<string, SkillVersion>();
		for (const version of versions) {
			if (!latestBySkill.has(version.skillId)) latestBySkill.set(version.skillId, version);
		}
		const files = await this.filesFor(
			[...latestBySkill.values()].map((v) => v.id),
			manager,
		);
		for (const skill of skills) {
			const version = latestBySkill.get(skill.id);
			if (!version) continue;
			result.set(skill.id, { skill, version, files: files.get(version.id) ?? [] });
		}
		return result;
	}

	/** Name and description of the latest saved version, without files: what a list or a search needs. */
	async findLatestVersionSummaries(
		skillIds: string[],
		trx?: EntityManager,
	): Promise<Map<string, { name: string; description: string }>> {
		const result = new Map<string, { name: string; description: string }>();
		const ids = [...new Set(skillIds)];
		if (ids.length === 0) return result;
		const versions = await this.m(trx).find(SkillVersion, {
			select: ['skillId', 'version', 'name', 'description'],
			where: { skillId: In(ids), version: Not(IsNull()) },
			order: { version: 'DESC' },
		});
		for (const version of versions) {
			if (!result.has(version.skillId)) {
				result.set(version.skillId, { name: version.name, description: version.description });
			}
		}
		return result;
	}

	/** The next version number for a skill: max saved version + 1, or 1. */
	async nextVersionNumber(skillId: string, trx?: EntityManager): Promise<number> {
		const row = await this.m(trx)
			.createQueryBuilder(SkillVersion, 'v')
			.select('MAX(v.version)', 'max')
			.where('v.skillId = :skillId', { skillId })
			.getRawOne<{ max: number | string | null }>();
		const max = row?.max === null || row?.max === undefined ? 0 : Number(row.max);
		return max + 1;
	}

	/** Every saved (numbered) version of a skill with its files, oldest first. */
	async findSavedVersions(skillId: string, trx?: EntityManager): Promise<ResolvedSkillRow[]> {
		const manager = this.m(trx);
		const skill = await manager.findOne(Skill, { where: { id: skillId } });
		if (!skill) return [];
		const versions = await manager
			.createQueryBuilder(SkillVersion, 'v')
			.where('v.skillId = :skillId AND v.version IS NOT NULL', { skillId })
			.orderBy('v.version', 'ASC')
			.getMany();
		const files = await this.filesFor(
			versions.map((v) => v.id),
			manager,
		);
		return versions.map((version) => ({ skill, version, files: files.get(version.id) ?? [] }));
	}

	async createSkill(
		skill: {
			id: string;
			target: SkillTarget;
			source: SkillSource;
			createdById: string | null;
		},
		content: SkillContent,
		trx?: EntityManager,
	): Promise<void> {
		const manager = this.m(trx);
		await manager.insert(Skill, {
			id: skill.id,
			userId: skill.target.userId,
			projectId: skill.target.projectId,
			source: skill.source,
			createdById: skill.createdById,
		});
		// Every skill has a saved version from the start: agents read versions only.
		await this.insertVersion(skill.id, null, content, skill.createdById, manager);
		await this.insertVersion(skill.id, 1, content, skill.createdById, manager);
	}

	/** Overwrites the draft row (name included) and its files. */
	async writeDraft(skillId: string, content: SkillContent, trx?: EntityManager): Promise<void> {
		const manager = this.m(trx);
		const draft = await manager.findOne(SkillVersion, {
			where: { skillId, version: IsNull() },
		});
		if (!draft) {
			await this.insertVersion(skillId, null, content, null, manager);
		} else {
			await manager.update(
				SkillVersion,
				{ id: draft.id },
				{
					name: content.name,
					description: content.description,
					instructions: content.instructions,
					frontmatter: content.frontmatter,
					contentHash: skillContentHash(content),
					updatedAt: new Date(),
				},
			);
			await manager.delete(SkillFile, { skillVersionId: draft.id });
			await this.insertFiles(draft.id, content.files, manager);
		}
		await manager.update(Skill, { id: skillId }, { updatedAt: new Date() });
	}

	async insertSavedVersion(
		skillId: string,
		version: number,
		content: SkillContent,
		createdById: string | null,
		trx?: EntityManager,
	): Promise<string> {
		return await this.insertVersion(skillId, version, content, createdById, this.m(trx));
	}

	async insertPins(
		pins: Array<{ agentVersionId: string; skillRefId: string; skillVersionId: string }>,
		trx?: EntityManager,
	): Promise<void> {
		if (pins.length === 0) return;
		await this.m(trx).insert(AgentHistorySkill, pins);
	}

	/**
	 * Replaces the agent's dependency rows with the given refs (only skills that exist).
	 * A ref with a `versionId` is recorded as pinned. When one skill appears in several
	 * refs, a following ref wins: the draft then reads the live draft row.
	 */
	async replaceDependencies(
		agentId: string,
		refs: SkillDependencyRef[],
		trx?: EntityManager,
	): Promise<void> {
		const manager = this.m(trx);
		const pinBySkill = new Map<string, string | null>();
		for (const ref of refs) {
			const current = pinBySkill.get(ref.skillId);
			if (current === null) continue;
			pinBySkill.set(ref.skillId, ref.versionId ?? null);
		}
		const existing = await this.findSkillsByIds([...pinBySkill.keys()], manager);
		await manager.delete(AgentSkillDependency, { agentId });
		if (existing.length > 0) {
			await manager.insert(
				AgentSkillDependency,
				existing.map((skill) => ({
					agentId,
					skillId: skill.id,
					skillVersionId: pinBySkill.get(skill.id) ?? null,
				})),
			);
		}
	}

	/**
	 * Agents whose draft follows the skill's live draft row, with their draft refs.
	 * Pinned drafts are left out: they read a saved version, so a change to the draft
	 * row (text or name) does not reach them.
	 */
	async findDependentAgents(
		skillId: string,
		trx?: EntityManager,
	): Promise<Array<Pick<Agent, 'id' | 'name' | 'schema'>>> {
		const manager = this.m(trx);
		const deps = await manager.find(AgentSkillDependency, {
			where: { skillId, skillVersionId: IsNull() },
		});
		if (deps.length === 0) return [];
		return await manager.find(Agent, {
			where: { id: In(deps.map((d) => d.agentId)) },
			select: ['id', 'name', 'schema'],
		});
	}

	/** Ids of the agents whose draft follows any of these skills' draft rows. */
	async findDependentAgentIds(skillIds: string[], trx?: EntityManager): Promise<string[]> {
		if (skillIds.length === 0) return [];
		const rows = await this.m(trx).find(AgentSkillDependency, {
			where: { skillId: In(skillIds), skillVersionId: IsNull() },
		});
		return [...new Set(rows.map((row) => row.agentId))];
	}

	/** "Used by": draft refs plus every pin, current or older. */
	async findUsage(skillId: string, trx?: EntityManager): Promise<SkillUsage> {
		const manager = this.m(trx);
		const deps = await manager.find(AgentSkillDependency, { where: { skillId } });
		const draftAgents = deps.length
			? await manager.find(Agent, {
					where: { id: In(deps.map((d) => d.agentId)) },
					select: ['id', 'name', 'projectId'],
				})
			: [];
		const versions = await manager.find(SkillVersion, { where: { skillId } });
		const savedById = new Map(
			versions.filter((v) => v.version !== null).map((v) => [v.id, v.version as number]),
		);
		const pins = savedById.size
			? await manager.find(AgentHistorySkill, {
					where: { skillVersionId: In([...savedById.keys()]) },
				})
			: [];
		const histories = pins.length
			? await manager.find(AgentHistory, {
					where: { versionId: In([...new Set(pins.map((p) => p.agentVersionId))]) },
					select: ['versionId', 'agentId'],
				})
			: [];
		const pinAgents = histories.length
			? await manager.find(Agent, {
					where: { id: In([...new Set(histories.map((h) => h.agentId))]) },
					select: ['id', 'name', 'activeVersionId'],
				})
			: [];
		const agentById = new Map(pinAgents.map((a) => [a.id, a]));
		const agentByVersion = new Map(histories.map((h) => [h.versionId, agentById.get(h.agentId)]));
		return {
			drafts: draftAgents.map((a) => ({
				agentId: a.id,
				agentName: a.name,
				projectId: a.projectId,
			})),
			pins: pins.flatMap((pin) => {
				const agent = agentByVersion.get(pin.agentVersionId);
				if (!agent) return [];
				return [
					{
						agentId: agent.id,
						agentName: agent.name,
						agentVersionId: pin.agentVersionId,
						version: savedById.get(pin.skillVersionId) ?? 0,
						isActive: agent.activeVersionId === pin.agentVersionId,
					},
				];
			}),
		};
	}

	/** Deletes the skill, its versions, and its files. Callers check usage first. */
	async deleteSkill(skillId: string, trx?: EntityManager): Promise<void> {
		await this.m(trx).delete(Skill, { id: skillId });
	}

	async countRows(skillId: string, trx?: EntityManager) {
		const manager = this.m(trx);
		const versions = await manager.find(SkillVersion, { where: { skillId } });
		return {
			skill: await manager.count(Skill, { where: { id: skillId } }),
			versions: versions.length,
			files: versions.length
				? await manager.count(SkillFile, {
						where: { skillVersionId: In(versions.map((v) => v.id)) },
					})
				: 0,
		};
	}

	private async insertVersion(
		skillId: string,
		version: number | null,
		content: SkillContent,
		createdById: string | null,
		manager: EntityManager,
	): Promise<string> {
		const id = randomUUID();
		await manager.insert(SkillVersion, {
			id,
			skillId,
			version,
			name: content.name,
			description: content.description,
			instructions: content.instructions,
			frontmatter: content.frontmatter,
			contentHash: skillContentHash(content),
			createdById,
		});
		await this.insertFiles(id, content.files, manager);
		return id;
	}

	private async insertFiles(
		skillVersionId: string,
		files: SkillContent['files'],
		manager: EntityManager,
	): Promise<void> {
		if (files.length === 0) return;
		await manager.insert(
			SkillFile,
			files.map((file, position) => ({
				skillVersionId,
				path: file.path,
				position,
				content: file.content,
				sizeBytes: Buffer.byteLength(file.content, 'utf8'),
			})),
		);
	}

	private async filesFor(
		versionIds: string[],
		manager: EntityManager,
	): Promise<Map<string, SkillFile[]>> {
		const result = new Map<string, SkillFile[]>();
		if (versionIds.length === 0) return result;
		const files = await manager.find(SkillFile, {
			where: { skillVersionId: In(versionIds) },
			order: { position: 'ASC' },
		});
		for (const file of files) {
			const list = result.get(file.skillVersionId) ?? [];
			list.push(file);
			result.set(file.skillVersionId, list);
		}
		return result;
	}
}
