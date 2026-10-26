import type { SkillAgentOption, SkillUsedBy } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { SkillUsage, type SkillAgent } from './skill-usage.contracts';

/**
 * Holds the `SkillUsage` of the agents module, which registers it on init. Services that
 * the container creates before then still get a working instance. Until the registration
 * (the agents module is off), no agent uses a skill and an agent skill has no project, so
 * only the global scope can reach it.
 */
@Service()
export class SkillUsageProxy extends SkillUsage {
	private impl: SkillUsage | null = null;

	register(impl: SkillUsage): void {
		this.impl = impl;
	}

	/** Whether the agents module registered its `SkillUsage`. Skills stay off without it. */
	get isRegistered(): boolean {
		return this.impl !== null;
	}

	async findAgents(agentIds: string[], ctx: OperationContext = {}) {
		if (!this.impl || agentIds.length === 0) return new Map<string, SkillAgent>();
		return await this.impl.findAgents(agentIds, ctx);
	}

	async findAgentIdsInProjects(projectIds: string[], ctx: OperationContext = {}) {
		if (!this.impl || projectIds.length === 0) return [];
		return await this.impl.findAgentIdsInProjects(projectIds, ctx);
	}

	async findUsage(
		skillId: string,
		projectIds: string[] | 'all' = 'all',
		ctx: OperationContext = {},
	): Promise<SkillUsedBy> {
		if (!this.impl) return { drafts: [], pins: [], hiddenAgents: 0 };
		return await this.impl.findUsage(skillId, projectIds, ctx);
	}

	async countUsingAgents(skillIds: string[], ctx: OperationContext = {}) {
		if (!this.impl || skillIds.length === 0) return new Map<string, number>();
		return await this.impl.countUsingAgents(skillIds, ctx);
	}

	async findUsingAgentIds(skillId: string, ctx: OperationContext = {}) {
		if (!this.impl) return [];
		return await this.impl.findUsingAgentIds(skillId, ctx);
	}

	async findSkillIdsUsedByAgent(agentId: string, ctx: OperationContext = {}) {
		if (!this.impl) return [];
		return await this.impl.findSkillIdsUsedByAgent(agentId, ctx);
	}

	async findAgentSummaries(
		projectIds: string[] | null,
		filter: { search?: string; limit: number },
	): Promise<SkillAgentOption[]> {
		if (!this.impl || projectIds?.length === 0) return [];
		return await this.impl.findAgentSummaries(projectIds, filter);
	}

	async assertRenameKeepsNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		ctx: OperationContext = {},
	) {
		await this.impl?.assertRenameKeepsNamesApart(skillId, oldName, newName, ctx);
	}

	async markFollowersChanged(skillId: string, ctx: OperationContext = {}) {
		if (!this.impl) return [];
		return await this.impl.markFollowersChanged(skillId, ctx);
	}

	async refreshAgents(agentIds: string[], excludePushRef?: string) {
		if (!this.impl || agentIds.length === 0) return;
		await this.impl.refreshAgents(agentIds, excludePushRef);
	}
}
