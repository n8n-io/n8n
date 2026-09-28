import { getConfigRulesSection, getSchemaReferenceSection } from './config-rules.prompt';

export function getConfigMutationPrompt(): string {
	return `\
## Config Mutation Guidance

### Purpose

Use this after deciding a config change is needed and before calling
\`agent_context({ type: "config" })\`, \`config_write\`, or \`config_patch\`.

### Workflow

Follow Config Freshness for authoritative reads, hashes, and stale recovery.
- For \`config_write\`, send the complete config JSON string plus \`baseConfigHash\`.
- For \`config_patch\`, send RFC 6902 operations as a JSON string plus \`baseConfigHash\`.
- Use JSON Pointer paths like \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\`.
- On parse, patch, or schema errors, fix the payload, call \`agent_context({ type: "config" })\`
  again, and retry from the fresh \`configHash\`.

### Rules

${getConfigRulesSection()}

${getSchemaReferenceSection()}

- Follow the Config schema reference exactly; do not invent top-level fields.
- Keep each feature in the schema path where it belongs.
- Preserve unrelated existing config unless the user asked to change it.
- Never write placeholder instructions, tool descriptions, or skill descriptions.
- Never copy credential IDs from \`credentials_list\`; use \`llm_resolve\` or \`credential_ask\`.
- Valid provider tool keys are complete provider tool IDs documented in the Tool Guidance section.
- \`providerTools\` keys must be complete provider tool IDs from the valid key list.

### Recipes

#### Create A Fresh Agent Draft

- Requires \`name\` and \`instructions\`.
- Use the model and credential from \`llm_resolve\` when resolved; while LLM
  setup is pending, write \`model: ""\` and omit \`credential\`.
- Keep \`tools\` and \`skills\` arrays if present.

Good minimal shape:
\`\`\`json
{
  "name": "Support assistant",
  "model": "",
  "instructions": "Help the user with support questions.",
  "tools": [],
  "skills": []
}
\`\`\`

#### Update Only Instructions

Use \`config_patch\` with:
\`\`\`json
[{ "op": "replace", "path": "/instructions", "value": "New instructions" }]
\`\`\`

#### Add A Target-Agent Skill Ref

- If \`skills\` exists, append to \`/skills/-\`.
- If \`skills\` is missing, add \`/skills\` with an array.
- Ref shape: \`{ "type": "skill", "id": "<returned-id>" }\`.

#### Remove An Existing Chat Integration

- Chat-channel removal is a config edit, not a \`channel_configure\` action.
- Call \`agent_context({ type: "config" })\` first and inspect \`config.integrations\`.
- If you know the exact array index to remove, prefer:
\`\`\`json
[{ "op": "remove", "path": "/integrations/1" }]
\`\`\`
- If replacing the whole list is clearer, replace \`/integrations\` with the
  filtered array of surviving entries.
- Omitting \`integrations\` preserves existing channels. To remove one, send an
  explicit \`remove\` op or an explicit filtered \`integrations\` array.

#### Configure Native Provider Features

- Reasoning effort lives under \`config.reasoning\` (\`low\`, \`medium\`, or \`high\`).
- Prompt caching follows Agent Config Rules above; the write path enforces it
  automatically.
- Web search lives under \`config.webSearch\`.
- Only OpenAI and Anthropic models support native web search. For those models, set
  \`config.webSearch = { "enabled": true, "provider": "native" }\` unless the
  user asks to disable web search. Omitting \`provider\` also means native.
- For every other provider, never use \`provider: "native"\` or omit
  \`provider\` for enabled web search.
- For Brave or SearXNG search, call \`credential_ask\`, then set
  \`config.webSearch = { "enabled": true, "provider": "brave" | "searxng", "credential": "<credentialId>" }\`.
- Brave and SearXNG remain fallback tools even when the model provider also supports native search.
- When patching only \`/model\` and \`/credential\`, do not patch
  \`/config/webSearch\` if the existing provider is \`"brave"\` or \`"searxng"\`
  unless the user explicitly asked to change the web-search method.
- Never write \`{ "enabled": true }\` alone for fallback search.
- The write path fills native provider tool defaults only for native search. Do not invent provider tool keys.

#### Configure Fallback Services

- Services that require credentials must call \`credential_ask\` first and persist only its returned credential id.
- If credential selection is skipped, do not enable the feature unless it supports missing credentials.
- For fallback web search, use exact credential type names: \`braveSearchApi\` for \`provider: "brave"\`, and \`searXngApi\` for \`provider: "searxng"\`.

#### Add Node Or Workflow Tools

- Node and workflow tools live in \`tools[]\`.
- Use Tool Guidance for node/workflow details.
- Do not mix node tool config into \`config.*\` fields.

### Do Not Do This

Bad: inventing top-level fields
\`\`\`json
{ "webSearch": { "enabled": true } }
\`\`\`

Bad: provider namespace as provider tool
\`\`\`json
{ "providerTools": { "anthropic": {} } }
\`\`\`

Bad: copying credential IDs from \`credentials_list\`
\`\`\`json
{ "credential": "<id-from-list_credentials>" }
\`\`\`

Bad: replacing \`config\` while dropping unrelated settings
\`\`\`json
{ "config": { "webSearch": { "enabled": true } } }
\`\`\`

### Gotchas

- \`config_write\` replaces the full config; include every field that should survive.
- \`config_patch\` cannot create a config when none exists; use \`config_write\` first.
- \`/array/-\` appends to an array; \`/array/0\` inserts before the current first item.
- Removing an integration means deleting its entry from \`integrations[]\`; do
  not call \`channel_configure\` for removal.
- Model-only changes must preserve existing Brave or SearXNG \`config.webSearch\`.
- Empty or placeholder \`instructions\` values are rejected; derive real instructions from the stated goal instead.

### Verify

- The final payload validates against the Config schema reference.
- Existing unrelated config, tools, skills, integrations, and memory remain present unless intentionally changed.
- Existing Brave or SearXNG web search remains present on model-only changes.
- Credential fields use ids returned by the correct interactive credential tools.
- Provider tool keys are valid and match the selected model provider.

### Error Recovery

- \`stage: "stale"\`: follow Config Freshness.
- \`stage: "parse"\`: fix JSON syntax, then call \`agent_context({ type: "config" })\` before retrying.
- \`stage: "patch"\`: fix JSON Pointer paths or operation shape, then call \`agent_context({ type: "config" })\` before retrying.
- \`stage: "schema"\`: compare the payload against the Config schema reference, then call \`agent_context({ type: "config" })\` before retrying.
- \`credential_ask\` skipped: omit or disable the feature that required it.`;
}
