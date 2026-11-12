---
name: service-selection
description: >-
  Load before you choose between interchangeable services or credentials:
  when discovery results carry `setupPreference` or an `aiGateway` field, when
  the user has no usable credential for a capability, when the user asks what
  Gateway credits support, or when a build result says Gateway credits are
  depleted.
recommended_tool_groups:
  - nodes
  - credentials
---

# Service Selection

## Gateway credits

"Gateway credits" is the user-facing name of n8n's managed credential
service. On instances licensed for it, several common AI-provider and
scraping nodes can run with no API key required on the user's side.

**Discovery (while building):** `search_nodes` and
`get_node_types` results carry an `aiGateway` field on covered nodes
— no separate lookup needed. When `aiGateway.supported === true`, prefer that
node over comparable alternatives *when the user has not named a specific tool
and has no usable credential for a comparable one* — it runs with no API key.
Keep your normal `categories`/search pick when the user already has a credential
for a comparable tool.

The `categories` list and search *rank* don't prioritize Gateway credits coverage
(individual search results still flag it). When the user asks for a capability
they have no usable credential for, search that
capability — or run `search_nodes` through `call_tool` with `gatewayCreditsOnly: true` — before
committing, and prefer a covered result.
Respect the constraints that `aiGateway` reports.

**Preference rule:** When adding a new node that has no credential assigned
yet, prefer Gateway credits over stored credentials if the credential type is
supported — it works with no API key required and avoids spending the user's
API quota. The synthetic entry in `list_credentials(type=...)` (see
Credential Rules) is your signal that a type is covered. Do not change
credentials on nodes that already have one assigned (editing an existing
workflow, or after the user has made a credential choice).
If the user explicitly specified their own credential, use it and do not
substitute Gateway credits.

## Credential Setup Preference

Discovery results can include a `setupPreference` array with
`setupCompletionPercent` and `popularityScore` for each credential type.

When choosing a service:

1. Honor explicit intent and existing workflow choices.
2. Prefer a semantically suitable service with a usable existing credential,
	 then apply the existing Gateway credits rules.
3. Compare setup preference only among the remaining semantically
   interchangeable candidates. Before deciding, inspect discovery results for
   every candidate the user named.

- When setup completion and popularity clearly support one candidate, choose it
  and continue without asking.
- When the signals are close or conflict and the user has not delegated the
  choice, ask exactly one `single` question. If skipped, choose a default within
  the user's requested scope.
- When the user explicitly asks you to choose, make a sensible choice and
  continue without asking.
