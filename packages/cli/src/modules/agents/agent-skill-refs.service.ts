import type {
	AgentJsonSkillConfig,
	AgentSkill,
	AgentSkillAvailability,
	StoredAgentConfig,
} from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { deepCopy, UnexpectedError, UserError } from 'n8n-workflow';

import { SkillRepository } from '@/modules/skills/skill.repository';
import {
	SkillService,
	toAgentSkill,
	type SkillMoveOptions,
	type SkillRef,
} from '@/modules/skills/skill.service';
import { SkillsHubRollout } from '@/modules/skills/skills-hub-rollout';

import { AgentSkillUsageService } from './agent-skill-usage.service';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import { withoutLegacySkillRefs, type AgentSkillRefs } from './json-config/agent-document';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSkillRepository } from './repositories/agent-skill.repository';
import { getAgentSkillHash } from './utils/agent-config-hash';
import { getMissingSkillIds } from './utils/agent-missing-skill-ids';
import { generateAgentResourceId } from './utils/agent-resource-id';

/** The `agent_history` skill columns of one publish, and the hub versions to pin. */
export type PublishSnapshot = {
	schema: StoredAgentConfig | null;
	skills: Record<string, AgentSkill> | null;
	/** Hub skill version id for each skill ref, in draft order. Empty with the hub off. */
	pins: Map<string, string>;
};

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
 * With the skills hub on (`N8N_AGENTS_SKILLS_HUB_ENABLED`), the refs of a draft are the
 * `agent_skill_dependency` rows and the refs of a published version are the
 * `agent_version_skill_dependency` pins, in attach order. The skill bodies come
 * from the skills hub.
 *
 * With the skills hub off, the refs are the `skills` key of the stored `schema`
 * and the bodies are the `skills` column, as before the skills hub. A ref with
 * `enabled: false` is hidden. Its body stays in the `skills` column.
 */
@Service()
export class AgentSkillRefsService {
	constructor(
		private readonly skillRepository: SkillRepository,
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly skillService: SkillService,
		private readonly agentSkillUsage: AgentSkillUsageService,
		private readonly agentRepository: AgentRepository,
		private readonly rollout: SkillsHubRollout,
	) {}

	get usesSkillsHub(): boolean {
		return this.rollout.isEnabled;
	}

