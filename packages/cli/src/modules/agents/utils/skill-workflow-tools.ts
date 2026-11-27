import {
	parseSkillWorkflowMentions,
	sanitizeAgentToolName,
	type AgentJsonConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';

import { extractAgentWorkflowRefs } from './extract-agent-workflow-refs';

export type SkillWorkflowTool = {
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

function configuredToolNames(config: AgentJsonConfig): Set<string> {
	return new Set(
		(config.tools ?? []).map((tool) => {
			if (tool.type === 'workflow') return sanitizeAgentToolName(tool.name ?? tool.workflow);
			if (tool.type === 'node') return sanitizeAgentToolName(tool.name);
			return tool.id;
		}),
	);
}

function toSkillWorkflowTools(
	mentioned: MentionedWorkflows,
	attached: Set<string>,
	takenNames: Set<string>,
): SkillWorkflowTool[] {
	return [...mentioned]
		.filter(([workflowId]) => !attached.has(workflowId))
		.filter(([workflowId]) => !takenNames.has(`workflow_${workflowId}`))
		.map(([workflowId, { name, skillIds, skillName }]) => ({
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
): SkillWorkflowTool[] {
	return toSkillWorkflowTools(
		findMentionedWorkflows(config, skills),
		directWorkflowIds(config, new Map()),
		configuredToolNames(config),
	);
}

export function withSkillWorkflowTools(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
	workflowsByName: WorkflowsByName = new Map(),
): { config: AgentJsonConfig; skillIdsByWorkflowId: Map<string, string[]> } {
	const mentioned = findMentionedWorkflows(config, skills);
	if (mentioned.size === 0) return { config, skillIdsByWorkflowId: new Map() };

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
		configuredToolNames(config),
	);
	return {
		config: { ...config, tools: [...directTools, ...skillTools.map(({ tool }) => tool)] },
		skillIdsByWorkflowId: new Map(
			skillTools.map(({ skillIds, tool }) => [tool.workflowId, skillIds]),
		),
	};
}
