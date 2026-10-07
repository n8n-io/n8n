import type { AgentJsonConfig, AgentJsonSkillConfig, AgentSkill } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRelationRepository, ProjectRepository, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { UserError } from 'n8n-workflow';

import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import type { Skill } from '../entities/skill.entity';
import type { SkillFrontmatter } from '../entities/skill-version.entity';
import { AgentRepository } from '../repositories/agent.repository';
import {
	SkillHubRepository,
	type ResolvedSkillRow,
	type SkillContent,
	type SkillTarget,
	type SkillUsage,
} from '../repositories/skill-hub.repository';
import { skillContentHash } from './skill-content-hash';

export { skillContentHash };

/** The repository's opaque transaction handle, without importing the ORM here. */
type HubTransaction = Parameters<SkillHubRepository['findDrafts']>[1];

// ---------------------------------------------------------------- names

/**
 * The rule that makes two skill names "hard to tell apart" within one agent: case,
 * surrounding spaces, and runs of spaces, hyphens and underscores do not count. Kept
 * in one place so the rule can change.
 */
export function skillNameKey(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, ' ')
		.trim();
}

/**
 * Names in `added` that clash with a name in `existing` or with another added name.
 * Clashes among `existing` alone are allowed: agents keep the names they already had.
 */
export function findIntroducedNameClashes(existing: string[], added: string[]): string[] {
	const existingKeys = new Set(existing.map(skillNameKey));
	const seen = new Set<string>();
	const clashes: string[] = [];
	for (const name of added) {
		const key = skillNameKey(name);
		if (existingKeys.has(key) || seen.has(key)) clashes.push(name);
		seen.add(key);
	}
	return clashes;
}

/** Whether renaming a skill introduces a clash with the agent's other skill names. */
export function renameIntroducesClash(
	otherNames: string[],
	oldName: string,
	newName: string,
): boolean {
	const newKey = skillNameKey(newName);
	if (newKey === skillNameKey(oldName)) return false;
	return otherNames.some((name) => skillNameKey(name) === newKey);
}

/** Groups of names that clash with each other, as written. */
export function findNameClashGroups(names: string[]): string[][] {
	const byKey = new Map<string, string[]>();
	for (const name of names) {
		const key = skillNameKey(name);
		byKey.set(key, [...(byKey.get(key) ?? []), name]);
	}
	return [...byKey.values()].filter((group) => group.length > 1);
}

// ---------------------------------------------------------------- content

export function toSkillContent(skill: AgentSkill): SkillContent {
	return {
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		frontmatter: skill.allowedTools?.length
			? { 'allowed-tools': skill.allowedTools.join(' ') }
			: null,
		files: (skill.references ?? []).map(({ path, content }) => ({ path, content })),
	};
}

function contentOf(row: ResolvedSkillRow): SkillContent {
	return {
		name: row.version.name,
		description: row.version.description,
		instructions: row.version.instructions,
		frontmatter: row.version.frontmatter,
		files: row.files.map(({ path, content }) => ({ path, content })),
	};
}

function allowedToolsOf(frontmatter: SkillFrontmatter | null): string[] {
	const value = frontmatter?.['allowed-tools'];
	return typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];
}

/**
 * The AgentSkill shape the runtime, the snapshots, and the API use today. The name
 * comes from the version row: the draft's current name, or the published one.
 */
export function toAgentSkill(row: ResolvedSkillRow): AgentSkill {
	const allowedTools = allowedToolsOf(row.version.frontmatter);
	return {
		name: row.version.name,
		description: row.version.description,
		instructions: row.version.instructions,
		...(allowedTools.length ? { allowedTools } : {}),
		...(row.files.length
			? { references: row.files.map(({ path, content }) => ({ path, content })) }
			: {}),
	};
}

/**
 * The skills hub: resolves agent skill refs, enforces the attach rule, and keeps
 * versions and pins. The runtime loads skills by id with no caller permission check.
 */