	/** Skill refs of the agent draft, in attach order. A pinned ref has `versionId`. */
	async refsForDraft(
		agent: Pick<Agent, 'id' | 'schema'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!this.usesSkillsHub) return readLegacyRefs(agent.schema);
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
		version: Pick<AgentHistory, 'versionId' | 'schema' | 'skills'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!this.usesSkillsHub) return readLegacyRefs(version.schema);
		const skillIds = await this.agentSkillRepository.findPinnedSkillIds(version.versionId, ctx);
		return toSkillRefs(skillIds.map((id) => ({ id })));
	}

	/** The refs of the agent draft and the skill bodies the draft runs. */
	async readDraft(
		agent: Pick<Agent, 'id' | 'schema' | 'skills' | 'updatedAt'>,
		ctx: OperationContext,
	): Promise<AgentSkillsSnapshot> {
		const skillRefs = await this.refsForDraft(agent, ctx);
		return { skillRefs, skills: await this.skillsForRefs(agent, skillRefs, ctx) };
	}

	/** The refs of one published agent version and the pinned skill bodies. */
	async readVersion(
		version: Pick<AgentHistory, 'versionId' | 'schema' | 'skills'>,
		ctx: OperationContext,
	): Promise<AgentSkillsSnapshot> {
		if (!this.usesSkillsHub) {
			const skillRefs = readLegacyRefs(version.schema);
			return { skillRefs, skills: pickBodies(version.skills ?? {}, skillRefs) };
		}
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
		agent: Pick<Agent, 'skills'>,
		skillRefs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<Record<string, AgentSkill>> {
		if (!skillRefs?.length) return {};
		if (!this.usesSkillsHub) return pickBodies(agent.skills ?? {}, skillRefs);
		return await this.skillService.resolveForAgentDraft(toServiceRefs(skillRefs), ctx);
	}

	async findOutdatedSkillIds(
		skillRefs: AgentJsonSkillConfig[],
		skills: Record<string, AgentSkill>,
		ctx: OperationContext,
	): Promise<string[]> {
		if (!this.usesSkillsHub) return [];
		const pinnedSkillIds = skillRefs.flatMap((ref) => (ref.versionId ? [ref.id] : []));
		const latestSkills = await this.skillsForRefs(
			{ skills: {} },
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
		agent: Pick<Agent, 'id' | 'projectId' | 'schema' | 'skills' | 'updatedAt'>,
		refs: AgentJsonSkillConfig[],
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!this.usesSkillsHub) {
			const existingIds = new Set(readLegacyRefs(agent.schema).map((ref) => ref.id));
			return refs.filter(
				(ref) => existingIds.has(ref.id) || Object.hasOwn(agent.skills ?? {}, ref.id),
			);
		}
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
		agent: Pick<Agent, 'id' | 'projectId' | 'schema' | 'skills' | 'updatedAt'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<void> {
		if (!agent.schema && refs?.length) {
			throw new UnexpectedError('Cannot set skill refs on an agent without a config');
		}
		if (!this.usesSkillsHub) {
			if (!agent.schema) return;
			const existingIds = new Set(readLegacyRefs(agent.schema).map((ref) => ref.id));
			const kept = (refs ?? []).filter(
				(ref) => existingIds.has(ref.id) || Object.hasOwn(agent.skills ?? {}, ref.id),
			);
			await this.writeLegacyDraft(agent, agent.schema, kept, agent.skills ?? {}, ctx);
			return;
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
		agent: Pick<Agent, 'id' | 'schema' | 'skills' | 'updatedAt'>,
		version: Pick<AgentHistory, 'versionId' | 'skills'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<void> {
		if (!this.usesSkillsHub) {
			if (!agent.schema) return;
			await this.writeLegacyDraft(
				agent,
				agent.schema,
				refs ?? [],
				deepCopy(version.skills ?? {}),
				ctx,
			);
			return;
		}
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
		agent: Pick<Agent, 'id' | 'schema'>,
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
	 * Create with a config (duplicate, import, eval seeding). A ref to a hub
	 * skill stays a ref. A ref to an agent skill of another agent in the same
	 * project gets a copy. A ref with a body but no hub skill gets a new agent
	 * skill. Both new skills belong to this agent only, so deleting the agent
	 * deletes them. A new skill gets a new id, and the ref points to it. A ref
	 * with neither is dropped, and so is a ref with only a body when no user
	 * creates the skill. The new skills need no skill scope: they are part of the
	 * agent, and the caller already checked the agent permission. Returns the refs
	 * that the draft now has.
	 */
	async createDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema' | 'skills' | 'updatedAt'>,
		refs: AgentSkillRefs,
		bodies: Record<string, AgentSkill>,
		creator: User | null,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!refs?.length) return [];
		if (!this.usesSkillsHub) {
			if (!agent.schema) return [];
			const kept = refs.filter((ref) => Object.hasOwn(bodies, ref.id));
			await this.writeLegacyDraft(agent, agent.schema, kept, pickBodies(bodies, kept), ctx);
			return readLegacyRefs(agent.schema);
		}
		const found = new Map(
			(
				await this.skillRepository.findByIds(
					refs.map((ref) => ref.id),
					ctx,
				)
			).map((skill) => [skill.id, skill]),
		);
		// Copy only the agent skills of agents in this project (a duplicate). Any other
		// agent skill stays a plain ref, so `checkRefs` refuses it without reading its body.
		const otherAgents = await this.agentSkillRepository.findAgents(
			[...found.values()].flatMap((skill) =>
				skill.agentId && skill.agentId !== agent.id ? [skill.agentId] : [],
			),
			ctx,
		);
		const otherAgentSkillIds = refs.flatMap((ref) => {
			const skill = found.get(ref.id);
			if (!skill?.agentId || skill.agentId === agent.id) return [];
			return otherAgents.get(skill.agentId)?.projectId === agent.projectId ? [ref.id] : [];
		});
		const otherAgentBodies =
			otherAgentSkillIds.length > 0
				? await this.skillService.resolveForAgentDraft(
						otherAgentSkillIds.map((id) => ({ id })),
						ctx,
					)
				: {};
		const next: AgentJsonSkillConfig[] = [];
		for (const ref of refs) {
			const skill = found.get(ref.id);
			const copiesAgentSkill = otherAgentSkillIds.includes(ref.id);
			if (skill && !copiesAgentSkill) {
				next.push({ type: 'skill', id: ref.id });
				continue;
			}
			const source = copiesAgentSkill ? otherAgentBodies : bodies;
			const body = Object.hasOwn(source, ref.id) ? source[ref.id] : undefined;
			// The new skill belongs to this agent only, so creating the agent is enough.
			if (!body || creator === null) continue;
			const id = await this.skillService.create(
				{
					// An inline body or a copy becomes a skill of this agent only, as the startup
					// copy does. It takes its project from the agent, and goes with the agent.
					target: { projectId: null, agentId: agent.id },
					skill: body,
					source: 'agent',
					createdById: creator.id,
				},
				ctx,
			);
			next.push({ type: 'skill', id });
		}
		await this.replaceDraftRefs(agent, next, ctx);
		return toSkillRefs(next);
	}

	async createSkills(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema' | 'skills' | 'updatedAt'>,
		skills: AgentSkill[],
		creatorId: string,
		availableTo: AgentSkillAvailability,
		ctx: OperationContext,
	): Promise<string[]> {
		if (!this.usesSkillsHub) {
			const bodies = { ...(agent.skills ?? {}) };
			const ids = skills.map((skill) => {
				const id = generateAgentResourceId('skill', Object.keys(bodies));
				bodies[id] = skill;
				return id;
			});
			agent.skills = bodies;
			await this.agentRepository.updateDraftSkills(agent, ctx);
			return ids;
		}
		const ids: string[] = [];
		for (const skill of skills) {
			ids.push(
				await this.skillService.create(
					{
						target: targetFor(agent, availableTo),
						skill,
						source: 'agent',
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
	 * What a publish writes to `agent_history`. Both settings write the legacy columns in
	 * full: the skill refs in `schema.skills` and their bodies in `skills`. With the skills
	 * hub on, the bodies are the versions the draft runs, so a published agent keeps
	 * running after the flag is turned off. `pins` are the hub versions to pin once the
	 * `agent_history` row exists (see `pinVersion`); empty with the hub off. Call it in
	 * the publish transaction: it takes the publish lock on the skills.
	 */
	async versionSnapshot(
		agent: Pick<Agent, 'id' | 'schema' | 'skills'>,
		ctx: OperationContext,
	): Promise<PublishSnapshot> {
		if (!agent.schema) return { schema: null, skills: null, pins: new Map() };
		if (!this.usesSkillsHub) {
			const skillRefs = readLegacyRefs(agent.schema);
			const skills = pickBodies(agent.skills ?? {}, skillRefs);
			const missing = getMissingSkillIds(skillRefs, skills);
			if (missing.length > 0) {
				throw new UserError(
					`Cannot publish agent with missing skill bodies: ${missing.join(', ')}`,
				);
			}
			return { schema: agent.schema, skills: deepCopy(skills), pins: new Map() };
		}
		const refs = await this.refsForDraft(agent, ctx);
		if (refs.length === 0) {
			return {
				schema: {
					...withoutLegacySkillRefs(agent.schema),
					skills: [],
				} as unknown as StoredAgentConfig,
				skills: {},
				pins: new Map(),
			};
		}
		const { skills, versionByRef } = await this.skillService.snapshotForPublish(
			toServiceRefs(refs),
			ctx,
		);
		const missing = refs.filter((ref) => !versionByRef.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing skills: ${missing.join(', ')}`);
		}
		const schema = {
			...withoutLegacySkillRefs(agent.schema),
			skills: refs.map(({ id }) => ({ type: 'skill', id })),
		} as unknown as StoredAgentConfig;
		return { schema, skills, pins: versionByRef };
	}

	/**
	 * Publish: pin each draft ref to the saved version it runs now. Call it in
	 * the publish transaction, after the `agent_history` row exists.
	 */
	/** Publish, after the `agent_history` row exists: pin the versions of `versionSnapshot`. */
	async pinVersion(
		agentVersionId: string,
		snapshot: PublishSnapshot,
		ctx: OperationContext,
	): Promise<void> {
		if (snapshot.pins.size === 0) return;
		await this.agentSkillUsage.pinForPublish(agentVersionId, snapshot.pins, ctx);
	}

	async availabilityOf(
		skillId: string,
		ctx: OperationContext,
	): Promise<AgentSkillAvailability | undefined> {
		const [skill] = await this.skillRepository.findByIds([skillId], ctx);
		if (!skill) return undefined;
		if (skill.agentId) return 'agent';
		return skill.projectId ? 'project' : 'instance';
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

	private async writeLegacyDraft(
		agent: Pick<Agent, 'id' | 'schema' | 'skills' | 'updatedAt'>,
		schema: StoredAgentConfig,
		refs: AgentJsonSkillConfig[],
		skills: Record<string, AgentSkill>,
		ctx: OperationContext,
	): Promise<void> {
		const { skills: _previous, ...rest } = schema;
		agent.schema = {
			...rest,
			skills: refs.map(({ id }) => ({ type: 'skill', id })),
		} as unknown as StoredAgentConfig;
		agent.skills = skills;
		await this.agentRepository.updateDraftSkills(agent, ctx);
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

function targetFor(agent: Pick<Agent, 'id' | 'projectId'>, availableTo: AgentSkillAvailability) {
	return {
		projectId: availableTo === 'project' ? agent.projectId : null,
		agentId: availableTo === 'agent' ? agent.id : null,
	};
}

function readLegacyRefs(schema: StoredAgentConfig | null): AgentJsonSkillConfig[] {
	const value: unknown = schema?.skills;
	if (!Array.isArray(value)) return [];
	return value.flatMap((ref: { id?: unknown; enabled?: unknown }) =>
		typeof ref?.id === 'string' && ref.enabled !== false
			? [{ type: 'skill' as const, id: ref.id }]
			: [],
	);
}

function pickBodies(
	bodies: Record<string, AgentSkill>,
	refs: AgentJsonSkillConfig[],
): Record<string, AgentSkill> {
	return Object.fromEntries(
		refs.flatMap((ref) => (Object.hasOwn(bodies, ref.id) ? [[ref.id, bodies[ref.id]]] : [])),
	);
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
