import { skillNameKey } from '@n8n/api-types';

import type { SkillTarget } from '@/modules/skills';

import type { SerializedSkill } from '../../spec/serialized/skill.schema';
import type { AgentImportIssue } from '../agent/agent-import.types';

/** One skill that the import creates or, with `base`, saves as a new version. */
export interface SkillWrite {
	skill: SerializedSkill;
	target: SkillTarget;
	/** The destination version that the plan compared. Absent for a create. */
	base?: { skillHash: string; versionId: string };
}

/** A project or instance skill write, with the Agents that use the skill. */
export interface SharedSkillWrite extends SkillWrite {
	usedBy: string[];
}

export interface SkillImportPlan {
	/** Project and instance skills. They are written before the Agents. */
	shared: SharedSkillWrite[];
	/** The skills of one Agent, keyed by Agent ID. They are written in that Agent's transaction. */
	owned: Map<string, SkillWrite[]>;
	/** The Agents that use a project or instance skill that the import writes. */
	sharedUsers: Set<string>;
	/**
	 * How many times the import raised the revision of each Agent, keyed by Agent ID.
	 * All plans of one package share this map.
	 */
	raisedRevisions: Map<string, number>;
}

export function skillIssue(
	sourceAgentId: string,
	skillId: string,
	message: string,
): AgentImportIssue {
	return { type: 'agent-invalid', sourceAgentId, path: `skills.${skillId}`, message };
}

/**
 * A project package plans each project on its own, so two projects can plan the same
 * instance skill, or two instance skills with names like each other. Keeps the first write
 * of each skill and returns, for each plan, the issues of the instance name clashes.
 */
export function reconcileSharedWrites(plans: SkillImportPlan[]): AgentImportIssue[][] {
	const writtenIds = new Set<string>();
	const instanceNames = new Set<string>();
	return plans.map((plan) => {
		const kept: SharedSkillWrite[] = [];
		const issues: AgentImportIssue[] = [];
		for (const write of plan.shared) {
			if (writtenIds.has(write.skill.id)) continue;
			writtenIds.add(write.skill.id);
			kept.push(write);
			if (write.target.projectId !== null) continue;
			const key = skillNameKey(write.skill.skill.name);
			if (instanceNames.has(key)) issues.push(...instanceNameClash(write));
			instanceNames.add(key);
		}
		plan.shared = kept;
		return issues;
	});
}

function instanceNameClash({ skill, usedBy }: SharedSkillWrite): AgentImportIssue[] {
	const message = `Another instance skill of this package has the same name "${skill.skill.name}".`;
	return usedBy.map((agentId) => skillIssue(agentId, skill.id, message));
}

/**
 * A skill write in one project raises the revision of the Agents in all projects that
 * follow the skill. Give all plans of the package one map, so each plan knows these raises.
 */
export function shareRevisionRaises(plans: SkillImportPlan[]): void {
	const raisedRevisions = new Map<string, number>();
	for (const plan of plans) plan.raisedRevisions = raisedRevisions;
}
