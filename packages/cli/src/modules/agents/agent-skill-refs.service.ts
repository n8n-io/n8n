import type { AgentJsonSkillConfig, AgentSkill } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';

import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import type { AgentSkillRefs } from './json-config/agent-document';
import { SkillRepository } from './repositories/skill.repository';
import { SkillService, toAgentSkill, type SkillRef } from './skills/skill.service';
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
 * published version are the `agent_history_skill` pins. Both are in attach
 * order. The skill bodies come from the skills hub. The stored `schema` JSON
 * holds no skill refs.
 */
@Service()
export class AgentSkillRefsService {
	constructor(
		private readonly skillRepository: SkillRepository,
		private readonly skillService: SkillService,
	) {}

	/** Skill refs of the agent draft, in attach order. A pinned ref has `versionId`. */
	async refsForDraft(
		agent: Pick<Agent, 'id'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const rows = (await this.skillRepository.findDependencies([agent.id], ctx)).get(agent.id) ?? [];
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
		return (await this.readVersion(version, ctx)).skillRefs;
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
		const pinned = await this.skillRepository.findPinned(version.versionId, ctx);
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
		const checked = await this.skillService.checkRefs(
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
		const restored = await this.skillService.restoreFromVersion(
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
	 * Create with a config (duplicate, import, eval seeding). A ref to a hub
	 * skill stays a ref. A ref with a body but no hub skill gets a new hub skill
	 * in the agent's project, and the ref then points to the new id. A ref with
	 * neither is dropped, and so is a ref with only a body when no user creates
	 * the skill. Returns the refs that the draft now has.
	 */
	async createDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		bodies: Record<string, AgentSkill>,
		createdById: string | null,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!refs?.length) return [];
		const known = new Set(
			(
				await this.skillRepository.findByIds(
					refs.map((ref) => ref.id),
					ctx,
				)
			).map((skill) => skill.id),
		);
		const next: AgentJsonSkillConfig[] = [];
		for (const ref of refs) {
			if (known.has(ref.id)) {
				next.push({ type: 'skill', id: ref.id });
				continue;
			}
			const body = Object.hasOwn(bodies, ref.id) ? bodies[ref.id] : undefined;
			if (!body || createdById === null) continue;
			const id = await this.skillService.create(
				{
					target: { userId: null, projectId: agent.projectId },
					skill: body,
					source: 'agent',
					createdById,
				},
				ctx,
			);
			next.push({ type: 'skill', id });
		}
		await this.replaceDraftRefs(agent, next, ctx);
		return toSkillRefs(next);
	}

	/**
	 * Publish: pin each draft ref to the saved version it runs now. Call it in
	 * the publish transaction, after the `agent_history` row exists.
	 */
	async pinDraftForPublish(
		agent: Pick<Agent, 'id'>,
		agentVersionId: string,
		ctx: OperationContext,
	): Promise<void> {
		const refs = await this.refsForDraft(agent, ctx);
		if (refs.length === 0) return;
		const { versionByRef } = await this.skillService.snapshotForPublish(toServiceRefs(refs), ctx);
		const missing = refs.filter((ref) => !versionByRef.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing skills: ${missing.join(', ')}`);
		}
		await this.skillService.pinForPublish(agentVersionId, versionByRef, ctx);
	}

	private async writeDependencies(
		agentId: string,
		refs: SkillRef[],
		ctx: OperationContext,
	): Promise<void> {
		await this.skillRepository.replaceDependencies(
			agentId,
			refs.map((ref) => ({ skillId: ref.id, versionId: ref.versionId ?? null })),
			ctx,
		);
	}
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
