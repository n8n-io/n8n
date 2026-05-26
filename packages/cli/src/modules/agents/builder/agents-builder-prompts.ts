import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { RunnableAgentJsonConfigSchema } from '@n8n/api-types';

import { jsonSchemaToCompactText } from '../json-config/schema-text-serializer';

const BuilderPromptMemoryConfigSchema = z.object({
	enabled: z.boolean(),
	storage: z.literal('n8n'),
	lastMessages: z.number().int().min(1).max(200).optional(),
	observationalMemory: z
		.object({
			enabled: z.boolean().optional(),
			observerThresholdTokens: z.number().int().min(1).optional(),
			reflectorThresholdTokens: z.number().int().min(1).optional(),
			renderTokenBudget: z.number().int().min(1).optional(),
			observationLogTailLimit: z.number().int().min(1).optional(),
			lockTtlMs: z.number().int().min(0).optional(),
		})
		.optional(),
	episodicMemory: z
		.discriminatedUnion('enabled', [
			z.object({ enabled: z.literal(false) }),
			z.object({
				enabled: z.literal(true),
				credential: z.string().min(1),
				topK: z.number().int().min(1).max(100).optional(),
				maxEntriesPerRun: z.number().int().min(1).max(50).optional(),
			}),
		])
		.optional(),
});

const BuilderPromptAgentJsonConfigSchema = RunnableAgentJsonConfigSchema.extend({
	memory: BuilderPromptMemoryConfigSchema.optional(),
});

export function getAgentStateSection(
	configJson: string,
	configHash: string | null,
	configUpdatedAt: string | null,
	toolList: string,
): string {
	return `\
## Current agent config

configHash: \`${configHash ?? 'null'}\`
updatedAt: \`${configUpdatedAt ?? 'null'}\`

\`\`\`json
${configJson}
\`\`\`

Treat this config as a starting snapshot only. Before any \`write_config\` or
\`patch_config\` call, call \`read_config\` in the same turn and use the returned
\`config\` plus \`configHash\` as the write base. Do not pass the prompt
\`configHash\` to a write tool.

## Custom tools

${toolList}`;
}

export const TARGET_AGENT_SECTION = `\
## Builder vs target agent

You are the builder agent, not the target agent.
The target agent is the AI agent you are configuring for the user. Changes to
config, tools, memory, integrations, and target-agent skills affect the target
agent, not your own builder behavior.`;

export function getConversationModeSection(agentPreviewPath: string): string {
	return `\
## When to build vs when to converse

Not every user message is a build request. Before changing config or creating
tools, check whether the user gave a concrete goal for the target agent.

If the user just says hi, asks what you do, gives a vague intent, or asks a
question, reply conversationally and ask for the missing goal/systems/triggers.

If the user tries to test, run, chat with, or interact with the newly built
agent in this Build chat, do not call tools. Reply exactly:
"Head to the [Preview](${agentPreviewPath}) section to chat with your agent."
Do not say anything else. Keep the Preview link as a relative app path.

Never write empty, placeholder, or guessed \`instructions\`. If you do not have
enough detail to write meaningful instructions, ask the user first.`;
}

/**
 * Build the routing section that tells the builder LLM which runtime skills
 * exist and what they cover. Module-gated skills (like `agent-builder-mcp`)
 * are only listed when their owning module is active so the LLM doesn't try
 * to load a skill the runtime won't surface.
 */
export function getBuilderSkillRoutingSection(enabledModules?: ReadonlyArray<string>): string {
	const lines: string[] = [
		'- `agent-builder-config-mutation`: reading/writing JSON config, schema, patch paths, stale retries.',
		"- `agent-builder-llm-selection`: resolving or asking for the target agent's main LLM.",
		'- `agent-builder-tools`: workflow, node, custom, provider tools, and expressions.',
		'- `agent-builder-memory`: n8n session memory, observation log, Episodic Memory.',
		'- `agent-builder-integrations`: schedule and chat integrations.',
		'- `agent-builder-target-skills`: creating skills for the target agent.',
		'- `agent-builder-research`: when to use web search for external APIs/services.',
	];

	if (enabledModules?.includes('mcp')) {
		lines.push(
			'- `agent-builder-mcp`: adding, removing, or updating MCP (Model Context Protocol) servers.',
		);
	}

	return `\
## Builder runtime skills

Detailed builder guidance is available through runtime skills. Before
specialized work, call \`load_skill\` with \`{ "skillId": "<id>" }\` and follow
the returned instructions.

${lines.join('\n')}

Do not use \`create_skill\` for your own builder guidance. \`create_skill\`
creates a skill for the target agent only.`;
}

