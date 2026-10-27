import type { RuntimeSkill } from '@n8n/agents';

import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

export function resourceLocatorsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-resource-locators',
		name: 'Agent Builder Resource Locators',
		description:
			'Use when adding or changing node tools with stable dynamic selector fields: resourceLocator, loadOptionsMethod, loadOptions routing, "Name or ID" parameters, teamId, channelId, projectId, calendarId, databaseId, tableId, model selectors, or when agent_builder_write_config/agent_builder_patch_config rejects $fromAI on dynamic selector.',
		recommendedTools: [
			'search_nodes',
			'get_node_types',
			'setup_credentials',
			'get_node_parameter_options',
			'agent-context',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'search_nodes',
			'get_node_types',
			'setup_credentials',
			'get_node_parameter_options',
			'agent_builder_ask_questions',
			'agent-context',
			'agent_builder_patch_config',
			'agent_builder_write_config',
		],
		instructions: `\
## Purpose

Set node-tool parameters that must be resolved at build time through
node metadata and live options. These fields represent stable IDs or resource
locator values target agent cannot reliably guess at runtime.

## Use when

- You are adding or changing node tool and parameter is stable resource
  selector, such as Linear \`teamId\`, Slack channel, project, calendar, board,
  database, table, model, folder, or other "Name or ID" field.
- \`get_node_types\` shows parameter with \`type: "resourceLocator"\`,
  \`typeOptions.loadOptionsMethod\`, or \`typeOptions.loadOptions\`.
- \`agent_builder_write_config\` or \`agent_builder_patch_config\` rejects node parameter with dynamic
  selector / \`get_node_parameter_options\` error.

## Initial-build timing

${INITIAL_BUILD_NOTE} If tool needs credential to resolve stable
selector, skip adding that tool for now instead of blocking rest of
build. Include credential in trailing \`agent_builder_finish_setup\` call, then run
option lookup with returned credential in same turn and write
config mutation only when result is unambiguous (exact or single
filtered match). If options remain ambiguous, do not call \`agent_builder_ask_questions\` —
leave tool deferred and add one-line setup checklist item naming
pending selection; resolve it in later turn. In addition to existing
agent, resolve credential and any ambiguity immediately instead.

## Workflow

1. Inspect node with \`get_node_types\`. Use node results
   from \`agent-context\` integration lookup and definitions you already
   fetched. Call \`search_nodes\` (with \`scope: "agent_tool"\`) only when no lookup returned node.
2. Identify dynamic selectors from node metadata. Treat these as build-time
   lookup fields:
   - \`type: "resourceLocator"\`
   - \`typeOptions.loadOptionsMethod\`
   - \`typeOptions.loadOptions\`
   - labels such as "Name or ID" when they map to stable resource IDs
3. Build current static \`nodeParameters\` first: \`resource\`,
   \`operation\`, authentication mode, and any parent selectors already known.
   Dynamic lookups often depend on those values.
4. If node needs credentials, call
   \`setup_credentials({ target: "agent", credentials: [{ credentialType: "<type from node metadata>", reason: "..." }] })\`
   before resolving selector. Pass returned \`credentials\` object to
   \`get_node_parameter_options\`.
5. Call \`get_node_parameter_options\` with:
   - \`nodeType\` and \`version\` from discovery
   - \`parameterPath\`, for example \`teamId\` or \`additionalFields.teamId\`
   - current \`nodeParameters\`
   - returned \`credentials\`, when available
   - \`filter\` when user named specific team, channel, project, or object
6. If results are ambiguous, use \`agent_builder_ask_questions\` with returned option
   names (existing agents only — during initial build, defer per
   Initial-build timing above). If many pages, retry with
   \`paginationToken\` or narrower \`filter\`.
7. Write selected result's \`parameterValue\` exactly into
   \`nodeParameters\`. For resource locators this is object with \`__rl\`,
   \`mode\`, and \`value\`; for classic dynamic options this is raw ID/value.

## Rules

- Do not use \`$fromAI\` for stable dynamic selectors. Target agent usually
  cannot know private workspace IDs such as Linear team IDs.
- Use \`$fromAI\` for runtime content values target agent should decide,
  such as issue title, message body, description, query text, priority chosen
  from user context, date ranges, counts, or booleans.
- Never invent resource IDs, credential IDs, node type names, parameter paths,
  or provider tool keys.
- If \`get_node_parameter_options\` returns \`missing_credentials\`, call
  \`setup_credentials\` with \`target: "agent"\` and \`credentials\` entry for each
  returned credential type, then retry. Do not
  fall back to \`$fromAI\` for required stable selector.
- If user skips credentials and no exact ID is otherwise available, explain
  selector cannot be resolved yet. Ask for credential or exact ID
  instead of hiding problem behind \`$fromAI\`.
- Resolve parent selectors before child selectors. For example, resolve
  workspace/team/project before fields that depend on it.

## Recovery From Config Errors

When \`agent_builder_write_config\` or \`agent_builder_patch_config\` rejects dynamic selector using
\`$fromAI\`:

1. Read error path to find offending node parameter.
2. Inspect node metadata if needed.
3. Resolve parameter with \`get_node_parameter_options\`.
4. Patch config by replacing only that parameter with returned
   \`parameterValue\`.

## Example

For Linear "Create Issue" node tool:

1. Use \`resource: "issue"\`, \`operation: "create"\`, and selected
   authentication mode in \`nodeParameters\`.
2. Call
   \`setup_credentials({ target: "agent", credentials: [{ credentialType: "linearApi", reason: "Create Linear issues" }] })\`.
3. Call \`get_node_parameter_options\` for \`parameterPath: "teamId"\` with
   those \`nodeParameters\` and credentials.
4. Write selected team's \`parameterValue\` to \`teamId\`.
5. Use \`$fromAI\` for runtime issue content such as \`title\` and
   \`additionalFields.description\`.

## Verify

- Every required stable selector has resolved \`parameterValue\`, not
  \`$fromAI\`.
- Runtime content fields still use \`$fromAI\` where target agent should
  decide them.
- Node credentials come from \`setup_credentials(target: "agent")\`; no credential IDs are invented.
- Validation error about dynamic selectors has been fixed by replacing
  rejected field, not by changing unrelated config.`,
	};
}
