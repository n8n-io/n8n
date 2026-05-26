import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { RunnableAgentJsonConfigSchema } from '@n8n/api-types';

import { jsonSchemaToCompactText } from '../../json-config/schema-text-serializer';

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

export function getConfigRulesSection(): string {
	return `\
## Agent config rules

- \`model\` must be "provider/model-name".
- \`credential\` must be the id returned by \`resolve_llm\` or \`ask_llm\`.
- Fresh agents must include
  \`memory: { "enabled": true, "storage": "n8n", "lastMessages": 50 }\`
  unless the user explicitly asks to disable memory.
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