@Service()
export class SkillHubService {
	constructor(
		private readonly logger: Logger,
		private readonly skillHubRepository: SkillHubRepository,
		private readonly agentRepository: AgentRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	// ---------------------------------------------------------------- reads

	/**
	 * The skill content an agent draft runs, keyed by ref id. Agents read saved versions
	 * only: the latest saved version for a following ref, the pinned version for a ref
	 * with `versionId` (set by a revert). A pin that does not resolve to a version of that
	 * skill falls back to the latest. The draft row is never run.
	 */
	async resolveDraftSkills(
		schema: AgentJsonConfig | null,
		trx?: HubTransaction,
	): Promise<Record<string, AgentSkill>> {
		const rows = await this.resolveDraftRows(schema, trx);
		return Object.fromEntries([...rows].map(([refId, row]) => [refId, toAgentSkill(row)]));
	}

	/**
	 * The editor's view of an agent's skills, keyed by ref id: the draft row of each
	 * skill, which autosave writes and Save turns into the next version.
	 */
	async resolveEditableSkills(
		schema: AgentJsonConfig | null,
		trx?: HubTransaction,
	): Promise<Record<string, AgentSkill>> {
		const refs = schema?.skills ?? [];
		const drafts = await this.skillHubRepository.findDrafts(
			refs.map((ref) => ref.id),
			trx,
		);
		const skills: Record<string, AgentSkill> = {};
		for (const ref of refs) {
			const row = drafts.get(ref.id);
			if (row) skills[ref.id] = toAgentSkill(row);
		}
		return skills;
	}

	private async resolveDraftRows(
		schema: AgentJsonConfig | null,
		trx?: HubTransaction,
	): Promise<Map<string, ResolvedSkillRow>> {
		const refs = schema?.skills ?? [];
		const latest = await this.skillHubRepository.findLatestSavedVersions(
			refs.map((ref) => ref.id),
			trx,
		);
		const pinnedIds = refs.flatMap((ref) => (ref.versionId ? [ref.versionId] : []));
		const pinned = pinnedIds.length
			? await this.skillHubRepository.findVersionsByIds(pinnedIds, trx)
			: new Map<string, ResolvedSkillRow>();
		const result = new Map<string, ResolvedSkillRow>();
		for (const ref of refs) {
			const version = ref.versionId ? pinned.get(ref.versionId) : undefined;
			const row = version && version.skill.id === ref.id ? version : latest.get(ref.id);
			if (row) result.set(ref.id, row);
		}
		return result;
	}

	/**
	 * Skills where the next publish moves the agent to a newer saved version that
	 * someone other than `userId` saved. A skill the published version did not have,
	 * or a ref reverted to an older version, is not listed.
	 */
	async changedByOthersSinceLastPublish(
		agent: Pick<Agent, 'schema' | 'activeVersionId'>,
		userId: string,
	): Promise<Array<{ id: string; name: string }>> {
		if (!agent.activeVersionId) return [];
		const [published, next] = await Promise.all([
			this.skillHubRepository.findPinned(agent.activeVersionId),
			this.resolveDraftRows(agent.schema),
		]);
		const ranges = new Map<string, { from: number; to: number; name: string }>();
		for (const [refId, row] of next) {
			const pinned = published.get(refId);
			if (!pinned || pinned.skill.id !== row.skill.id) continue;
			const from = pinned.version.version ?? 0;
			const to = row.version.version ?? 0;
			if (to > from) ranges.set(row.skill.id, { from, to, name: row.version.name });
		}
		if (ranges.size === 0) return [];
		const authors = await this.skillHubRepository.findSavedVersionAuthors([...ranges.keys()]);
		const changedByOthers = new Set(
			authors
				.filter((a) => {
					const range = ranges.get(a.skillId);
					return (
						range && a.version > range.from && a.version <= range.to && a.createdById !== userId
					);
				})
				.map((a) => a.skillId),
		);
		return [...ranges]
			.filter(([id]) => changedByOthers.has(id))
			.map(([id, { name }]) => ({ id, name }));
	}

	/** Pinned versions of one published agent version, keyed by the ref id in that snapshot. */
	async resolvePinnedSkills(
		agentVersionId: string,
		trx?: HubTransaction,
	): Promise<Record<string, AgentSkill>> {
		const rows = await this.skillHubRepository.findPinned(agentVersionId, trx);
		return Object.fromEntries([...rows].map(([refId, row]) => [refId, toAgentSkill(row)]));
	}

	async usedBy(skillId: string): Promise<SkillUsage> {
		return await this.skillHubRepository.findUsage(skillId);
	}

	/**
	 * Validation warnings for the agent draft's skills, the same text on every surface
	 * (REST validation and MCP validate_agent). Names that are hard to tell apart are a
	 * warning, not an error: agents keep the names they had before the skills hub.
	 */
	async validationWarnings(schema: AgentJsonConfig | null): Promise<string[]> {
		const skills = await this.resolveDraftSkills(schema);
		return findNameClashGroups(Object.values(skills).map((skill) => skill.name)).map(
			(group) =>
				`Skill names are hard to tell apart: "${group.join('", "')}". Consider renaming one.`,
		);
	}

	/** The names agents see: those of the latest saved versions. */
	private async skillNames(skillIds: string[], trx?: HubTransaction): Promise<Map<string, string>> {
		const rows = await this.skillHubRepository.findLatestSavedVersions([...new Set(skillIds)], trx);
		return new Map([...rows].map(([id, row]) => [id, row.version.name]));
	}

	// ---------------------------------------------------------------- scope

	/** Where skills created for an agent in this project live. */
	async targetForProject(projectId: string): Promise<SkillTarget> {
		const [project] = await this.projectRepository.findTypesByIds([projectId]);
		if (!project) throw new NotFoundError(`Project "${projectId}" not found`);
		if (project.type !== 'personal') return { userId: null, projectId };
		const [owner] = await this.projectRelationRepository.getPersonalProjectOwners([projectId]);
		// A personal project without an existing owner keeps project-scoped skills, so
		// its agents keep working. A relation can outlive its user when foreign keys were
		// not enforced.
		return owner?.user ? { userId: owner.userId, projectId: null } : { userId: null, projectId };
	}

	isAttachable(skill: Skill, target: SkillTarget): boolean {
		if (skill.userId === null && skill.projectId === null) return true;
		if (target.projectId !== null) return skill.projectId === target.projectId;
		return skill.userId === target.userId && skill.projectId === null;
	}

	/**
	 * Whether the user may change the skill's name or content. The check uses the
	 * skill's own scope, not the agent's: `projectSkill:update` on the project for a
	 * project skill, the global `skill:update` for an instance skill or another user's
	 * "Just you" skill. A "Just you" skill is always editable by its owner.
	 */
	async canEditSkill(user: User, skill: Skill): Promise<boolean> {
		if (skill.projectId) {
			return await userHasScopes(user, ['projectSkill:update'], false, {
				projectId: skill.projectId,
			});
		}
		if (skill.userId) return skill.userId === user.id || hasGlobalScope(user, 'skill:update');
		return hasGlobalScope(user, 'skill:update');
	}

	async assertCanEditSkills(user: User, skillIds: string[], trx?: HubTransaction): Promise<void> {
		const ids = [...new Set(skillIds)];
		const skills = await this.skillHubRepository.findSkillsByIds(ids, trx);
		const names = await this.skillNames(ids, trx);
		const denied: string[] = [];
		for (const skill of skills) {
			if (!(await this.canEditSkill(user, skill))) {
				denied.push(`"${names.get(skill.id) ?? skill.id}" (${skill.id})`);
			}
		}
		if (denied.length > 0) {
			throw new ForbiddenError(
				`You can use but not edit ${denied.join(', ')}. Ask someone who can edit ${
					denied.length > 1 ? 'these skills' : 'this skill'
				}, or detach it from this agent.`,
			);
		}
	}

	/**
	 * The attach checks of a config save: unknown ids keep today's behavior (dropped
	 * unless disabled or already attached); a new ref to a skill outside the agent's
	 * scope is rejected; a new ref whose name clashes with the agent's skills is
	 * rejected. Clashes the agent already had are kept.
	 */
	async filterAndCheckRefs(
		agent: Agent,
		refs: AgentJsonSkillConfig[],
	): Promise<AgentJsonSkillConfig[]> {
		const existingRefs = agent.schema?.skills ?? [];
		const existingRefIds = new Set(existingRefs.map((ref) => ref.id));
		const existingPins = new Map(
			existingRefs.flatMap((ref) => (ref.versionId ? [[ref.id, ref.versionId] as const] : [])),
		);
		const skills = new Map(
			(await this.skillHubRepository.findSkillsByIds(refs.map((ref) => ref.id))).map((skill) => [
				skill.id,
				skill,
			]),
		);
		// Only a revert sets a pin. A save keeps the pin the ref already had, or clears it
		// ("Use current version"); it cannot pin a ref to some other version.
		const kept = refs
			.filter((ref) => ref.enabled === false || existingRefIds.has(ref.id) || skills.has(ref.id))
			.map((ref) => {
				if (ref.versionId === undefined) return ref;
				if (existingPins.get(ref.id) === ref.versionId) return ref;
				const { versionId: _dropped, ...following } = ref;
				return following;
			});
		const newIds = [...new Set(kept.map((ref) => ref.id))].filter(
			(id) => !existingRefIds.has(id) && skills.has(id),
		);
		if (newIds.length === 0) return kept;

		const target = await this.targetForProject(agent.projectId);
		const names = await this.skillNames([...existingRefIds, ...newIds]);
		for (const id of newIds) {
			const skill = skills.get(id);
			if (skill && !this.isAttachable(skill, target)) {
				throw new UserError(
					`Skill "${names.get(id) ?? id}" (${id}) is not available to this agent. An agent can use skills of its own project (or its owner's "Just you" skills in a personal project) and instance skills.`,
				);
			}
		}
		const keptIds = new Set(kept.map((ref) => ref.id));
		const nameOf = (id: string) => (names.has(id) ? [names.get(id) as string] : []);
		const clashes = findIntroducedNameClashes(
			[...existingRefIds].filter((id) => keptIds.has(id)).flatMap(nameOf),
			newIds.flatMap(nameOf),
		);
		if (clashes.length > 0) {
			throw new UserError(
				`This agent already has a skill with a name like "${clashes.join('", "')}". Rename one of them, or detach the other skill first.`,
			);
		}
		return kept;
	}

	async refreshDependencies(agent: Pick<Agent, 'id' | 'schema'>, trx?: HubTransaction) {
		await this.skillHubRepository.replaceDependencies(
			agent.id,
			(agent.schema?.skills ?? []).map((ref) => ({ skillId: ref.id, versionId: ref.versionId })),
			trx,
		);
	}

	/** Drops the pin from this agent's ref to the skill, so the draft follows the live row again. */
	clearPin(schema: AgentJsonConfig | null, skillId: string): boolean {
		const ref = schema?.skills?.find((candidate) => candidate.id === skillId);
		if (!ref?.versionId) return false;
		delete ref.versionId;
		return true;
	}

	// ---------------------------------------------------------------- writes

	/** Creates a skill in the agent's scope. The name is kept exactly as given. */
	async createSkillForAgent(
		projectId: string,
		skill: AgentSkill,
		createdById: string | null,
		trx?: HubTransaction,
		preferredId?: string,
	): Promise<{ id: string; name: string }> {
		const target = await this.targetForProject(projectId);
		let id = preferredId ?? `skill_${generateNanoId()}`;
		while ((await this.skillHubRepository.findSkillsByIds([id], trx)).length > 0) {
			id = `skill_${generateNanoId()}`;
		}
		await this.skillHubRepository.createSkill(
			{ id, target, source: 'agent', createdById },
			toSkillContent(skill),
			trx,
		);
		return { id, name: skill.name };
	}

	/**
	 * Overwrites the draft row (autosave). No agent reads it, so nothing is marked as
	 * changed and no name check runs here; both happen at Save.
	 */
	async writeDraft(skillId: string, skill: AgentSkill, trx?: HubTransaction): Promise<void> {
		const current = (await this.skillHubRepository.findDrafts([skillId], trx)).get(skillId);
		if (!current) throw new NotFoundError('Skill not found');
		if (trx) await this.skillHubRepository.lockSkills([skillId], 'edit', trx);
		await this.skillHubRepository.writeDraft(skillId, toSkillContent(skill), trx);
	}

	/**
	 * Save: copies the draft row into the next saved version, unless the draft has the
	 * same content hash as the latest version. A new name may not introduce a clash in
	 * an agent that follows the skill. Returns the version the skill's followers now
	 * read and whether it is new.
	 */
	async saveVersion(
		skillId: string,
		createdById: string | null,
		trx: HubTransaction,
	): Promise<{ versionId: string; version: number; created: boolean }> {
		if (trx) await this.skillHubRepository.lockSkills([skillId], 'edit', trx);
		const draft = (await this.skillHubRepository.findDrafts([skillId], trx)).get(skillId);
		if (!draft) throw new NotFoundError('Skill not found');
		const latest = (await this.skillHubRepository.findLatestSavedVersions([skillId], trx)).get(
			skillId,
		);
		if (latest && latest.version.contentHash === draft.version.contentHash) {
			return { versionId: latest.version.id, version: latest.version.version ?? 0, created: false };
		}
		if (latest && latest.version.name !== draft.version.name) {
			await this.assertRenameKeepsAgentNamesApart(
				skillId,
				latest.version.name,
				draft.version.name,
				[],
				trx,
			);
		}
		const version = await this.skillHubRepository.nextVersionNumber(skillId, trx);
		const versionId = await this.skillHubRepository.insertSavedVersion(
			skillId,
			version,
			contentOf(draft),
			createdById,
			trx,
		);
		return { versionId, version, created: true };
	}

	private async assertRenameKeepsAgentNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		excludeAgentIds: string[],
		trx?: HubTransaction,
	): Promise<void> {
		const exclude = new Set(excludeAgentIds);
		const agents = (await this.skillHubRepository.findDependentAgents(skillId, trx)).filter(
			(agent) => !exclude.has(agent.id),
		);
		const otherIds = agents.flatMap((agent) =>
			(agent.schema?.skills ?? []).map((ref) => ref.id).filter((id) => id !== skillId),
		);
		const names = await this.skillNames(otherIds, trx);
		const clashing = agents.filter((agent) =>
			renameIntroducesClash(
				(agent.schema?.skills ?? [])
					.filter((ref) => ref.id !== skillId)
					.flatMap((ref) => (names.has(ref.id) ? [names.get(ref.id) as string] : [])),
				oldName,
				newName,
			),
		);
		if (clashing.length > 0) {
			throw new UserError(
				`Cannot rename to "${newName}": ${clashing.map((a) => a.name).join(', ')} already ${
					clashing.length > 1 ? 'use' : 'uses'
				} a skill with a name like that.`,
			);
		}
	}

