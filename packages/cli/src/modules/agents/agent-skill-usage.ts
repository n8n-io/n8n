import type { SkillAgentOption, SkillUsedBy } from '@n8n/api-types';
import { UserRepository, type OperationContext } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { renameIntroducesClash, SkillRuntimeService, SkillUsage } from '@/modules/skills';

import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSkillRepository } from './repositories/agent-skill.repository';

/**
 * What the skills module asks about the agents that use a skill. The agents module
 * registers it on `SkillUsageProxy` on init.
 */
@Service()
export class AgentSkillUsage extends SkillUsage {
	constructor(
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly agentRepository: AgentRepository,
		private readonly skillRuntime: SkillRuntimeService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
		private readonly userRepository: UserRepository,
	) {
		super();
	}

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
	): Promise<SkillUsedBy> {
		const usage = await this.agentSkillRepository.findUsage(skillId, projectIds, ctx);
		const [pinnedVersions, versionOf] = await Promise.all([
			this.skillRuntime.findVersionRefs(
				usage.pins.flatMap((pin) => pin.skillVersionId ?? []),
				ctx,
			),
			this.skillRuntime.runtimeVersions(
				usage.drafts.map((draft) => ({ id: skillId, versionId: draft.skillVersionId })),
				ctx,
			),
		]);
		return {
			...usage,
			drafts: usage.drafts.flatMap(({ skillVersionId, ...draft }) => {
				const runtime = versionOf({ id: skillId, versionId: skillVersionId });
				return runtime ? [{ ...draft, version: runtime.version, pinned: runtime.pinned }] : [];
			}),
			pins: usage.pins.map(({ skillVersionId, ...pin }) => ({
				...pin,
				version: skillVersionId ? (pinnedVersions.get(skillVersionId)?.version ?? null) : null,
			})),
		};
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

	async findAgentSummaries(
		projectIds: string[] | null,
		filter: { search?: string; limit: number },
	): Promise<SkillAgentOption[]> {
		const agents = await this.agentRepository.findSummariesByProjectIds(projectIds, {
			query: filter.search,
			limit: filter.limit,
		});
		return agents.map(({ id, name }) => ({ id, name }));
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
		const nameOf = await this.skillRuntime.runtimeNames(agents.flatMap(otherRefs), ctx);
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

	async markFollowersChanged(
		skillId: string,
		ctx: OperationContext,
		userId?: string | null,
	): Promise<string[]> {
		const followingIds = await this.agentSkillRepository.findFollowingAgentIds([skillId], ctx);
		await this.agentRepository.markFollowerDraftsChanged(followingIds, ctx);
		if (followingIds.length > 0) {
			// Snapshot capture reads skill refs through this service, so resolve it after construction.
			const { AgentDefinitionService } = await import('./agent-definition.service.js');
			const definitions = Container.get(AgentDefinitionService);
			const user = userId ? await this.userRepository.findByIdWithRole(userId, ctx) : null;
			for (const id of followingIds) {
				const agent = await this.agentRepository.findById(id, ctx);
				if (agent) await definitions.captureVersion(agent, user ?? 'Unknown', ctx);
			}
		}
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
