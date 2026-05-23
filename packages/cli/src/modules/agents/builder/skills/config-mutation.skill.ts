import type { RuntimeSkill } from '@n8n/agents';
import { getValidProviderToolNames } from '@n8n/api-types';

import { getConfigRulesSection, getSchemaReferenceSection } from '../agents-builder-prompts';

function formatValidProviderToolNames(): string {
	return getValidProviderToolNames()
		.map((toolName) => `\`${toolName}\``)
		.join(', ');
}

export function configMutationSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-config-mutation',
		name: 'Agent builder config mutation',
		description:
			'Use before reading, writing, replacing, or patching the target agent JSON config.',
		instructions: `\
Use this skill whenever you call \`read_config\`, \`write_config\`, or \`patch_config\`.

## Required flow

1. Call \`read_config\` immediately before every \`write_config\` or \`patch_config\`.
2. Use only the \`config\` and \`configHash\` returned by that same \`read_config\`.
3. For \`write_config\`, send the complete config JSON string plus \`baseConfigHash\`.
4. For \`patch_config\`, send RFC 6902 operations as a JSON string plus \`baseConfigHash\`.
5. Use JSON Pointer paths like \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\`.
6. On \`stage: "stale"\`, retry once from the returned \`config\` and \`configHash\`.
7. On parse, patch, or schema errors, fix the payload before trying again.

## Schema source of truth

${getConfigRulesSection()}

${getSchemaReferenceSection()}

Rules:
- Follow the Config schema reference exactly; do not invent top-level fields.
- Keep each feature in the schema path where it belongs.
- Preserve unrelated existing config unless the user asked to change it.
- Never write placeholder instructions.
- Never copy credential IDs from \`list_credentials\`; use \`resolve_llm\`, \`ask_llm\`, or \`ask_credential\`.
- Valid provider tool keys are exactly: ${formatValidProviderToolNames()}.
- \`providerTools\` keys must be complete provider tool IDs from the valid key list.

## Common recipes

### Create or replace a fresh runnable agent

- Requires \`name\`, \`model\`, \`credential\`, and \`instructions\`.
- Fresh agents include enabled n8n memory unless the user explicitly asks to disable memory.
- Keep \`tools\` and \`skills\` arrays if present.

Good minimal shape:
\`\`\`json
{
  "name": "Support assistant",
  "model": "openrouter/openai/gpt-5.5",
  "credential": "<main-llm-credential-id>",
  "instructions": "Help the user with support questions.",
  "memory": {
    "enabled": true,
    "storage": "n8n",
    "lastMessages": 50
  },
  "tools": [],
  "skills": []
}
\`\`\`

### Update only instructions

Use \`patch_config\` with:
\`\`\`json
[{ "op": "replace", "path": "/instructions", "value": "New instructions" }]
\`\`\`

### Enable or update memory

Use n8n session memory:
\`\`\`json
{
  "memory": {
    "enabled": true,
    "storage": "n8n",
    "lastMessages": 50
  }
}
\`\`\`

For Episodic Memory, call \`ask_credential\` with \`credentialType: "openAiApi"\` first, then set \`memory.episodicMemory\` with the returned credential id.

### Add a target-agent skill ref

- If \`skills\` exists, append to \`/skills/-\`.
- If \`skills\` is missing, add \`/skills\` with an array.
- Ref shape: \`{ "type": "skill", "id": "<returned-id>" }\`.

### Configure native provider features

- Thinking lives under \`config.thinking\`.
- Web search lives under \`config.webSearch\`.
- For Anthropic and OpenAI models, set \`config.webSearch.enabled = true\` unless the user asks to disable web search.
- For every other provider, web search must use fallback search: set
  \`config.webSearch = { "enabled": true, "provider": "brave" | "searxng", "credential": "<credentialId>" }\`
  after calling \`ask_credential\` for the matching search credential.
- Do not write \`{ "enabled": true }\` alone for non-Anthropic/OpenAI providers;
  the write path treats that as unsupported native web search and removes it.
- The write path fills native provider tool defaults. Do not invent provider tool keys.

### Configure fallback services

- Services that require credentials must call \`ask_credential\` first.
- Persist only the credential id returned by \`ask_credential\`.
- If credential selection is skipped, do not enable the feature unless it supports missing credentials.
- For fallback web search, use exact credential type names: \`braveSearchApi\` for \`provider: "brave"\`, and \`searXngApi\` for \`provider: "searxng"\`.

### Add node or workflow tools

- Node and workflow tools live in \`tools[]\`.
- Use \`agent-builder-tools\` for node/workflow details.
- Do not mix node tool config into \`config.*\` fields.

## Do not do this

Bad: inventing top-level fields
\`\`\`json
{ "webSearch": { "enabled": true } }
\`\`\`

Bad: provider namespace as provider tool
\`\`\`json
{ "providerTools": { "anthropic": {} } }
\`\`\`

Bad: copying credential IDs from \`list_credentials\`
\`\`\`json
{ "credential": "<id-from-list_credentials>" }
\`\`\`

Bad: replacing \`config\` while dropping unrelated settings
\`\`\`json
{ "config": { "webSearch": { "enabled": true } } }
\`\`\`

## Error recovery

- \`stage: "stale"\`: retry once from the returned \`config\` and \`configHash\`.
- \`stage: "parse"\`: fix JSON syntax.
- \`stage: "patch"\`: fix JSON Pointer paths or operation shape.
- \`stage: "schema"\`: compare the payload against the Config schema reference.
- \`ask_credential\` skipped: omit or disable the feature that required it.`,
	};
}
