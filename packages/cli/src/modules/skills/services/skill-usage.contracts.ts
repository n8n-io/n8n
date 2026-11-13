import type { SkillAgentOption, SkillUsedBy } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';

/** An agent as the skills module sees it: its name and project. */
export type SkillAgent = { name: string; projectId: string };

/**
 * What the skills module needs to know about the agents that use a skill. The agents
 * module implements it and registers it on `SkillUsageProxy` on init, so this module
 * never imports the agents module.
 */
export abstract class SkillUsage {
	/** Name and project of each agent, keyed by agent id. An agent without a project is absent. */
	abstract findAgents(agentIds: string[], ctx: OperationContext): Promise<Map<string, SkillAgent>>;

	/** "Used by": the agents that use the skill. Agents outside `projectIds` are only counted. */
	abstract findUsage(
		skillId: string,
		projectIds: string[] | 'all',
		ctx: OperationContext,
	): Promise<SkillUsedBy>;

	/** Distinct agents per skill. Skills nobody uses are left out. */
	abstract countUsingAgents(
		skillIds: string[],
		ctx: OperationContext,
	): Promise<Map<string, number>>;

	/** The agents that use the skill: a draft ref or a published pin. */
	abstract findUsingAgentIds(skillId: string, ctx: OperationContext): Promise<string[]>;

	/** Distinct agents per skill, including draft refs and published pins. Unused skills are absent. */
	abstract findUsingAgentIdsBySkill(
		skillIds: string[],
		ctx: OperationContext,
	): Promise<Map<string, string[]>>;

	/** The skills the agent uses: a draft ref or a published pin. */
	abstract findSkillIdsUsedByAgent(agentId: string, ctx: OperationContext): Promise<string[]>;

	/**
	 * Id and name of the agents in these projects (null for every project), searched by
	 * name and cut to `limit`. Reads no agent config.
	 */
	abstract findAgentSummaries(
		projectIds: string[] | null,
		filter: { search?: string; limit: number },
	): Promise<SkillAgentOption[]>;

	/** Refuses a rename that makes the skill clash by name with another skill of an agent. */
	abstract assertRenameKeepsNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		ctx: OperationContext,
	): Promise<void>;

	/** Return the following agents to refresh after the save commits. Write no agent data. */
	abstract markFollowersChanged(skillId: string, ctx: OperationContext): Promise<string[]>;

	/** After a save commits: the agents reload, except the tab of `excludePushRef`. */
	abstract refreshAgents(agentIds: string[], excludePushRef?: string): Promise<void>;
}