	/**
	 * After a skill edit: every dependent agent that is in sync with its published
	 * version gets a new draft version id, in the caller's transaction, with one
	 * conditional UPDATE each (see `AgentRepository.markDraftChangedIfInSync`). Agents
	 * that already have unpublished changes are not written.
	 */
	async markDependentsDirty(
		skillIds: string[],
		excludeAgentIds: string[],
		trx: HubTransaction,
		alsoAgentIds: string[] = [],
	): Promise<{ dependents: string[]; written: string[] }> {
		const dependents = [
			...new Set([
				...(await this.skillHubRepository.findDependentAgentIds(skillIds, trx)),
				...alsoAgentIds,
			]),
		];
		const exclude = new Set(excludeAgentIds);
		const written = await this.agentRepository.markDraftChangedIfInSync(
			dependents.filter((id) => !exclude.has(id)),
			trx,
		);
		return { dependents, written };
	}

	async clearRuntimes(agentIds: string[]): Promise<void> {
		const { AgentRuntimeCacheService } = await import('../agent-runtime-cache.service.js');
		const cache = Container.get(AgentRuntimeCacheService);
		for (const agentId of agentIds) cache.clearRuntimes(agentId);
	}

	/**
	 * Publish step 1: the version each ref (disabled refs too) resolves to, so step 2
	 * can pin it. A following ref resolves to the latest saved version, a pinned ref to
	 * its version. Publish creates no skill version. Returns the snapshot for
	 * `agent_history.skills` and the version to pin per ref.
	 */
	async snapshotForPublish(
		schema: AgentJsonConfig | null,
		trx: HubTransaction,
	): Promise<{ skills: Record<string, AgentSkill>; versionByRef: Map<string, string> }> {
		const refIds = [...new Set((schema?.skills ?? []).map((ref) => ref.id))];
		if (trx) await this.skillHubRepository.lockSkills(refIds, 'publish', trx);
		const rows = await this.resolveDraftRows(schema, trx);
		const skills: Record<string, AgentSkill> = {};
		const versionByRef = new Map<string, string>();
		for (const refId of refIds) {
			const row = rows.get(refId);
			if (!row) continue;
			versionByRef.set(refId, row.version.id);
			skills[refId] = toAgentSkill(row);
		}
		return { skills, versionByRef };
	}

