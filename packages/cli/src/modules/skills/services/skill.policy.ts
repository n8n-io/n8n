// The decisions of `SkillService` as pure functions: the service reads what they need and
// writes what they decide. Test them with decision tables, without mocks.
import { AGENT_SKILL_NAME_MAX_LENGTH, skillNameKey, type SkillUsedBy } from '@n8n/api-types';

import type { SkillTarget } from '../utils/skill-content';
import type { SkillAgent } from './skill-usage.contracts';

/** Which agents a message may name. The others are only counted. */
export type VisibleProjects = string[] | 'all';

/** How a refusal counts the agents in projects the user may not read. */
function agentsInOtherProjects(count: number): string {
	return `${count} ${count === 1 ? 'agent' : 'agents'} in other projects`;
}

/**
 * The requested name if no name in `takenKeys` is like it, else the name with the first free
 * number after it ("New skill 2"), as workflow names get. The number replaces the end of a
 * name at the maximum length.
 */
export function nextFreeName(requested: string, takenKeys: ReadonlySet<string>): string {
	const base = requested.trim();
	if (!takenKeys.has(skillNameKey(base))) return base;
	for (let n = 2; ; n++) {
		const suffix = ` ${n}`;
		const candidate = `${base.slice(0, AGENT_SKILL_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
		if (!takenKeys.has(skillNameKey(candidate))) return candidate;
	}
}

/** Whether another skill of the scope has a name that is hard to tell apart from `name`. */
export function isNameTaken(
	name: string,
	names: Array<{ skillId: string; name: string }>,
	exceptSkillId?: string,
): boolean {
	const key = skillNameKey(name);
	return names.some((other) => other.skillId !== exceptSkillId && skillNameKey(other.name) === key);
}

/**
 * The agents that cannot add the skill in `target`. An agent can add an instance skill, a
 * skill of its own project and its own agent skills. An agent without a project loses any
 * scoped skill.
 */
export function findLosingAgents(
	agentIds: string[],
	target: SkillTarget,
	agents: ReadonlyMap<string, SkillAgent>,
): string[] {
	if (target.projectId === null && target.agentId === null) return [];
	return agentIds.filter((id) =>
		target.agentId ? id !== target.agentId : agents.get(id)?.projectId !== target.projectId,
	);
}

/** The refusal of a move that takes the skill away from `losing`. */
export function losingAgentsMessage(
	losing: string[],
	agents: ReadonlyMap<string, SkillAgent>,
	visibleProjects: VisibleProjects,
): string {
	const named: string[] = [];
	let hidden = 0;
	for (const id of losing) {
		const agent = agents.get(id);
		if (agent && (visibleProjects === 'all' || visibleProjects.includes(agent.projectId))) {
			named.push(`"${agent.name}"`);
		} else {
			hidden++;
		}
	}
	if (hidden > 0) named.push(agentsInOtherProjects(hidden));
	const one = losing.length === 1;
	return `${named.join(', ')} would lose access to this skill. Choose a scope that includes ${
		one ? 'that agent' : 'those agents'
	}, or detach the skill from ${one ? 'it' : 'them'} first.`;
}

/** Whether an agent draft or a published agent version uses the skill, so it cannot be deleted. */
export function blocksDelete(usage: SkillUsedBy): boolean {
	return usage.drafts.length > 0 || usage.pins.length > 0 || usage.hiddenAgents > 0;
}

/**
 * The refusal of a delete: each agent once for its draft and once for its published version.
 * Agents are told apart by id, so two agents with the same name both appear.
 */
export function deleteRefusalMessage(skillName: string, usage: SkillUsedBy): string {
	const users = new Map<string, string>();
	for (const draft of usage.drafts) {
		users.set(`draft:${draft.agentId}`, `${draft.agentName} (draft)`);
	}
	for (const pin of usage.pins) {
		const version = pin.version === null ? 'older published version' : `published v${pin.version}`;
		users.set(`pin:${pin.agentId}`, `${pin.agentName} (${version})`);
	}
	const named = [...users.values()];
	if (usage.hiddenAgents > 0) named.push(agentsInOtherProjects(usage.hiddenAgents));
	return `Skill "${skillName}" is used by ${named.join(', ')} and cannot be deleted.`;
}
