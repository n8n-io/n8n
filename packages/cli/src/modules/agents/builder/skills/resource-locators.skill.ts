import type { RuntimeSkill } from '@n8n/agents';

import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

export function resourceLocatorsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-resource-locators',
		name: 'Agent Builder Resource Locators',
		description:
			'Use when adding or changing node tools with stable dynamic selector fields: resourceLocator, loadOptionsMethod, loadOptions routing, "Name or ID" parameters, teamId, channelId, projectId, calendarId, databaseId, tableId, model selectors, or when agent_builder_write_config/agent_builder_patch_config rejects $fromAI on a dynamic selector.',
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

Use this to set node-tool parameters that must be resolved at build time through
node metadata and live options. These fields represent stable IDs or resource
locator values that the target agent cannot reliably guess at runtime.

## Use when

- You are adding or changing a node tool and a parameter is a stable resource
  selector, such as Linear \`teamId\`, Slack channel, project, calendar, board,
  database, table, model, folder, or another "Name or ID" field.
- \`get_node_types\` shows a parameter with \`type: "resourceLocator"\`,
  \`typeOptions.loadOptionsMethod\`, or \`typeOptions.loadOptions\`.
- \`agent_builder_write_config\` or \`agent_builder_patch_config\` rejects a node parameter with a dynamic
  selector / \`get_node_parameter_options\` error.

## Initial-build timing

${INITIAL_BUILD_NOTE} If the tool needs a credential to resolve a stable
selector, skip adding that tool for now instead of blocking the rest of the
build. Include the credential in the trailing \`agent_builder_finish_setup\` call, then run
the option lookup with the returned credential in the same turn and write the
config mutation only when the result is unambiguous (an exact or single
filtered match). If options remain ambiguous, do not call \`agent_builder_ask_questions\` —
leave the tool deferred and add a one-line setup checklist item naming the
pending selection; resolve it in a later turn. In an addition to an existing
agent, resolve the credential and any ambiguity immediately instead.

## Workflow

1. Inspect the node with \`get_node_types\`. Use the node results
   from the \`agent-context\` integration lookup and the definitions you already
   fetched. Call \`search_nodes\` (with \`scope: "agent_tool"\`) only when no lookup returned the node.
2. Identify dynamic selectors from node metadata. Treat these as build-time
   lookup fields:
   - \`type: "resourceLocator"\`
   - \`typeOptions.loadOptionsMethod\`
   - \`typeOptions.loadOptions\`
   - labels such as "Name or ID" when they map to stable resource IDs
3. Build the current static \`nodeParameters\` first: \`resource\`,
   \`operation\`, authentication mode, and any parent selectors already known.
   Dynamic lookups often depend on those values.
4. If the node needs credentials, call
   \`setup_credentials({ target: "agent", credentials: [{ credentialType: "<type from node metadata>", reason: "..." }] })\`
   before resolving the selector. Pass the returned \`credentials\` object to
   \`get_node_parameter_options\`.
5. Call \`get_node_parameter_options\` with:
   - \`nodeType\` and \`version\` from discovery
   - \`parameterPath\`, for example \`teamId\` or \`additionalFields.teamId\`
   - current \`nodeParameters\`
   - returned \`credentials\`, when available
   - \`filter\` when the user named a specific team, channel, project, or object
6. If results are ambiguous, use \`agent_builder_ask_questions\` with the returned option
   names (existing agents only — during an initial build, defer per
   Initial-build timing above). If there are many pages, retry with
   \`paginationToken\` or a narrower \`filter\`.
7. Write the selected result's \`parameterValue\` exactly into
   \`nodeParameters\`. For resource locators this is an object with \`__rl\`,
   \`mode\`, and \`value\`; for classic dynamic options this is the raw ID/value.

## Rules

- Do not use \`$fromAI\` for stable dynamic selectors. The target agent usually
  cannot know private workspace IDs such as Linear team IDs.
- Use \`$fromAI\` for runtime content values the target agent should decide,
  such as issue title, message body, description, query text, priority chosen
  from user context, date ranges, counts, or booleans.
- Never invent resource IDs, credential IDs, node type names, parameter paths,
  or provider tool keys.
- If \`get_node_parameter_options\` returns \`missing_credentials\`, call
  \`setup_credentials\` with \`target: "agent"\` and a \`credentials\` entry for each
  returned credential type, then retry. Do not
  fall back to \`$fromAI\` for a required stable selector.
- If the user skips credentials and no exact ID is otherwise available, explain
  that the selector cannot be resolved yet. Ask for the credential or exact ID
  instead of hiding the problem behind \`$fromAI\`.
- Resolve parent selectors before child selectors. For example, resolve a
  workspace/team/project before fields that depend on it.

## Recovery From Config Errors

When \`agent_builder_write_config\` or \`agent_builder_patch_config\` rejects a dynamic selector using
\`$fromAI\`:

1. Read the error path to find the offending node parameter.
2. Inspect the node metadata if needed.
3. Resolve the parameter with \`get_node_parameter_options\`.
4. Patch the config by replacing only that parameter with the returned
   \`parameterValue\`.

## Example

For a Linear "Create Issue" node tool:

1. Use \`resource: "issue"\`, \`operation: "create"\`, and the selected
   authentication mode in \`nodeParameters\`.
2. Call
   \`setup_credentials({ target: "agent", credentials: [{ credentialType: "linearApi", reason: "Create Linear issues" }] })\`.
3. Call \`get_node_parameter_options\` for \`parameterPath: "teamId"\` with
   those \`nodeParameters\` and credentials.
4. Write the selected team's \`parameterValue\` to \`teamId\`.
5. Use \`$fromAI\` for runtime issue content such as \`title\` and
   \`additionalFields.description\`.

## Verify

- Every required stable selector has a resolved \`parameterValue\`, not
  \`$fromAI\`.
- Runtime content fields still use \`$fromAI\` where the target agent should
  decide them.
- Node credentials come from \`setup_credentials(target: "agent")\`; no credential IDs are invented.
- A validation error about dynamic selectors has been fixed by replacing the
  rejected field, not by changing unrelated config.`,
	};
}
