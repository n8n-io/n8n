import {
	parseSkillWorkflowMentions,
	type AgentJsonConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';

export type SkillWorkflowTool = {
	skillId: string;
	tool: AgentJsonWorkflowToolConfig;
};

function workflowIdSentence(workflowId: string): string {
	return `Workflow ID: ${workflowId}.`;
}

function findMentionedWorkflows(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
): Map<string, { name: string; skillId: string; skillName: string }> {
	const mentioned = new Map<string, { name: string; skillId: string; skillName: string }>();
	for (const ref of config.skills ?? []) {
		if (!Object.hasOwn(skills, ref.id)) continue;
		const skill = skills[ref.id];
		const texts = [skill.instructions, ...(skill.references ?? []).map((file) => file.content)];
		for (const text of texts) {
			for (const { workflowId, name } of parseSkillWorkflowMentions(text)) {
				if (mentioned.has(workflowId)) continue;
				mentioned.set(workflowId, { name, skillId: ref.id, skillName: skill.name });
			}
		}
	}
	return mentioned;
}

function directWorkflowIds(config: AgentJsonConfig): Set<string> {
	return new Set(
		(config.tools ?? []).flatMap((tool) =>
			tool.type === 'workflow' && tool.workflowId !== undefined ? [tool.workflowId] : [],
		),
	);
}

export function findSkillWorkflowTools(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
): SkillWorkflowTool[] {
	const attached = directWorkflowIds(config);
	return [...findMentionedWorkflows(config, skills)]
		.filter(([workflowId]) => !attached.has(workflowId))
		.map(([workflowId, { name, skillId, skillName }]) => ({
			skillId,
			tool: {
				type: 'workflow',
				workflowId,
				workflow: name || workflowId,
				name: `workflow_${workflowId}`,
				description: `Run the workflow "${name || workflowId}" that the skill "${skillName}" mentions. ${workflowIdSentence(workflowId)}`,
			},
		}));
}

export function withSkillWorkflowTools(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
): AgentJsonConfig {
	const mentioned = findMentionedWorkflows(config, skills);
	if (mentioned.size === 0) return config;

	const directTools = (config.tools ?? []).map((tool) =>
		tool.type === 'workflow' && tool.workflowId !== undefined && mentioned.has(tool.workflowId)
			? {
					...tool,
					description: `${tool.description ?? `Execute the "${tool.workflow}" workflow.`} ${workflowIdSentence(tool.workflowId)}`,
				}
			: tool,
	);
	const skillTools = findSkillWorkflowTools(config, skills).map(({ tool }) => tool);
	return { ...config, tools: [...directTools, ...skillTools] };
}
