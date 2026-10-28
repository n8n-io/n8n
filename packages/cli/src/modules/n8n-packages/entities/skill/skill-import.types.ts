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

export interface SkillImportPlan {
	/** Project and instance skills. They are written before the Agents. */
	shared: SkillWrite[];
	/** The skills of one Agent, keyed by Agent ID. They are written in that Agent's transaction. */
	owned: Map<string, SkillWrite[]>;
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
 * instance skill. Keep the first write of each skill.
 */
export function dropRepeatedSharedWrites(plans: SkillImportPlan[]): void {
	const seen = new Set<string>();
	for (const plan of plans) {
		plan.shared = plan.shared.filter(({ skill }) => {
			if (seen.has(skill.id)) return false;
			seen.add(skill.id);
			return true;
		});
	}
}

/**
 * A skill write in one project raises the revision of the Agents in all projects that
 * follow the skill. Give all plans of the package one map, so each plan knows these raises.
 */
export function shareRevisionRaises(plans: SkillImportPlan[]): void {
	const raisedRevisions = new Map<string, number>();
	for (const plan of plans) plan.raisedRevisions = raisedRevisions;
}
