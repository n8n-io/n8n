import {
	createRuntimeSkillRegistry,
	type AgentToolRuntimeOverride,
	type RuntimeSkillSource,
} from '@n8n/agents';
import type {
	AgentJsonConfig,
	AgentJsonSkillConfig,
	AgentJsonToolConfig,
	AgentSkill,
} from '@n8n/api-types';
import { agentSkillSchema } from '@n8n/api-types';
import { nodeNameToToolName } from 'n8n-workflow';

import {
	createConfiguredAgentSkillSource,
	getInstructionsWithWebSearchPolicy,
} from '../json-config/from-json-config';
import type { AgentExpressionContext } from './agent-expression-context';

export interface AgentRunFieldSources {
	config: AgentJsonConfig;
	skills: Record<string, AgentSkill>;
	resolveNodeToolInputSchema?: (
		tool: Extract<AgentJsonToolConfig, { type: 'node' }>,
		context: AgentExpressionContext,
	) => Promise<AgentToolRuntimeOverride['inputSchema']>;
}

export interface ResolvedAgentRunFields {
	instructions: string;
	skillSource: RuntimeSkillSource;
	toolOverrides: ReadonlyMap<string, AgentToolRuntimeOverride>;
}

async function resolveSkillInstructions(
	context: AgentExpressionContext,
	refs: AgentJsonSkillConfig[],
	skills: Record<string, AgentSkill>,
): Promise<Record<string, AgentSkill>> {
	const resolved: Record<string, AgentSkill> = {};
	const seen = new Set<string>();

	for (const ref of refs) {
		if (seen.has(ref.id)) continue;
		seen.add(ref.id);
		const skill = skills[ref.id];
		if (!skill) throw new Error(`Skill "${ref.id}" not found in stored skill bodies`);
		resolved[ref.id] = {
			...skill,
			instructions: await context.resolveText(
				skill.instructions,
				`skills.${ref.id}.instructions`,
				agentSkillSchema.shape.instructions,
			),
		};
	}

	return resolved;
}

export async function resolveAgentRunFields(
	sources: AgentRunFieldSources,
	context: AgentExpressionContext,
): Promise<ResolvedAgentRunFields> {
	const { config, skills, resolveNodeToolInputSchema } = sources;
	const resolvedInstructions = await context.resolveText(config.instructions, 'instructions');
	const resolvedSkills = await resolveSkillInstructions(context, config.skills ?? [], skills);
	const toolOverrides = new Map<string, AgentToolRuntimeOverride>();

	for (const [index, ref] of (config.tools ?? []).entries()) {
		if (ref.type !== 'node') continue;
		const description =
			ref.description !== undefined
				? await context.resolveText(ref.description, `tools.${index}.description`)
				: undefined;
		const inputSchema = await resolveNodeToolInputSchema?.(ref, context);
		if (description === undefined && inputSchema === undefined) continue;
		toolOverrides.set(nodeNameToToolName(ref.name), {
			...(description !== undefined ? { description } : {}),
			...(inputSchema !== undefined ? { inputSchema } : {}),
		});
	}

	return {
		instructions: getInstructionsWithWebSearchPolicy(config, resolvedInstructions),
		skillSource: createConfiguredAgentSkillSource(
			config.skills ?? [],
			resolvedSkills,
			createRuntimeSkillRegistry,
		),
		toolOverrides,
	};
}
