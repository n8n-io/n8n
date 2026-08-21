import { AgentJsonConfigBaseSchema, AgentModelSchema } from '@n8n/api-types';
import type { JSONSchema7 } from 'json-schema';
import type { ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { jsonSchemaToCompactText } from '../../json-config/schema-text-serializer';

const BuilderPromptMemoryWorkerModelSchema = z.object({
	model: AgentModelSchema,
	credential: z.string().trim().min(1),
});

const BuilderPromptMemoryConfigSchema = z.object({
	enabled: z.boolean(),
	storage: z.literal('n8n'),
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

const BuilderPromptAgentJsonConfigSchema = AgentJsonConfigBaseSchema.extend({
	memory: BuilderPromptMemoryConfigSchema.optional(),
});

export function getConfigRulesSection(): string {
	return `\
#### Agent Config Rules

- \`model\` must be "provider/model-name", or \`""\` while LLM setup is pending.
- A non-empty \`credential\` must be the id returned by \`resolve_llm\`.
- Sub-agent configuration lives at top level under \`subAgents\`. Load
  \`agent-builder-sub-agents\` before adding refs or changing
  \`subAgents.maxChildren\`.
- For OpenAI and Anthropic models, always include
  \`config.promptCaching: { "enabled": true }\` — this is mandatory and must
  never be disabled, even if the user asks. Omit \`config.promptCaching\`
  entirely for every other provider. For Anthropic only, you may set
  \`config.promptCaching.anthropic.ttl\` to \`"5m"\` or \`"1h"\` (default
  \`"1h"\`) when the user asks to tune cache duration; OpenAI has no
  sub-config.
- \`config.maxIterations\` caps the number of agent loop iterations per run. Do not set or change this unless the user explicitly asks.
- Fresh agents need real \`instructions\` before config is written. \`model\`
  may be \`""\` and \`credential\` omitted in a draft while LLM setup is
  pending; fill both from a \`resolve_llm\` result before publishing.`;
}

export function getSchemaReferenceSection(): string {
	const zodSchema: ZodObject<ZodRawShape> = BuilderPromptAgentJsonConfigSchema;
	const jsonSchemaText = jsonSchemaToCompactText(zodToJsonSchema(zodSchema) as JSONSchema7);
	return `\
#### Config Schema Reference

\`\`\`text
${jsonSchemaText}
\`\`\``;
}
