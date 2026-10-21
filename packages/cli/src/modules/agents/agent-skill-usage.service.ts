import type { SkillUsage } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import type { SkillAgentsProvider } from '@/modules/skills/skill-agents-proxy.service';
import type { Skill } from '@/modules/skills/skill.entity';
import { findIntroducedNameClashes, renameIntroducesClash } from '@/modules/skills/skill-names';
import { SkillRepository } from '@/modules/skills/skill.repository';
import { SkillService, type SkillRef } from '@/modules/skills/skill.service';

import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSkillRepository } from './repositories/agent-skill.repository';

/**
 * How agents use skills: the attach check of agent skill refs, the pins of publish and
 * revert, and what the skills module asks about the agents that use a skill. The agents
 * module registers it as the `SkillAgentsProvider` on init.
 */
@Service()
export class AgentSkillUsageService implements SkillAgentsProvider {
	constructor(
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly agentRepository: AgentRepository,
		private readonly skillRepository: SkillRepository,
		private readonly skillService: SkillService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
	) {}

	// ---------------------------------------------------------------- publish and revert

	/**
	 * Publish, step 2: after the `agent_history` row exists. The pins keep the order of
	 * `versionByRef`, which is the order of the draft refs.
	 */
	async pinForPublish(
		agentVersionId: string,
		versionByRef: Map<string, string>,
		ctx: OperationContext,
	): Promise<void> {
		await this.agentSkillRepository.insertPins(
			[...versionByRef].map(([skillId, skillVersionId]) => ({
				agentVersionId,
				skillId,
				skillVersionId,
			})),
			ctx,
		);
	}

