
## Purpose

Use this to set node-tool parameters that must be resolved at build time through
node metadata and live options. These fields represent stable IDs or resource
locator values that the target agent cannot reliably guess at runtime.

## Use when

- You are adding or changing a node tool and a parameter is a stable resource
  selector, such as Linear `teamId`, Slack channel, project, calendar, board,
  database, table, model, folder, or another "Name or ID" field.
- `get_node_types` shows a parameter with `type: "resourceLocator"`,
  `typeOptions.loadOptionsMethod`, or `typeOptions.loadOptions`.
- `build_agent` rejects a node parameter with a dynamic
  selector / `get_resource_locator_options` error.

## Workflow

1. Discover and inspect the node with `agent_builder` (`action: "search_nodes"`),
   then `agent_builder` (`action: "get_node_types"`).
2. Identify dynamic selectors from node metadata. Treat these as build-time
   lookup fields:
   - `type: "resourceLocator"`
   - `typeOptions.loadOptionsMethod`
   - `typeOptions.loadOptions`
   - labels such as "Name or ID" when they map to stable resource IDs
3. Build the current static `nodeParameters` first: `resource`,
   `operation`, authentication mode, and any parent selectors already known.
   Dynamic lookups often depend on those values.
4. If the node needs credentials, resolve one first (see "Asking the user,
   credentials, and the LLM" in SKILL.md — `credentials({ action: "list" })` +
   `ask-user`).
   Pass the resulting `credentials` map to the `get_resource_locator_options`
   action.
5. Call `agent_builder` with `action: "get_resource_locator_options"` and:
   - `nodeType` and `nodeTypeVersion` from discovery
   - `parameterPath`, for example `teamId` or `additionalFields.teamId`
   - current `nodeParameters`
   - returned `credentials`, when available
   - `filter` when the user named a specific team, channel, project, or object
6. If results are ambiguous, use the `ask-user` tool with the returned option
   names. If there are many pages, retry with `paginationToken` or a narrower
   `filter`.
7. Write the selected result's `parameterValue` exactly into
   `nodeParameters`. For resource locators this is an object with `__rl`,
   `mode`, and `value`; for classic dynamic options this is the raw ID/value.

## Rules

- Do not use `$fromAI` for stable dynamic selectors. The target agent usually
  cannot know private workspace IDs such as Linear team IDs.
- Use `$fromAI` for runtime content values the target agent should decide,
  such as issue title, message body, description, query text, priority chosen
  from user context, date ranges, counts, or booleans.
- Never invent resource IDs, credential IDs, node type names, parameter paths,
  or provider tool keys.
- If `get_resource_locator_options` returns `missing_credentials`, resolve a
  credential for one of the returned slots (`credentials({ action: "list" })` +
  `ask-user`) and retry. Do not fall back to `$fromAI` for a required stable
  selector.
- If the user skips credentials and no exact ID is otherwise available, explain
  that the selector cannot be resolved yet. Ask for the credential or exact ID
  instead of hiding the problem behind `$fromAI`.
- Resolve parent selectors before child selectors. For example, resolve a
  workspace/team/project before fields that depend on it.

## Recovery From Config Errors

When `build_agent` rejects a dynamic selector using `$fromAI`:

1. Read the error path to find the offending node parameter.
2. Inspect the node metadata if needed.
3. Resolve the parameter with `agent_builder` (`action:
   "get_resource_locator_options"`).
4. In the config file, replace only that parameter with the returned
   `parameterValue`, then call `build_agent` again.

## Example

For a Linear "Create Issue" node tool:

1. Use `resource: "issue"`, `operation: "create"`, and the selected
   authentication mode in `nodeParameters`.
2. Resolve the Linear credential (`credentials({ action: "list" })` + `ask-user`).
3. Call `agent_builder` (`action: "get_resource_locator_options"`) for
   `parameterPath: "teamId"` with those `nodeParameters` and credentials.
4. Write the selected team's `parameterValue` to `teamId`.
5. Use `$fromAI` for runtime issue content such as `title` and
   `additionalFields.description`.

## Verify

- Every required stable selector has a resolved `parameterValue`, not
  `$fromAI`.
- Runtime content fields still use `$fromAI` where the target agent should
  decide them.
- Node credentials come from the `credentials` tool (action `list`, chosen with
  the user via `ask-user`); no credential IDs are invented.
- A validation error about dynamic selectors has been fixed by replacing the
  rejected field, not by changing unrelated config.
