import type {
	AgentJsonSkillConfig,
	AgentSkill,
	AgentSkillAvailability,
	SkillSource,
} from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { scopeOf } from '@/modules/skills/skill.entity';
import { SkillRepository } from '@/modules/skills/skill.repository';
import {
	SkillService,
	toAgentSkill,
	type SkillMoveOptions,
	type SkillRef,
} from '@/modules/skills/skill.service';

import { AgentSkillUsageService } from './agent-skill-usage.service';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import type { AgentSkillRefs } from './json-config/agent-document';
import { AgentSkillRepository } from './repositories/agent-skill.repository';
import { getAgentSkillHash } from './utils/agent-config-hash';

/** Skill refs and the skill bodies they resolve to, keyed by skill id. */
export interface AgentSkillsSnapshot {
	skillRefs: AgentJsonSkillConfig[];
	skills: Record<string, AgentSkill>;
}

/**
 * The one seam for the skill refs of an agent draft and of a published agent
 * version, and for the skill bodies they resolve to. All other code reads and
 * writes skill refs through this service.
 *
 * The refs of a draft are the `agent_skill_dependency` rows. The refs of a
 * published version are the `agent_version_skill_dependency` pins, in attach
 * order. The skill bodies come from the skills hub.
 */
@Service()
export class AgentSkillRefsService {
	constructor(
		private readonly skillRepository: SkillRepository,
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly skillService: SkillService,
		private readonly agentSkillUsage: AgentSkillUsageService,
	) {}

	/** Skill refs of the agent draft, in attach order. A pinned ref has `versionId`. */
	async refsForDraft(
		agent: Pick<Agent, 'id'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const rows =
			(await this.agentSkillRepository.findDependencies([agent.id], ctx)).get(agent.id) ?? [];
		return toSkillRefs(
			rows.map(({ skillId, versionId }) => ({ id: skillId, ...(versionId ? { versionId } : {}) })),
		);
	}

	/**
	 * Skill refs of one published agent version, in the order of the draft at
	 * publish. Every ref of a version is pinned, so the refs carry no `versionId`.
	 */
	async refsForVersion(
		version: Pick<AgentHistory, 'versionId'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const skillIds = await this.agentSkillRepository.findPinnedSkillIds(version.versionId, ctx);
		return toSkillRefs(skillIds.map((id) => ({ id })));
	}

	/** The refs of the agent draft and the skill bodies the draft runs. */
	async readDraft(agent: Pick<Agent, 'id'>, ctx: OperationContext): Promise<AgentSkillsSnapshot> {
		const skillRefs = await this.refsForDraft(agent, ctx);
		return { skillRefs, skills: await this.skillsForRefs(skillRefs, ctx) };
	}

	/** The refs of one published agent version and the pinned skill bodies. */
	async readVersion(
		version: Pick<AgentHistory, 'versionId'>,
		ctx: OperationContext,
	): Promise<AgentSkillsSnapshot> {
		const pinned = await this.agentSkillRepository.findPinned(version.versionId, ctx);
		const skillRefs = toSkillRefs([...pinned.keys()].map((id) => ({ id })));
		const skills = Object.fromEntries(
			[...pinned].map(([skillId, row]) => [skillId, toAgentSkill(row)]),
		);
		return { skillRefs, skills };
	}

	/**
	 * The skill bodies that these draft refs run, keyed by skill id: the pinned
	 * version of a ref with `versionId`, else the latest saved version.
	 */
	async skillsForRefs(
		skillRefs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<Record<string, AgentSkill>> {
		if (!skillRefs?.length) return {};
		return await this.skillService.resolveForAgentDraft(toServiceRefs(skillRefs), ctx);
	}

	async findOutdatedSkillIds(
		skillRefs: AgentJsonSkillConfig[],
		skills: Record<string, AgentSkill>,
		ctx: OperationContext,
	): Promise<string[]> {
		const pinnedSkillIds = skillRefs.flatMap((ref) => (ref.versionId ? [ref.id] : []));
		const latestSkills = await this.skillsForRefs(
			pinnedSkillIds.map((id) => ({ type: 'skill', id })),
			ctx,
		);
		return pinnedSkillIds.filter((id) => {
			const latest = latestSkills[id];
			const pinned = skills[id];
			return (
				latest !== undefined &&
				pinned !== undefined &&
				getAgentSkillHash(latest) !== getAgentSkillHash(pinned)
			);
		});
	}

	/**
	 * The refs that `replaceDraftRefs` would keep, without writing them: unknown ids
	 * are dropped, and a new ref that the agent may not attach throws. Callers use it
	 * to validate and report the refs that are saved, not the submitted ones.
	 */
	async effectiveDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId'>,
		refs: AgentJsonSkillConfig[],
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const checked = await this.agentSkillUsage.checkRefs(
			{ id: agent.id, projectId: agent.projectId },
			toServiceRefs(refs),
			ctx,
		);
		return toSkillRefs(checked);
	}

