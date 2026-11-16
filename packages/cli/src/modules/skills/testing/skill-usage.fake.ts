// An in-memory `SkillUsage` for unit tests. It passes the contract cases in
// `skill-usage.contract.ts`, as the real one of the agents module does.
import type { SkillAgentOption, SkillUsedBy } from '@n8n/api-types';
import { UserError } from '@n8n/errors';

import { SkillUsage, type SkillAgent } from '../services/skill-usage.contracts';
import { renameIntroducesClash } from '../utils/skill-names';
import type { SeededSkillUsageWorld, SkillUsageWorld } from './skill-usage.contract';

/** The ids of the fake are the keys of the world. */
const sameKeys: SeededSkillUsageWorld = {
	projectId: (key) => key,
	agentId: (key) => key,
	skillId: (key) => key,
};

export class FakeSkillUsage extends SkillUsage {
	private world: Required<SkillUsageWorld> = { agents: [], skills: [], drafts: [], publishes: [] };

	/** The agents of each `refreshAgents` call. */
	readonly refreshed: Array<{ agentIds: string[]; excludePushRef?: string }> = [];

	/** Replaces the store. The fake uses the keys of the world as ids. */
	async seed(world: SkillUsageWorld): Promise<SeededSkillUsageWorld> {
		this.world = { drafts: [], publishes: [], ...world };
		this.refreshed.length = 0;
		return sameKeys;
	}

	async findAgents(agentIds: string[]): Promise<Map<string, SkillAgent>> {
		return new Map(
			this.world.agents
				.filter((agent) => agentIds.includes(agent.key))
				.map((agent) => [agent.key, { name: agent.name, projectId: agent.project }]),
		);
	}

	async findUsage(skillId: string, projectIds: string[] | 'all'): Promise<SkillUsedBy> {
		const isVisible = (agentKey: string) =>
			projectIds === 'all' || projectIds.includes(this.agent(agentKey).project);
		const drafted = unique(this.draftsOf(skillId).map((ref) => ref.agent));
		const published = unique(
			this.world.publishes
				.filter((publish) => publish.pins.some((pin) => pin.skill === skillId))
				.map((publish) => publish.agent),
		);
		const row = (agentKey: string) => {
			const { key, name, project } = this.agent(agentKey);
			return { agentId: key, agentName: name, projectId: project };
		};
		return {
			drafts: drafted.filter(isVisible).flatMap((agentKey) => {
				const runtime = this.draftVersion(agentKey, skillId);
				return runtime ? [{ ...row(agentKey), ...runtime }] : [];
			}),
			pins: published.filter(isVisible).map((agentKey) => ({
				...row(agentKey),
				version: this.activePin(agentKey, skillId) ?? null,
			})),
			hiddenAgents: unique([...drafted, ...published]).filter((key) => !isVisible(key)).length,
		};
	}

	async countUsingAgents(skillIds: string[]): Promise<Map<string, number>> {
		const counts = new Map<string, number>();
		for (const skillId of unique(skillIds)) {
			const count = (await this.findUsingAgentIds(skillId)).length;
			if (count > 0) counts.set(skillId, count);
		}
		return counts;
	}

	async findUsingAgentIds(skillId: string): Promise<string[]> {
		const pinning = this.world.publishes.filter((publish) =>
			publish.pins.some((pin) => pin.skill === skillId),
		);
		return unique([
			...this.draftsOf(skillId).map((ref) => ref.agent),
			...pinning.map((publish) => publish.agent),
		]);
	}

	async findSkillIdsUsedByAgent(agentId: string): Promise<string[]> {
		return unique([
			...this.world.drafts.filter((ref) => ref.agent === agentId).map((ref) => ref.skill),
			...this.world.publishes
				.filter((publish) => publish.agent === agentId)
				.flatMap((publish) => publish.pins.map((pin) => pin.skill)),
		]);
	}

	async findAgentSummaries(
		projectIds: string[] | null,
		filter: { search?: string; limit: number },
	): Promise<SkillAgentOption[]> {
		const search = filter.search?.toLowerCase();
		return this.world.agents
			.filter((agent) => projectIds === null || projectIds.includes(agent.project))
			.filter((agent) => !search || agent.name.toLowerCase().includes(search))
			.slice(0, filter.limit)
			.map((agent) => ({ id: agent.key, name: agent.name }));
	}

	async assertRenameKeepsNamesApart(skillId: string, oldName: string, newName: string) {
		const clashing = this.followers(skillId).filter((agentKey) => {
			const otherNames = this.world.drafts
				.filter((ref) => ref.agent === agentKey && ref.skill !== skillId)
				.map((ref) => this.nameOf(ref.skill, ref.version));
			return renameIntroducesClash(otherNames, oldName, newName);
		});
		if (clashing.length > 0) {
			const names = clashing.map((key) => this.agent(key).name);
			throw new UserError(
				`Cannot rename to "${newName}": ${names.join(', ')} already ${
					names.length > 1 ? 'use' : 'uses'
				} a skill with a name like that.`,
			);
		}
	}

	async markFollowersChanged(skillId: string): Promise<string[]> {
		return this.followers(skillId);
	}

	async refreshAgents(agentIds: string[], excludePushRef?: string): Promise<void> {
		if (agentIds.length > 0) this.refreshed.push({ agentIds, excludePushRef });
	}

	private agent(key: string) {
		const agent = this.world.agents.find((candidate) => candidate.key === key);
		if (!agent) throw new Error(`FakeSkillUsage: no agent "${key}" in the world`);
		return agent;
	}

	private draftsOf(skillId: string) {
		return this.world.drafts.filter((ref) => ref.skill === skillId);
	}

	/** Agents whose draft follows the latest version of the skill. */
	private followers(skillId: string): string[] {
		return unique(
			this.draftsOf(skillId)
				.filter((ref) => ref.version === undefined)
				.map((ref) => ref.agent),
		);
	}

	/** The version of the skill that the active (last) publish of the agent pins. */
	private activePin(agentKey: string, skillId: string): number | undefined {
		const active = this.world.publishes.filter((publish) => publish.agent === agentKey).at(-1);
		return active?.pins.find((pin) => pin.skill === skillId)?.version;
	}

	/** The version the draft runs: the pinned one, else the latest. None without a saved version. */
	private draftVersion(agentKey: string, skillId: string) {
		const ref = this.draftsOf(skillId).find((candidate) => candidate.agent === agentKey);
		const latest = this.world.skills.find((skill) => skill.key === skillId)?.versions.length ?? 0;
		if (ref?.version !== undefined) return { version: ref.version, pinned: true };
		return latest > 0 ? { version: latest, pinned: false } : undefined;
	}

	/** The name of a pinned version, or of the latest version. */
	private nameOf(skillId: string, version?: number): string {
		const versions = this.world.skills.find((skill) => skill.key === skillId)?.versions ?? [];
		return (version === undefined ? versions.at(-1) : versions[version - 1]) ?? '';
	}
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
