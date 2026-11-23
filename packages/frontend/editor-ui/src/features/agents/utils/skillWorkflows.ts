import { parseAgentSkillWorkflowMentions, type SkillWorkflowMention } from '@n8n/api-types';

import type { AgentJsonToolRef, AgentSkill } from '@/features/agents/types';

export type SkillWorkflow = SkillWorkflowMention & {
	skillId: string;
	skillName: string;
};

type AppliedSkill = { id: string; skill: AgentSkill };

function skillMentions(skill: AgentSkill): SkillWorkflowMention[] {
	return parseAgentSkillWorkflowMentions({
		instructions: skill.instructions,
		references: Array.isArray(skill.references) ? skill.references : [],
	});
}

function directWorkflowIds(tools: AgentJsonToolRef[]): Set<string> {
	return new Set(
		tools.flatMap((tool) => (tool.type === 'workflow' && tool.workflowId ? [tool.workflowId] : [])),
	);
}

export function findSkillWorkflows(
	skills: AppliedSkill[],
	tools: AgentJsonToolRef[],
): SkillWorkflow[] {
	const attached = directWorkflowIds(tools);
	const workflows = new Map<string, SkillWorkflow>();
	for (const { id, skill } of skills) {
		for (const mention of skillMentions(skill)) {
			if (attached.has(mention.workflowId) || workflows.has(mention.workflowId)) continue;
			workflows.set(mention.workflowId, { ...mention, skillId: id, skillName: skill.name || id });
		}
	}
	return [...workflows.values()];
}

export function findDirectlyAttachedMentions(
	skill: AgentSkill,
	tools: AgentJsonToolRef[],
): SkillWorkflowMention[] {
	const attached = directWorkflowIds(tools);
	return skillMentions(skill).filter(({ workflowId }) => attached.has(workflowId));
}