	/**
	 * Replace the skill refs of the agent draft. Call it in the same transaction
	 * as `saveAgentDraftFenced`, with the same `ctx`, after the fenced save.
	 * A new ref must be attachable to the agent and must not clash by name. A ref
	 * keeps its pin only when the draft already has that pin.
	 */
	async replaceDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<void> {
		if (!agent.schema && refs?.length) {
			throw new UnexpectedError('Cannot set skill refs on an agent without a config');
		}
		const checked = await this.agentSkillUsage.checkRefs(
			{ id: agent.id, projectId: agent.projectId },
			toServiceRefs(refs ?? []),
			ctx,
		);
		await this.writeDependencies(agent.id, checked, ctx);
	}

	/**
	 * Revert: set the refs of the agent draft to the refs of a published version,
	 * each pinned to the version that the published version ran. This writes no
	 * skill row and needs no skill permission.
	 */
	async restoreDraftRefs(
		agent: Pick<Agent, 'id'>,
		version: Pick<AgentHistory, 'versionId'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<void> {
		const restored = await this.agentSkillUsage.restoreFromVersion(
			version.versionId,
			toServiceRefs(refs ?? []),
			ctx,
		);
		await this.writeDependencies(agent.id, restored, ctx);
	}

	/**
	 * Remove the pin of one draft ref, so the draft follows the latest saved
	 * version of the skill. A save of the skill from this agent calls it.
	 */
	async unpinDraftRef(
		agent: Pick<Agent, 'id'>,
		skillId: string,
		ctx: OperationContext,
	): Promise<void> {
		const refs = await this.refsForDraft(agent, ctx);
		await this.writeDependencies(
			agent.id,
			refs.map(({ id, versionId }) => (id === skillId || !versionId ? { id } : { id, versionId })),
			ctx,
		);
	}

	/**
	 * Create with a config (duplicate, import, eval seeding). A ref to a hub skill
	 * stays a ref. A ref with a body but no hub skill gets a new skill in the agent's
	 * project, with a free name there. The ref points to the new id. A ref with
	 * neither is dropped, and so is a ref with only a body when no user creates the
	 * skill. The new skills belong to the project, so the user needs the skill create
	 * permission there. Returns the refs that the draft now has.
	 */
	async createDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		bodies: Record<string, AgentSkill>,
		creator: User | null,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!refs?.length) return [];
		const found = new Set(
			(
				await this.skillRepository.findByIds(
					refs.map((ref) => ref.id),
					ctx,
				)
			).map((skill) => skill.id),
		);
		const target = { projectId: agent.projectId };
		const toCreate = refs.flatMap((ref) => {
			const body = Object.hasOwn(bodies, ref.id) ? bodies[ref.id] : undefined;
			return !found.has(ref.id) && body && creator !== null
				? [{ refId: ref.id, body, createdById: creator.id }]
				: [];
		});
		if (creator !== null && toCreate.length > 0) {
			await this.skillService.assertCanCreate(creator, target);
		}
		// A new name must also differ from the skills this draft keeps referring to.
		const keptNames =
			toCreate.length > 0
				? [...(await this.skillRepository.findLatestSummaries([...found], ctx)).values()].map(
						({ name }) => name,
					)
				: [];
		const names = await this.skillService.freeNames(
			toCreate.map(({ body }) => body.name),
			target,
			ctx,
			keptNames,
		);
		const createdIds = new Map<string, string>();
		for (const [index, { refId, body, createdById }] of toCreate.entries()) {
			const id = await this.skillService.create(
				{
					target,
					skill: { ...body, name: names[index] },
					source: 'agent',
					createdById,
				},
				ctx,
			);
			createdIds.set(refId, id);
		}
		const next: AgentJsonSkillConfig[] = refs.flatMap((ref) => {
			const id = found.has(ref.id) ? ref.id : createdIds.get(ref.id);
			return id ? [{ type: 'skill' as const, id }] : [];
		});
		await this.replaceDraftRefs(agent, next, ctx);
		return toSkillRefs(next);
	}

	/**
	 * Applies the skills of an agent package. Each skill keeps its id and belongs to the
	 * agent's project. A skill that the project has already gets the package content, so
	 * the user needs the edit permission on it. A new skill needs the create permission.
	 */
	async importDraftSkills(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		bodies: Record<string, AgentSkill>,
		user: User,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const imported: AgentJsonSkillConfig[] = [];
		const ids = (refs ?? []).map(({ id }) => id);
		await this.skillRepository.lockForEdit(ids, ctx);
		const existing = new Map(
			(await this.skillRepository.findByIds(ids, ctx)).map((skill) => [skill.id, skill]),
		);
		const target = { projectId: agent.projectId };
		for (const skill of existing.values()) {
			if (skill.projectId !== target.projectId) {
				throw new ConflictError('Imported skill ID belongs to another project or scope');
			}
		}
		if (existing.size > 0) await this.skillService.assertCanEdit(user, [...existing.keys()], ctx);
		if (ids.some((id) => !existing.has(id))) await this.skillService.assertCanCreate(user, target);
		// Detach old refs to prevent partial Agent snapshots during skill saves.
		await this.writeDependencies(agent.id, [], ctx);
		for (const ref of refs ?? []) {
			const skill = existing.get(ref.id);
			if (skill) {
				const current = await this.skillsForRefs([{ type: 'skill', id: ref.id }], ctx);
				await this.skillService.save(
					ref.id,
					{
						...bodies[ref.id],
						references: bodies[ref.id].references ?? [],
						baseSkillHash: getAgentSkillHash(current[ref.id]),
					},
					user.id,
					ctx,
				);
			} else {
				await this.skillService.create(
					{
						id: ref.id,
						target,
						skill: bodies[ref.id],
						source: 'agent',
						createdById: user.id,
					},
					ctx,
				);
			}
			imported.push({ type: 'skill', id: ref.id });
		}
		await this.replaceDraftRefs(agent, imported, ctx);
		return imported;
	}

	async createSkills(
		agent: Pick<Agent, 'id' | 'projectId'>,
		skills: AgentSkill[],
		creatorId: string,
		availableTo: AgentSkillAvailability,
		source: SkillSource,
		ctx: OperationContext,
	): Promise<string[]> {
		const ids: string[] = [];
		for (const skill of skills) {
			ids.push(
				await this.skillService.create(
					{
						target: targetFor(agent, availableTo),
						skill,
						source,
						createdById: creatorId,
						checkNameTaken: true,
					},
					ctx,
				),
			);
		}
		return ids;
	}

	/**
	 * The hub version id of each draft ref, keyed by skill id, in draft order. Pin
	 * the versions once the `agent_history` row exists (see `pinVersion`). Call it in
	 * the transaction that saves the draft.
	 */
	async versionSnapshot(
		agent: Pick<Agent, 'id' | 'schema'>,
		ctx: OperationContext,
	): Promise<Map<string, string>> {
		if (!agent.schema) return new Map();
		const refs = await this.refsForDraft(agent, ctx);
		if (refs.length === 0) return new Map();
		const versionByRef = await this.skillService.snapshotForSave(toServiceRefs(refs), ctx);
		const missing = refs.filter((ref) => !versionByRef.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot save agent with missing skills: ${missing.join(', ')}`);
		}
		return versionByRef;
	}

	/** Pin the resolved skills after the history row exists, in the same transaction. */
	async pinVersion(
		agentVersionId: string,
		pins: Map<string, string>,
		ctx: OperationContext,
	): Promise<void> {
		if (pins.size === 0) return;
		await this.agentSkillUsage.pinForPublish(agentVersionId, pins, ctx);
	}

	async assertVersionAccess(
		agent: Pick<Agent, 'id' | 'projectId'>,
		version: AgentHistory,
		ctx: OperationContext,
	): Promise<void> {
		await this.agentSkillUsage.assertVersionAccess(
			agent,
			await this.refsForVersion(version, ctx),
			ctx,
		);
	}

	async availabilityOf(
		skillId: string,
		ctx: OperationContext,
	): Promise<AgentSkillAvailability | undefined> {
		const [skill] = await this.skillRepository.findByIds([skillId], ctx);
		if (!skill) return undefined;
		return scopeOf(skill);
	}

	async setAvailability(
		agent: Pick<Agent, 'id' | 'projectId'>,
		skillId: string,
		availableTo: AgentSkillAvailability,
		ctx: OperationContext,
		options: SkillMoveOptions = {},
	): Promise<void> {
		await this.skillService.changeTarget(
			skillId,
			targetFor(agent, availableTo),
			agent.id,
			ctx,
			options,
		);
	}

	private async writeDependencies(
		agentId: string,
		refs: SkillRef[],
		ctx: OperationContext,
	): Promise<void> {
		await this.agentSkillRepository.replaceDependencies(
			agentId,
			refs.map((ref) => ({ skillId: ref.id, versionId: ref.versionId ?? null })),
			ctx,
		);
	}
}

function targetFor(agent: Pick<Agent, 'projectId'>, availableTo: AgentSkillAvailability) {
	return { projectId: availableTo === 'project' ? agent.projectId : null };
}

function toServiceRefs(refs: AgentJsonSkillConfig[]): SkillRef[] {
	return refs.map(({ id, versionId }) => (versionId ? { id, versionId } : { id }));
}

function toSkillRefs(refs: Array<{ id: string; versionId?: string }>): AgentJsonSkillConfig[] {
	return refs.map(({ id, versionId }) => ({
		type: 'skill' as const,
		id,
		...(versionId ? { versionId } : {}),
	}));
}
