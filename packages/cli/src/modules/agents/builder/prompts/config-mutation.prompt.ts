import { getConfigRulesSection, getSchemaReferenceSection } from './config-rules.prompt';

export function getConfigMutationPrompt(): string {
	return `\
## Config Mutation Guidance

### Purpose

Use after deciding config change is needed and before calling
\`agent-context({ type: "config" })\`, \`agent_builder_write_config\`, or \`agent_builder_patch_config\`.

### Workflow

Follow Config Freshness for authoritative reads, hashes, and stale recovery.
- For \`agent_builder_write_config\`, send \`config\` object with only top-level fields
  you set or change, plus \`baseConfigHash\`. Omitted top-level fields keep
  stored value, so do not copy \`model\`, \`credential\`, \`memory\`,
  \`personalisation\`, \`config\`, or \`integrations\` back unless you change them.
- For \`agent_builder_patch_config\`, send array of RFC 6902 operation objects plus \`baseConfigHash\`.
- Send objects and arrays, not JSON strings.
- Pass \`configHash\` from latest config read or latest
  write result as \`baseConfigHash\`; do not read config again between your
  own writes.
- Put every change you already know into one write. Do not split known changes
  across several \`agent_builder_patch_config\` calls.
- Use JSON Pointer paths like \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\`.
- On parse, patch, or schema errors, nothing was saved: fix payload and
  retry with same \`baseConfigHash\`.

### Rules

${getConfigRulesSection()}

${getSchemaReferenceSection()}

- Follow Config schema reference exactly; do not invent top-level fields.
- Keep each feature in schema path where it belongs.
- Preserve unrelated existing config unless user asked to change it.
- When removing or renaming field, inspect main instructions, tool
  definitions, and every skill attached in latest config. Read every
  attached skill body and its reference files; do not rely on descriptions to
  find field references. Use \`agent-context({ type: "config" })\` for attached
  refs, then read each skill with \`agent-context({ type: "skill", skillId })\`.
  Pass every listed path in \`referencePaths\` so you can search its content.
  Update every match to fit new schema.
- Before updating any affected skill, use \`agent_builder_ask_questions\` to ask
  user to confirm skill changes. Builder context does not show who
  else uses skill, so treat it as potentially shared. \`agent_builder_update_skill\`
  saves new version that every draft following latest version will use.
  If user does not clearly confirm, leave skill unchanged and explain
  mismatch and lost behavior. If function loses its storage, tell user.
- Never write placeholder instructions, tool descriptions, or skill descriptions.
- Never copy credential IDs from credential list; use \`agent_builder_resolve_llm\` or \`setup_credentials(target: "agent")\`.
- \`providerTools\` keys must be complete provider tool IDs from valid key list documented in Tool Guidance section.

### Recipes

#### Create A Fresh Agent Draft

- Requires \`name\` and \`instructions\`.
- Use model and credential from \`agent_builder_resolve_llm\` when resolved; while LLM
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
- To attach existing, unattached skill: if \`skills\` exists, append to
  \`/skills/-\`; if \`skills\` is missing, add \`/skills\` with array.
- Ref shape: \`{ "type": "skill", "id": "<skill-id>" }\`.
- Ref with \`versionId\` pins that saved version of skill. To use latest
  version, remove \`versionId\` from ref with \`patch_config\`. Do not remove
  skill and add it again.

#### Remove An Existing Chat Integration

- Chat-channel removal is config edit, not \`agent_builder_configure_channel\` action.
- Call \`agent-context({ type: "config" })\` first and inspect \`config.integrations\`.
- If you know exact array index to remove, prefer:
\`\`\`json
[{ "op": "remove", "path": "/integrations/1" }]
\`\`\`
- If replacing whole list is clearer, replace \`/integrations\` with
  filtered array of surviving entries.
- Omitting \`integrations\` preserves existing channels. To remove one, send
  explicit \`remove\` op or explicit filtered \`integrations\` array.

#### Configure Native Provider Features

- Reasoning effort lives under \`config.reasoning\` (\`low\`, \`medium\`, or \`high\`).
- Prompt caching follows Agent Config Rules above; write path enforces it
  automatically.
- Web search lives under \`config.webSearch\`.
- Do not enable \`config.webSearch\` before model is resolved. Set it in
  same mutation that writes resolved model. If \`config.webSearch\` is
  already enabled, keep it enabled unless user asked to turn it off.
  Unresolved model is not reason to disable it.
- Only OpenAI and Anthropic models support native web search. For those models, set
  \`config.webSearch = { "enabled": true, "provider": "native" }\` unless
  user asks to disable web search. Omitting \`provider\` also means native.
  Use native search by default only for fresh agent or agent with no
  existing \`config.webSearch\`.
- For every other provider, never use \`provider: "native"\` or omit
  \`provider\` for enabled web search.
- For Brave or SearXNG search, call \`setup_credentials(target: "agent")\`, then set
  \`config.webSearch = { "enabled": true, "provider": "brave" | "searxng", "credential": "<credentialId>" }\`.
- Brave and SearXNG remain fallback tools even when model provider also supports native search.
- When patching only \`/model\` and \`/credential\`, do not patch
  \`/config/webSearch\` if existing provider is \`"brave"\` or \`"searxng"\`
  unless user explicitly asked to change web-search method.
- Never write \`{ "enabled": true }\` alone for fallback search.
- Write path fills native provider tool defaults only for native search. Do not invent provider tool keys.

#### Configure Fallback Services

- Services that require credentials must call \`setup_credentials(target: "agent")\` first and persist only its returned credential id.
- If credential selection is skipped, do not enable feature unless it supports missing credentials.
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

Bad: copying credential IDs from a credential list
\`\`\`json
{ "credential": "<id-from-credentials-list>" }
\`\`\`

Bad: replacing \`config\` while dropping unrelated settings
\`\`\`json
{ "config": { "webSearch": { "enabled": true } } }
\`\`\`

### Gotchas

- \`agent_builder_write_config\` keeps every top-level field you omit. Top-level field you
  send replaces stored field whole: to change one key inside \`config\`
  (for example \`config.webSearch\`), use \`agent_builder_patch_config\` on that path instead.
- \`agent_builder_patch_config\` cannot create config when none exists; use \`agent_builder_write_config\` first.
- \`/array/-\` appends to array; \`/array/0\` inserts before current first item.
- Removing integration means deleting its entry from \`integrations[]\`; do
  not call \`agent_builder_configure_channel\` for removal.
- Model-only changes must preserve existing Brave or SearXNG \`config.webSearch\`.
- Empty or placeholder \`instructions\` values are rejected; derive real instructions from stated goal instead.

### Verify

- Final payload validates against Config schema reference.
- Existing unrelated config, tools, skills, integrations, and memory remain present unless intentionally changed.
- Existing Brave or SearXNG web search remains present on model-only changes.
- Credential fields use ids returned by correct interactive credential tools.
- Provider tool keys are valid and match selected model provider.

### Error Recovery

- \`stage: "stale"\`: result carries current \`config\` and \`configHash\`;
  re-apply your change to that config and retry once.
- \`stage: "parse"\`: fix JSON syntax and retry with same \`baseConfigHash\`.
- \`stage: "patch"\`: fix JSON Pointer paths or operation shape and retry with same \`baseConfigHash\`.
- \`stage: "schema"\`: compare payload against Config schema reference and retry with same \`baseConfigHash\`.
- \`setup_credentials(target: "agent")\` lists type in \`skipped\`: omit or disable feature that required it.`;
}