	/** Publish step 2, after the agent_history row exists. */
	async pinForPublish(
		agentVersionId: string,
		versionByRef: Map<string, string>,
		trx: HubTransaction,
	): Promise<void> {
		await this.skillHubRepository.insertPins(
			[...versionByRef].map(([skillRefId, skillVersionId]) => ({
				agentVersionId,
				skillRefId,
				skillVersionId,
			})),
			trx,
		);
	}

	/**
	 * Revert: the agent gets back the exact skill versions it had. Each ref in the
	 * restored schema is mapped to its hub skill id through the pins and pinned to that
	 * version (`versionId`). No skill row is written, so other agents that share a skill
	 * are not affected and no skill permission is needed: the pinned name and text were
	 * already valid on this agent when it was published. A ref the snapshot never pinned
	 * (a missing body at publish time) follows the draft row, as before.
	 */
	async restoreFromVersion(
		history: AgentHistory,
		schema: AgentJsonConfig | null,
		trx?: HubTransaction,
	): Promise<{ schema: AgentJsonConfig | null }> {
		const pinned = await this.skillHubRepository.findPinned(history.versionId, trx);
		if (schema?.skills) {
			schema.skills = schema.skills.map((ref) => {
				const row = pinned.get(ref.id);
				if (!row) {
					const { versionId: _dropped, ...following } = ref;
					return following;
				}
				return { ...ref, id: row.skill.id, versionId: row.version.id };
			});
		}
		return { schema };
	}

