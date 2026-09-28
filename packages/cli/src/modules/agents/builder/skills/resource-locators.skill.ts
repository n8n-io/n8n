import type { RuntimeSkill } from '@n8n/agents';

import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

export function resourceLocatorsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-resource-locators',
		name: 'Agent Builder Resource Locators',
		description:
			'Use when adding or changing node tools with stable dynamic selector fields: resourceLocator, loadOptionsMethod, loadOptions routing, "Name or ID" parameters, teamId, channelId, projectId, calendarId, databaseId, tableId, model selectors, or when config_write/config_patch rejects $fromAI on a dynamic selector.',
		recommendedTools: [
			'nodes_search',
			'node_types_get',
			'credential_ask',
			'resource_locator_options_get',
			'agent_context',
			'config_patch',
		],
		allowedTools: [
			'nodes_search',
			'node_types_get',
			'credential_ask',
			'resource_locator_options_get',
			'user_questions_ask',
			'agent_context',
			'config_patch',
			'config_write',
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
- \`node_types_get\` shows a parameter with \`type: "resourceLocator"\`,
  \`typeOptions.loadOptionsMethod\`, or \`typeOptions.loadOptions\`.
- \`config_write\` or \`config_patch\` rejects a node parameter with a dynamic
  selector / \`resource_locator_options_get\` error.

## Initial-build timing

${INITIAL_BUILD_NOTE} If the tool needs a credential to resolve a stable
selector, skip adding that tool for now instead of blocking the rest of the
build. Include the credential in the trailing \`setup_finish\` call, then run
the option lookup with the returned credential in the same turn and write the
config mutation only when the result is unambiguous (an exact or single
filtered match). If options remain ambiguous, do not call \`user_questions_ask\` —
leave the tool deferred and add a one-line setup checklist item naming the
pending selection; resolve it in a later turn. In an addition to an existing
agent, resolve the credential and any ambiguity immediately instead.

## Workflow

1. Discover and inspect the node with \`nodes_search\`, then \`node_types_get\`.
2. Identify dynamic selectors from node metadata. Treat these as build-time
   lookup fields:
   - \`type: "resourceLocator"\`
   - \`typeOptions.loadOptionsMethod\`
   - \`typeOptions.loadOptions\`
   - labels such as "Name or ID" when they map to stable resource IDs
3. Build the current static \`nodeParameters\` first: \`resource\`,
   \`operation\`, authentication mode, and any parent selectors already known.
   Dynamic lookups often depend on those values.
4. If the node needs credentials, call \`credential_ask\` before resolving the
   selector. Pass the returned \`credentials\` object to
   \`resource_locator_options_get\`.
5. Call \`resource_locator_options_get\` with:
   - \`nodeType\` and \`nodeTypeVersion\` from discovery
   - \`parameterPath\`, for example \`teamId\` or \`additionalFields.teamId\`
   - current \`nodeParameters\`
   - returned \`credentials\`, when available
   - \`filter\` when the user named a specific team, channel, project, or object
6. If results are ambiguous, use \`user_questions_ask\` with the returned option
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
- If \`resource_locator_options_get\` returns \`missing_credentials\`, call
  \`credential_ask\` for one of the returned credential slots and retry. Do not
  fall back to \`$fromAI\` for a required stable selector.
- If the user skips credentials and no exact ID is otherwise available, explain
  that the selector cannot be resolved yet. Ask for the credential or exact ID
  instead of hiding the problem behind \`$fromAI\`.
- Resolve parent selectors before child selectors. For example, resolve a
  workspace/team/project before fields that depend on it.

## Recovery From Config Errors

When \`config_write\` or \`config_patch\` rejects a dynamic selector using
\`$fromAI\`:

1. Read the error path to find the offending node parameter.
2. Inspect the node metadata if needed.
3. Resolve the parameter with \`resource_locator_options_get\`.
4. Patch the config by replacing only that parameter with the returned
   \`parameterValue\`.

## Example

For a Linear "Create Issue" node tool:

1. Use \`resource: "issue"\`, \`operation: "create"\`, and the selected
   authentication mode in \`nodeParameters\`.
2. Call \`credential_ask\` for the Linear credential slot.
3. Call \`resource_locator_options_get\` for \`parameterPath: "teamId"\` with
   those \`nodeParameters\` and credentials.
4. Write the selected team's \`parameterValue\` to \`teamId\`.
5. Use \`$fromAI\` for runtime issue content such as \`title\` and
   \`additionalFields.description\`.

## Verify

- Every required stable selector has a resolved \`parameterValue\`, not
  \`$fromAI\`.
- Runtime content fields still use \`$fromAI\` where the target agent should
  decide them.
- Node credentials come from \`credential_ask\`; no credential IDs are invented.
- A validation error about dynamic selectors has been fixed by replacing the
  rejected field, not by changing unrelated config.`,
	};
}
