import {
	parseSkillWorkflowMentions,
	type AgentJsonConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';

import { extractAgentWorkflowRefs } from './extract-agent-workflow-refs';

export type SkillWorkflowTool = {
	skillId: string;
	skillIds: string[];
	tool: AgentJsonWorkflowToolConfig & { workflowId: string };
};

type MentionedWorkflows = Map<string, { name: string; skillIds: string[]; skillName: string }>;

type WorkflowsByName = ReadonlyMap<string, { id: string }>;

function directWorkflowId(
	tool: AgentJsonWorkflowToolConfig,
	workflowsByName: WorkflowsByName,
): string | undefined {
	return tool.workflowId ?? workflowsByName.get(tool.workflow)?.id;
}

export function directWorkflowIds(
	config: AgentJsonConfig,
	workflowsByName: WorkflowsByName,
): Set<string> {
	return new Set(
		extractAgentWorkflowRefs(config).flatMap(
			(tool) => directWorkflowId(tool, workflowsByName) ?? [],
		),
	);
}

function workflowIdSentence(workflowId: string): string {
	return `Workflow ID: ${workflowId}.`;
}

function findMentionedWorkflows(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
): MentionedWorkflows {
	const mentioned: MentionedWorkflows = new Map();
	for (const ref of config.skills ?? []) {
		if (!Object.hasOwn(skills, ref.id)) continue;
		const skill = skills[ref.id];
		const texts = [skill.instructions, ...(skill.references ?? []).map((file) => file.content)];
		for (const text of texts) {
			for (const { workflowId, name } of parseSkillWorkflowMentions(text)) {
				const known = mentioned.get(workflowId);
				if (!known) {
					mentioned.set(workflowId, { name, skillIds: [ref.id], skillName: skill.name });
				} else if (!known.skillIds.includes(ref.id)) {
					known.skillIds.push(ref.id);
				}
			}
		}
	}
	return mentioned;
}

function toSkillWorkflowTools(
	mentioned: MentionedWorkflows,
	attached: Set<string>,
): SkillWorkflowTool[] {
	return [...mentioned]
		.filter(([workflowId]) => !attached.has(workflowId))
		.map(([workflowId, { name, skillIds, skillName }]) => ({
			skillId: skillIds[0],
			skillIds,
			tool: {
				type: 'workflow',
				workflowId,
				workflow: name || workflowId,
				name: `workflow_${workflowId}`,
				description: `Run the workflow "${name || workflowId}" that the skill "${skillName}" mentions. ${workflowIdSentence(workflowId)}`,
			},
		}));
}

export function findSkillWorkflowTools(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
	workflowsByName: WorkflowsByName = new Map(),
): SkillWorkflowTool[] {
	return toSkillWorkflowTools(
		findMentionedWorkflows(config, skills),
		directWorkflowIds(config, workflowsByName),
	);
}

export function withSkillWorkflowTools(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
	workflowsByName: WorkflowsByName = new Map(),
): AgentJsonConfig {
	const mentioned = findMentionedWorkflows(config, skills);
	if (mentioned.size === 0) return config;

	const directTools = (config.tools ?? []).map((tool) => {
		if (tool.type !== 'workflow') return tool;
		const workflowId = directWorkflowId(tool, workflowsByName);
		if (workflowId === undefined || !mentioned.has(workflowId)) return tool;
		return {
			...tool,
			description: `${tool.description ?? `Execute the "${tool.workflow}" workflow.`} ${workflowIdSentence(workflowId)}`,
		};
	});
	const skillTools = toSkillWorkflowTools(
		mentioned,
		directWorkflowIds(config, workflowsByName),
	).map(({ tool }) => tool);
	return { ...config, tools: [...directTools, ...skillTools] };
}
