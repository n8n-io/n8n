import type { JSONSchema7 } from 'json-schema';
import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { AgentModelSchema, RunnableAgentJsonConfigSchema } from '@n8n/api-types';

import { jsonSchemaToCompactText } from '../../json-config/schema-text-serializer';

const BuilderPromptMemoryWorkerModelSchema = z.object({
	model: AgentModelSchema,
	credential: z.string().trim().min(1),
});

const BuilderPromptMemoryConfigSchema = z.object({
	enabled: z.boolean(),
	storage: z.literal('n8n'),
	lastMessages: z.number().int().min(1).max(200).optional(),
	observationalMemory: z
		.object({
			enabled: z.boolean().optional(),
			observerModel: BuilderPromptMemoryWorkerModelSchema.optional(),
			reflectorModel: BuilderPromptMemoryWorkerModelSchema.optional(),
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
				extractorModel: BuilderPromptMemoryWorkerModelSchema.optional(),
				reflectorModel: BuilderPromptMemoryWorkerModelSchema.optional(),
				topK: z.number().int().min(1).max(100).optional(),
				maxEntriesPerRun: z.number().int().min(1).max(50).optional(),
			}),
		])
		.optional(),
});

const BuilderPromptAgentJsonConfigSchema = RunnableAgentJsonConfigSchema.extend({
	memory: BuilderPromptMemoryConfigSchema.optional(),
});

export function getConfigRulesSection(): string {
	return `\
#### Agent Config Rules

- \`model\` must be "provider/model-name".
- \`credential\` must be the id returned by \`resolve_llm\` or \`ask_llm\`.
- Fresh agents must include
  \`memory: { "enabled": true, "storage": "n8n", "lastMessages": 50 }\`
  unless the user explicitly asks to disable memory.
- \`memory.storage\` must be "n8n"; \`memory.lastMessages\` defaults to 50.
- \`memory.episodicMemory\` requires \`ask_credential\` with
  \`credentialType: "openAiApi"\`.
- Memory worker model fields use \`{ "model": "provider/model-name", "credential": "<credentialId>" }\`;
  use only credential IDs returned by \`resolve_llm\`, \`ask_llm\`, or \`ask_credential\`.
- Web search lives under \`config.webSearch\`. Only OpenAI and Anthropic models
  support native web search; for those providers, use
  \`{ "enabled": true, "provider": "native" }\` or omit \`provider\`. Every
  other provider requires fallback search with \`provider: "brave"\` or
  \`provider: "searxng"\` and a credential. Never write \`{ "enabled": true }\`
  alone for fallback search. Use exact \`ask_credential\` types:
  \`braveSearchApi\` for Brave and \`searXngApi\` for SearXNG.
- Preserve existing Brave/SearXNG \`config.webSearch\` on model switches unless
  the user explicitly asks to change web-search method.
- \`config.maxIterations\` caps the number of agent loop iterations per run. Do not set or change this unless the user explicitly asks.
- Fresh agents need a real model, credential, and instructions before config
  is written.`;
}

export function getSchemaReferenceSection(enabledModules: string[]): string {
	let zodSchema: ZodObject<ZodRawShape> = BuilderPromptAgentJsonConfigSchema;
	// don't let agent know about MCP servers if it's not enabled
	if (!enabledModules.includes('mcp')) {
		zodSchema = zodSchema.omit({
			mcpServers: true,
		});
	}
	const jsonSchemaText = jsonSchemaToCompactText(zodToJsonSchema(zodSchema) as JSONSchema7);
	return `\
#### Config Schema Reference

\`\`\`text
${jsonSchemaText}
\`\`\``;
}
