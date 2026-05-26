import { getConfigRulesSection, getSchemaReferenceSection } from './config-rules.prompt';

export function getConfigMutationPrompt(): string {
	return `\
## Config Mutation Guidance

### Purpose

Use this after deciding a config change is needed and before calling
\`read_config\`, \`write_config\`, or \`patch_config\`.

### Boundaries

- The user is only chatting or asking how the builder works.
- Choose model, memory, integration, tool, and research details before writing config.
- Do not use web results, prompt snapshots, or remembered config as a write base.

### Workflow

1. Call \`read_config\` immediately before every \`write_config\` or \`patch_config\`.
2. Use only the \`config\` and \`configHash\` returned by that same \`read_config\`.
3. For \`write_config\`, send the complete config JSON string plus \`baseConfigHash\`.
4. For \`patch_config\`, send RFC 6902 operations as a JSON string plus \`baseConfigHash\`.
5. Use JSON Pointer paths like \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\`.
6. On \`stage: "stale"\`, retry once from the returned \`config\` and \`configHash\`.
7. On parse, patch, or schema errors, fix the payload, call \`read_config\`
   again, and retry from the fresh \`configHash\`.

### Rules

${getConfigRulesSection()}

${getSchemaReferenceSection()}

- Follow the Config schema reference exactly; do not invent top-level fields.
- Keep each feature in the schema path where it belongs.
- Preserve unrelated existing config unless the user asked to change it.
- Never write placeholder instructions.
- Never copy credential IDs from \`list_credentials\`; use \`resolve_llm\`, \`ask_llm\`, or \`ask_credential\`.
- Valid provider tool keys are complete provider tool IDs documented in the Tool Guidance section.
- \`providerTools\` keys must be complete provider tool IDs from the valid key list.

### Recipes

#### Create Or Replace A Fresh Runnable Agent

- Requires \`name\`, \`model\`, \`credential\`, and \`instructions\`.
- Keep \`tools\` and \`skills\` arrays if present.

Good minimal shape:
\`\`\`json
{
  "name": "Support assistant",
  "model": "openrouter/openai/gpt-5.5",
  "credential": "<main-llm-credential-id>",
  "instructions": "Help the user with support questions.",
  "tools": [],
  "skills": []
}
\`\`\`

#### Update Only Instructions

Use \`patch_config\` with:
\`\`\`json
[{ "op": "replace", "path": "/instructions", "value": "New instructions" }]
\`\`\`

#### Add A Target-Agent Skill Ref

- If \`skills\` exists, append to \`/skills/-\`.
- If \`skills\` is missing, add \`/skills\` with an array.
- Ref shape: \`{ "type": "skill", "id": "<returned-id>" }\`.

#### Configure Native Provider Features

- Thinking lives under \`config.thinking\`.
- The write path fills native provider tool defaults. Do not invent provider tool keys.

#### Configure Fallback Services

- Services that require credentials must call \`ask_credential\` first.
- Persist only the credential id returned by \`ask_credential\`.
- If credential selection is skipped, do not enable the feature unless it supports missing credentials.

#### Add Node Or Workflow Tools

- Node and workflow tools live in \`tools[]\`.
- Use Tool Guidance for node/workflow details.
- Do not mix node tool config into \`config.*\` fields.

### Do Not Do This

Bad: inventing top-level fields
\`\`\`json
{ "temperature": 0.7 }
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
{ "config": { "thinking": { "provider": "anthropic", "budgetTokens": 1024 } } }
\`\`\`

### Gotchas

- \`write_config\` replaces the full config; include every field that should survive.
- \`patch_config\` cannot create a config when none exists; use \`write_config\` first.
- \`/array/-\` appends to an array; \`/array/0\` inserts before the current first item.
- Empty, placeholder, or guessed \`instructions\` are rejected; ask for details instead.

### Verify

- The final payload validates against the Config schema reference.
- Existing unrelated config, tools, skills, integrations, and memory remain present unless intentionally changed.
- Credential fields use ids returned by the correct interactive credential tools.
- Provider tool keys are valid and match the selected model provider.

### Error Recovery

- \`stage: "stale"\`: retry once from the returned \`config\` and \`configHash\`.
- \`stage: "parse"\`: fix JSON syntax, then call \`read_config\` before retrying.
- \`stage: "patch"\`: fix JSON Pointer paths or operation shape, then call \`read_config\` before retrying.
- \`stage: "schema"\`: compare the payload against the Config schema reference, then call \`read_config\` before retrying.
- \`ask_credential\` skipped: omit or disable the feature that required it.`;
}
