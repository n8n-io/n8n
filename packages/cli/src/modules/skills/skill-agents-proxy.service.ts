import type { SkillAgentOption, SkillUsage } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

/** An agent as the skills module sees it: an agent skill takes its project from its agent. */
export type SkillAgent = { name: string; projectId: string };

/**
 * What the skills module needs to know about agents. The agents module registers the
 * provider on init, so this module never imports the agents module.
 */
export interface SkillAgentsProvider {
	/** Name and project of each agent, keyed by agent id. An agent without a project is absent. */
	findAgents(agentIds: string[], ctx: OperationContext): Promise<Map<string, SkillAgent>>;

	/** Ids of the agents in these projects. */
	findAgentIdsInProjects(projectIds: string[], ctx: OperationContext): Promise<string[]>;

	/** "Used by": the agents that use the skill. Agents outside `projectIds` are only counted. */
	findUsage(
		skillId: string,
		projectIds: string[] | 'all',
		ctx: OperationContext,
	): Promise<SkillUsage>;

	/** Distinct agents per skill. Skills nobody uses are left out. */
	countUsingAgents(skillIds: string[], ctx: OperationContext): Promise<Map<string, number>>;

	/** The agents that use the skill: a draft ref or a published pin. */
	findUsingAgentIds(skillId: string, ctx: OperationContext): Promise<string[]>;

	/** The skills the agent uses: a draft ref or a published pin. */
	findSkillIdsUsedByAgent(agentId: string, ctx: OperationContext): Promise<string[]>;

	/**
	 * Id and name of the agents in these projects (null for every project), searched by
	 * name and cut to `limit`. Reads no agent config.
	 */
	findAgentSummaries(
		projectIds: string[] | null,
		filter: { search?: string; limit: number },
	): Promise<SkillAgentOption[]>;

	/** Refuses a rename that makes the skill clash by name with another skill of an agent. */
	assertRenameKeepsNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		ctx: OperationContext,
	): Promise<void>;

	/**
	 * In the save transaction: the agents that follow the skill run the new version, so each
	 * one that was in sync with its published version shows unpublished changes. Returns the
	 * ids of the following agents.
	 */
	markFollowersChanged(skillId: string, ctx: OperationContext): Promise<string[]>;

	/** After a save commits: the agents reload, except the tab of `excludePushRef`. */
	refreshAgents(agentIds: string[], excludePushRef?: string): Promise<void>;
}

/**
 * Lets the skills module ask about agents without importing the agents module. Until a
 * provider is registered (the agents module is off), no agent uses a skill and an agent
 * skill has no project, so only the global scope can reach it.
 */
@Service()
export class SkillAgentsProxy implements SkillAgentsProvider {
	private provider: SkillAgentsProvider | null = null;

	registerProvider(provider: SkillAgentsProvider): void {
		this.provider = provider;
	}

	/** Whether the agents module registered its provider. Skills stay off without it. */
	get hasProvider(): boolean {
		return this.provider !== null;
	}

	async findAgents(agentIds: string[], ctx: OperationContext = {}) {
		if (!this.provider || agentIds.length === 0) return new Map<string, SkillAgent>();
		return await this.provider.findAgents(agentIds, ctx);
	}

	async findAgentIdsInProjects(projectIds: string[], ctx: OperationContext = {}) {
		if (!this.provider || projectIds.length === 0) return [];
		return await this.provider.findAgentIdsInProjects(projectIds, ctx);
	}

	async findUsage(
		skillId: string,
		projectIds: string[] | 'all' = 'all',
		ctx: OperationContext = {},
	): Promise<SkillUsage> {
		if (!this.provider) return { drafts: [], pins: [], hiddenAgents: 0 };
		return await this.provider.findUsage(skillId, projectIds, ctx);
	}

	async countUsingAgents(skillIds: string[], ctx: OperationContext = {}) {
		if (!this.provider || skillIds.length === 0) return new Map<string, number>();
		return await this.provider.countUsingAgents(skillIds, ctx);
	}

	async findUsingAgentIds(skillId: string, ctx: OperationContext = {}) {
		if (!this.provider) return [];
		return await this.provider.findUsingAgentIds(skillId, ctx);
	}

	async findSkillIdsUsedByAgent(agentId: string, ctx: OperationContext = {}) {
		if (!this.provider) return [];
		return await this.provider.findSkillIdsUsedByAgent(agentId, ctx);
	}

	async findAgentSummaries(
		projectIds: string[] | null,
		filter: { search?: string; limit: number },
	): Promise<SkillAgentOption[]> {
		if (!this.provider || projectIds?.length === 0) return [];
		return await this.provider.findAgentSummaries(projectIds, filter);
	}

	async assertRenameKeepsNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		ctx: OperationContext = {},
	) {
		await this.provider?.assertRenameKeepsNamesApart(skillId, oldName, newName, ctx);
	}

	async markFollowersChanged(skillId: string, ctx: OperationContext = {}) {
		if (!this.provider) return [];
		return await this.provider.markFollowersChanged(skillId, ctx);
	}

	async refreshAgents(agentIds: string[], excludePushRef?: string) {
		if (!this.provider || agentIds.length === 0) return;
		await this.provider.refreshAgents(agentIds, excludePushRef);
	}
}