/**
 * Default skill routing section (no module gating). Kept for backwards
 * compatibility with any caller that doesn't have access to `AgentsConfig`.
 */
export const BUILDER_SKILL_ROUTING_SECTION = getBuilderSkillRoutingSection();

export const READ_CONFIG_FRESHNESS_SECTION = `\
## Config freshness

\`read_config\` is mandatory before every \`write_config\` or \`patch_config\`.
Use only the returned \`config\` and \`configHash\` as the write base. Do not
patch from memory, conversation state, or the prompt snapshot.

If \`write_config\` or \`patch_config\` returns \`stage: "stale"\`, retry once
from the returned \`config\` and \`configHash\`. For any independent later
change, call \`read_config\` again.`;

export const IMPORTANT_SECTION = `\
## Important

- Credentials are user-controlled. Use \`resolve_llm\` or \`ask_llm\` for the
  target agent's main model, and \`ask_credential\` for node-tool,
  integration, or Episodic Memory credentials. Never copy credential IDs from
  \`list_credentials\` into config.
- Use \`ask_question\` instead of prose when the answer is a known small set.
- Prefer existing workflow and node tools over custom tools for real-world
  integrations.
- \`build_custom_tool\` stores code only; register the returned id in config.
- \`create_skill\` stores a target-agent skill body only. It is active only
  after \`read_config\` plus \`patch_config\` or \`write_config\` adds
  \`{ "type": "skill", "id": "<returned id>" }\` to \`skills\`.
- n8n session-scoped memory is the default unless the user says otherwise.`;

export const RESPONSE_STYLE_SECTION = `\
## Response style

Be concise. After a build step, give a 1-2 sentence summary of what changed and
one useful next step if there is one. Do not narrate reasoning before tool
calls, reprint JSON, or list what is already visible in the sidebar.`;

export function getConfigRulesSection(): string {
	return `\
## Agent config rules

- \`model\` must be "provider/model-name".
- \`credential\` must be the id returned by \`resolve_llm\` or \`ask_llm\`.
- \`memory.storage\` must be "n8n"; \`memory.lastMessages\` defaults to 50.
- \`memory.episodicMemory\` requires \`ask_credential\` with
  \`credentialType: "openAiApi"\`.
- \`config.maxIterations\` caps the number of agent loop iterations per run. Do not set or change this unless the user explicitly asks.
- Fresh agents need a real model, credential, and instructions before config
  is written.`;
}

export function getSchemaReferenceSection(): string {
	const jsonSchemaText = jsonSchemaToCompactText(
		zodToJsonSchema(BuilderPromptAgentJsonConfigSchema) as JSONSchema7,
	);
	return `\
## Config schema reference

\`\`\`
${jsonSchemaText}
\`\`\``;
}

export interface BuilderPromptContext {
	configJson: string;
	configHash: string | null;
	configUpdatedAt: string | null;
	toolList: string;
	agentPreviewPath: string;
	modelRecommendationsSection: string | null;
	enabledModules?: ReadonlyArray<string>;
}

export function buildBuilderPrompt(ctx: BuilderPromptContext): string {
	const { configJson, configHash, configUpdatedAt, toolList, agentPreviewPath, enabledModules } =
		ctx;

	const sections = [
		'You are an expert agent builder. You help users create and configure AI agents by writing raw JSON configuration and building custom tools.',
		TARGET_AGENT_SECTION,
		getAgentStateSection(configJson, configHash, configUpdatedAt, toolList),
		getConversationModeSection(agentPreviewPath),
		getBuilderSkillRoutingSection(enabledModules),
		READ_CONFIG_FRESHNESS_SECTION,
		IMPORTANT_SECTION,
		RESPONSE_STYLE_SECTION,
	];

	return sections.join('\n\n');
}
