import { getConfigRulesSection, getSchemaReferenceSection } from './config-rules.prompt';

export function getConfigMutationPrompt(): string {
	return `\
## Config Mutation Guidance

### Purpose

Use this after deciding a config change is needed and before calling
\`agent-context({ type: "config" })\`, \`agent_builder_write_config\`, or \`agent_builder_patch_config\`.

### Workflow

Follow Config Freshness for authoritative reads, hashes, and stale recovery.
- For \`agent_builder_write_config\`, send a \`config\` object with only the top-level fields
  you set or change, plus \`baseConfigHash\`. Omitted top-level fields keep
  their stored value, so do not copy \`model\`, \`credential\`, \`memory\`,
  \`personalisation\`, \`config\`, or \`integrations\` back unless you change them.
- For \`agent_builder_patch_config\`, send an array of RFC 6902 operation objects plus \`baseConfigHash\`.
- Send objects and arrays, not JSON strings.
- Pass the \`configHash\` from your latest config read or from your latest
  write result as \`baseConfigHash\`; do not read the config again between your
  own writes.
- Put every change you already know into one write. Do not split known changes
  across several \`agent_builder_patch_config\` calls.
- Use JSON Pointer paths like \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\`.
- On parse, patch, or schema errors, nothing was saved: fix the payload and
  retry with the same \`baseConfigHash\`.

### Rules

${getConfigRulesSection()}

${getSchemaReferenceSection()}

- Follow the Config schema reference exactly; do not invent top-level fields.
- Keep each feature in the schema path where it belongs.
- Preserve unrelated existing config unless the user asked to change it.
- Never write placeholder instructions, tool descriptions, or skill descriptions.
- Never copy credential IDs from \`agent_builder_list_credentials\`; use \`agent_builder_resolve_llm\` or \`agent_builder_ask_credential\`.
- Valid provider tool keys are complete provider tool IDs documented in the Tool Guidance section.
- \`providerTools\` keys must be complete provider tool IDs from the valid key list.

### Recipes

#### Create A Fresh Agent Draft

- Requires \`name\` and \`instructions\`.
- Use the model and credential from \`agent_builder_resolve_llm\` when resolved; while LLM
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

Use \`agent_builder_patch_config\` with:
\`\`\`json
[{ "op": "replace", "path": "/instructions", "value": "New instructions" }]
\`\`\`

#### Add A Target-Agent Skill Ref

- \`agent_builder_create_skills\` attaches its new skills itself; do not patch those refs in.
- To attach an existing, unattached skill: if \`skills\` exists, append to
  \`/skills/-\`; if \`skills\` is missing, add \`/skills\` with an array.
- Ref shape: \`{ "type": "skill", "id": "<skill-id>" }\`.

#### Remove An Existing Chat Integration

- Chat-channel removal is a config edit, not a \`agent_builder_configure_channel\` action.
- Call \`agent-context({ type: "config" })\` first and inspect \`config.integrations\`.
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
- For Brave or SearXNG search, call \`agent_builder_ask_credential\`, then set
  \`config.webSearch = { "enabled": true, "provider": "brave" | "searxng", "credential": "<credentialId>" }\`.
- Brave and SearXNG remain fallback tools even when the model provider also supports native search.
- When patching only \`/model\` and \`/credential\`, do not patch
  \`/config/webSearch\` if the existing provider is \`"brave"\` or \`"searxng"\`
  unless the user explicitly asked to change the web-search method.
- Never write \`{ "enabled": true }\` alone for fallback search.
- The write path fills native provider tool defaults only for native search. Do not invent provider tool keys.

#### Configure Fallback Services

- Services that require credentials must call \`agent_builder_ask_credential\` first and persist only its returned credential id.
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

Bad: copying credential IDs from \`agent_builder_list_credentials\`
\`\`\`json
{ "credential": "<id-from-agent_builder_list_credentials>" }
\`\`\`

Bad: replacing \`config\` while dropping unrelated settings
\`\`\`json
{ "config": { "webSearch": { "enabled": true } } }
\`\`\`

### Gotchas

- \`agent_builder_write_config\` keeps every top-level field you omit. A top-level field you
  send replaces the stored field whole: to change one key inside \`config\`
  (for example \`config.webSearch\`), use \`agent_builder_patch_config\` on that path instead.
- \`agent_builder_patch_config\` cannot create a config when none exists; use \`agent_builder_write_config\` first.
- \`/array/-\` appends to an array; \`/array/0\` inserts before the current first item.
- Removing an integration means deleting its entry from \`integrations[]\`; do
  not call \`agent_builder_configure_channel\` for removal.
- Model-only changes must preserve existing Brave or SearXNG \`config.webSearch\`.
- Empty or placeholder \`instructions\` values are rejected; derive real instructions from the stated goal instead.

### Verify

- The final payload validates against the Config schema reference.
- Existing unrelated config, tools, skills, integrations, and memory remain present unless intentionally changed.
- Existing Brave or SearXNG web search remains present on model-only changes.
- Credential fields use ids returned by the correct interactive credential tools.
- Provider tool keys are valid and match the selected model provider.

### Error Recovery

- \`stage: "stale"\`: the result carries the current \`config\` and \`configHash\`;
  re-apply your change to that config and retry once.
- \`stage: "parse"\`: fix JSON syntax and retry with the same \`baseConfigHash\`.
- \`stage: "patch"\`: fix JSON Pointer paths or operation shape and retry with the same \`baseConfigHash\`.
- \`stage: "schema"\`: compare the payload against the Config schema reference and retry with the same \`baseConfigHash\`.
- \`agent_builder_ask_credential\` skipped: omit or disable the feature that required it.`;
}
