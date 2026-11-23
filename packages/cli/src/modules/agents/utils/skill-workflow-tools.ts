import {
	parseSkillWorkflowMentions,
	type AgentJsonConfig,
	type AgentJsonWorkflowToolConfig,
	type AgentSkill,
} from '@n8n/api-types';

export type SkillWorkflowTool = {
	skillId: string;
	tool: AgentJsonWorkflowToolConfig & { workflowId: string };
};

function directWorkflowId(
	tool: AgentJsonWorkflowToolConfig,
	legacyWorkflowIds: ReadonlyMap<string, string>,
): string | undefined {
	return tool.workflowId ?? legacyWorkflowIds.get(tool.workflow);
}

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

function directWorkflowIds(
	config: AgentJsonConfig,
	legacyWorkflowIds: ReadonlyMap<string, string>,
): Set<string | undefined> {
	return new Set(
		(config.tools ?? []).map((tool) =>
			tool.type === 'workflow' ? directWorkflowId(tool, legacyWorkflowIds) : undefined,
		),
	);
}

export function findSkillWorkflowTools(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
	legacyWorkflowIds: ReadonlyMap<string, string> = new Map(),
): SkillWorkflowTool[] {
	const attached = directWorkflowIds(config, legacyWorkflowIds);
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
	legacyWorkflowIds: ReadonlyMap<string, string> = new Map(),
): AgentJsonConfig {
	const mentioned = findMentionedWorkflows(config, skills);
	if (mentioned.size === 0) return config;

	const directTools = (config.tools ?? []).map((tool) => {
		if (tool.type !== 'workflow') return tool;
		const workflowId = directWorkflowId(tool, legacyWorkflowIds);
		if (workflowId === undefined || !mentioned.has(workflowId)) return tool;
		return {
			...tool,
			description: `${tool.description ?? `Execute the "${tool.workflow}" workflow.`} ${workflowIdSentence(workflowId)}`,
		};
	});
	const skillTools = findSkillWorkflowTools(config, skills, legacyWorkflowIds).map(
		({ tool }) => tool,
	);
	return { ...config, tools: [...directTools, ...skillTools] };
}