	/**
	 * Revert: each ref gets a pin to the version that agent version used. No skill row is
	 * written, so other agents are not affected and no skill permission is needed. A ref
	 * with no pin follows the latest version.
	 */
	async restoreFromVersion(
		agentVersionId: string,
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<SkillRef[]> {
		const pinned = await this.agentSkillRepository.findPinned(agentVersionId, ctx);
		return refs.map(({ versionId: _dropped, ...ref }) => {
			const row = pinned.get(ref.id);
			return row ? { ...ref, versionId: row.version.id } : ref;
		});
	}

	// ---------------------------------------------------------------- attach

	/** An agent can attach instance skills, the skills of its own project and its own agent skills. */
	isAttachable(
		skill: Pick<Skill, 'projectId' | 'agentId'>,
		agent: { id: string; projectId: string | null },
	): boolean {
		if (skill.agentId !== null) return skill.agentId === agent.id;
		return skill.projectId === null || skill.projectId === agent.projectId;
	}

	/**
	 * The check an agent config save runs on the skill refs it gets. The agent's current
	 * refs come from its dependency rows. Unknown ids are dropped unless already
	 * attached. A ref keeps a pin only when the agent already had it. A new ref
	 * must be attachable and must not clash by name.
	 */
	async checkRefs(
		agent: { id: string; projectId: string | null },
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<SkillRef[]> {
		const current =
			(await this.agentSkillRepository.findDependencies([agent.id], ctx)).get(agent.id) ?? [];
		const existingIds = new Set(current.map((ref) => ref.skillId));
		const existingPins = new Map(current.map((ref) => [ref.skillId, ref.versionId]));
		const found = new Map(
			(
				await this.skillRepository.findByIds(
					refs.map((ref) => ref.id),
					ctx,
				)
			).map((skill) => [skill.id, skill]),
		);
		const kept = refs
			.filter((ref) => existingIds.has(ref.id) || found.has(ref.id))
			.map(({ versionId, ...ref }) =>
				versionId !== undefined && existingPins.get(ref.id) === versionId
					? { ...ref, versionId }
					: ref,
			);
		const newIds = [...new Set(kept.map((ref) => ref.id))].filter(
			(id) => !existingIds.has(id) && found.has(id),
		);
		if (newIds.length === 0) return kept;
		// Shared lock until the attach commits, so `changeTarget` cannot narrow a skill in between.
		if (ctx.trx) await this.skillRepository.lockForPublish(newIds, ctx);

		const keptExisting = kept.filter((ref) => existingIds.has(ref.id));
		const newRefs = newIds.map((id) => ({ id }));
		const nameOf = await this.skillService.runtimeNames([...keptExisting, ...newRefs], ctx);
		for (const id of newIds) {
			const skill = found.get(id);
			if (skill && !this.isAttachable(skill, agent)) {
				throw new UserError(
					`Skill "${nameOf({ id }) ?? id}" (${id}) is not available to this agent. An agent can use the skills of its own project, its own skills and instance skills.`,
				);
			}
		}
		// A kept ref runs its pinned version, so compare the name of that version.
		const clashes = findIntroducedNameClashes(
			keptExisting.flatMap((ref) => nameOf(ref) ?? []),
			newRefs.flatMap((ref) => nameOf(ref) ?? []),
		);
		if (clashes.length > 0) {
			throw new UserError(
				`This agent already has a skill with a name like "${clashes.join('", "')}". Rename one of them, or detach the other skill first.`,
			);
		}
		return kept;
	}

	// ---------------------------------------------------------------- SkillAgentsProvider

	async findAgents(agentIds: string[], ctx: OperationContext) {
		return await this.agentSkillRepository.findAgents(agentIds, ctx);
	}

	async findAgentIdsInProjects(projectIds: string[], ctx: OperationContext) {
		return await this.agentSkillRepository.findAgentIdsInProjects(projectIds, ctx);
	}

	async findUsage(
		skillId: string,
		projectIds: string[] | 'all',
		ctx: OperationContext,
	): Promise<SkillUsage> {
		return await this.agentSkillRepository.findUsage(skillId, projectIds, ctx);
	}

	async countUsingAgents(skillIds: string[], ctx: OperationContext) {
		return await this.agentSkillRepository.countUsingAgents(skillIds, ctx);
	}

	async findUsingAgentIds(skillId: string, ctx: OperationContext) {
		return await this.agentSkillRepository.findUsingAgentIds(skillId, ctx);
	}

	async findSkillIdsUsedByAgent(agentId: string, ctx: OperationContext) {
		return await this.agentSkillRepository.findSkillIdsUsedByAgent(agentId, ctx);
	}

	async assertRenameKeepsNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		ctx: OperationContext,
	): Promise<void> {
		const agents = await this.agentSkillRepository.findFollowingAgents(skillId, ctx);
		const refs = await this.agentSkillRepository.findDependencies(
			agents.map((agent) => agent.id),
			ctx,
		);
		const otherRefs = (agent: (typeof agents)[number]) =>
			(refs.get(agent.id) ?? [])
				.filter((ref) => ref.skillId !== skillId)
				.map((ref) => ({ id: ref.skillId, versionId: ref.versionId }));
		const nameOf = await this.skillService.runtimeNames(agents.flatMap(otherRefs), ctx);
		const clashing = agents.filter((agent) =>
			renameIntroducesClash(
				otherRefs(agent).flatMap((ref) => nameOf(ref) ?? []),
				oldName,
				newName,
			),
		);
		if (clashing.length > 0) {
			throw new UserError(
				`Cannot rename to "${newName}": ${clashing.map((agent) => agent.name).join(', ')} already ${
					clashing.length > 1 ? 'use' : 'uses'
				} a skill with a name like that.`,
			);
		}
	}

	async markFollowersChanged(skillId: string, ctx: OperationContext): Promise<string[]> {
		const followingIds = await this.agentSkillRepository.findFollowingAgentIds([skillId], ctx);
		await this.agentRepository.markDraftChangedIfInSync(followingIds, ctx);
		return followingIds;
	}

	async refreshAgents(agentIds: string[], excludePushRef?: string): Promise<void> {
		if (agentIds.length === 0) return;
		// Imported on use: the runtime cache depends on services that depend on this one.
		const { AgentRuntimeCacheService } = await import('./agent-runtime-cache.service.js');
		const cache = Container.get(AgentRuntimeCacheService);
		for (const agentId of agentIds) cache.clearRuntimes(agentId);
		for (const agent of await this.agentRepository.findProjectIdsByIds(agentIds)) {
			this.agentUpdateBroadcaster.notify(
				{ projectId: agent.projectId, agentId: agent.id, source: 'user' },
				excludePushRef,
			);
		}
	}
}