	/**
	 * Agent create with a config (the "Duplicate agent" path, eval seeding): refs to
	 * existing hub skills are kept, so a duplicate uses the same skills, and their bodies
	 * in the payload are ignored. A ref with a body but no hub skill gets a new skill
	 * with that id in the agent's scope.
	 */
	async prepareSkillRefsForCreate(
		projectId: string,
		schema: AgentJsonConfig,
		bodies: Record<string, AgentSkill>,
		createdById: string | null,
	): Promise<{ createdSkillIds: string[] }> {
		const refIds = [...new Set((schema.skills ?? []).map((ref) => ref.id))];
		const existing = new Map(
			(await this.skillHubRepository.findSkillsByIds(refIds)).map((skill) => [skill.id, skill]),
		);
		const target = await this.targetForProject(projectId);
		const createdSkillIds: string[] = [];
		for (const refId of refIds) {
			const skill = existing.get(refId);
			if (skill) {
				if (!this.isAttachable(skill, target)) {
					throw new UserError(`Skill ${skill.id} is not available to this agent.`);
				}
				continue;
			}
			const body = bodies[refId];
			if (!body) continue;
			await this.createSkillForAgent(projectId, body, createdById, undefined, refId);
			createdSkillIds.push(refId);
		}
		return { createdSkillIds };
	}

	/** Deletes a skill nobody uses. A draft ref or any pin, current or older, blocks it. */
	async deleteSkill(skillId: string): Promise<void> {
		const [skill] = await this.skillHubRepository.findSkillsByIds([skillId]);
		if (!skill) throw new NotFoundError('Skill not found');
		const name = (await this.skillNames([skillId])).get(skillId) ?? skillId;
		const usage = await this.skillHubRepository.findUsage(skillId);
		if (usage.drafts.length > 0 || usage.pins.length > 0) {
			const users = [
				...usage.drafts.map((d) => `${d.agentName} (draft)`),
				...usage.pins.map(
					(p) => `${p.agentName} (published v${p.version}${p.isActive ? ', current' : ''})`,
				),
			];
			throw new ConflictError(
				`Skill "${name}" is used by ${[...new Set(users)].join(', ')} and cannot be deleted.`,
			);
		}
		await this.skillHubRepository.deleteSkill(skillId);
		this.logger.debug('Deleted hub skill', { skillId });
	}
}
