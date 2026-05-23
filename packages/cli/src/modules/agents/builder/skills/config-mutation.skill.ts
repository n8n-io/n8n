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
			'Use when reading, writing, replacing, or patching the target-agent JSON config with read_config, write_config, or patch_config; covers schema paths, JSON Patch, stale retries, config preservation, credentials, and web-search config validation.',
		instructions: `\
## Purpose

Use this after deciding a config change is needed and before calling
\`read_config\`, \`write_config\`, or \`patch_config\`.

## Boundaries

- The user is only chatting or asking how the builder works.
- Choose model, memory, integration, tool, and research details before writing config.
- Do not use web results, prompt snapshots, or remembered config as a write base.

## Workflow

1. Call \`read_config\` immediately before every \`write_config\` or \`patch_config\`.
2. Use only the \`config\` and \`configHash\` returned by that same \`read_config\`.
3. For \`write_config\`, send the complete config JSON string plus \`baseConfigHash\`.
4. For \`patch_config\`, send RFC 6902 operations as a JSON string plus \`baseConfigHash\`.
5. Use JSON Pointer paths like \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\`.
6. On \`stage: "stale"\`, retry once from the returned \`config\` and \`configHash\`.
7. On parse, patch, or schema errors, fix the payload, call \`read_config\`
   again, and retry from the fresh \`configHash\`.

## Rules

${getConfigRulesSection()}

${getSchemaReferenceSection()}

- Follow the Config schema reference exactly; do not invent top-level fields.
- Keep each feature in the schema path where it belongs.
- Preserve unrelated existing config unless the user asked to change it.
- Never write placeholder instructions.
- Never copy credential IDs from \`list_credentials\`; use \`resolve_llm\`, \`ask_llm\`, or \`ask_credential\`.
- Valid provider tool keys are exactly: ${formatValidProviderToolNames()}.
- Never use provider namespace keys such as \`anthropic\`, \`openai\`, or \`google\` in \`providerTools\`.

## Recipes

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
- For Anthropic, OpenAI, or Google models, set \`config.webSearch.enabled = true\` unless the user asks to disable web search.
- The write path fills native provider tool defaults. Do not invent provider tool keys.
- If the model provider does not support native web search, only keep web search enabled when a fallback provider and credential are configured.

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

## Gotchas

- \`write_config\` replaces the full config; include every field that should survive.
- \`patch_config\` cannot create a config when none exists; use \`write_config\` first.
- \`/array/-\` appends to an array; \`/array/0\` inserts before the current first item.
- Empty, placeholder, or guessed \`instructions\` are rejected; ask for details instead.
- Native web search provider tools are normalized from \`config.webSearch\` and the selected model provider.

## Verify

- The final payload validates against the Config schema reference.
- Existing unrelated config, tools, skills, integrations, and memory remain present unless intentionally changed.
- Credential fields use ids returned by the correct interactive credential tools.
- Provider tool keys are valid and match the selected model provider.

## Error recovery

- \`stage: "stale"\`: retry once from the returned \`config\` and \`configHash\`.
- \`stage: "parse"\`: fix JSON syntax, then call \`read_config\` before retrying.
- \`stage: "patch"\`: fix JSON Pointer paths or operation shape, then call \`read_config\` before retrying.
- \`stage: "schema"\`: compare the payload against the Config schema reference, then call \`read_config\` before retrying.
- \`ask_credential\` skipped: omit or disable the feature that required it.`,
	};
}
