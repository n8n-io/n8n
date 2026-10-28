---
name: service-selection
description: >-
  Load before you choose between interchangeable services or credentials:
  when discovery results carry `setupPreference` or an `aiGateway` field, when
  the user has no usable credential for a capability, when the user asks what
  Gateway credits support, or when a build result says Gateway credits are
  depleted.
recommended_tools:
  - search_nodes
  - get_node_types
  - list_credentials
  - search_credential_types
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
capability — or run `search_nodes(gatewayCreditsOnly=true)` — before
committing, and prefer a covered result.

Respect the constraints it reports:
  - Set `typeVersion >= aiGateway.minVersion` when present.
  - Constrain `resource` / `operation` to entries in `aiGateway.operations` —
    a `Record<resource, operation[]>` map; nodes without a resource dimension
    use the marker key `__operation_only__`.
  - Do not set parameters listed in `aiGateway.hiddenProperties`.

**Enumeration (answering "what does Gateway credits support?"):**
  - All supported nodes: `search_nodes(gatewayCreditsOnly=true)` — each
    result carries the full `aiGateway` field (minVersion, operations,
    hiddenProperties).
  - All supported credential types:
    `search_credential_types(gatewayCreditsOnly=true)`.
  - Operations for a specific supported node: `get_node_types`
    → `aiGateway.operations`.

**Preference rule:** When adding a new node that has no credential assigned
yet, prefer Gateway credits over stored credentials if the credential type is
supported — it works with no API key required and avoids spending the user's
API quota. The synthetic entry in `list_credentials(type=...)` (see
Credential Rules) is your signal that a type is covered. Do not change
credentials on nodes that already have one assigned (editing an existing
workflow, or after the user has made a credential choice).

If `credentialResolutionNote` on the build result says Gateway credits are
depleted, follow that note: tell the user they must top up Gateway credits
or add their own key on the node. Do not say the workflow works out of the
box, and do not offer a live test.

- If the user explicitly specified their own credential (by name or by
  choosing one from a list), use that credential and do not substitute
  Gateway credits.
- When speaking to the user in chat, always refer to this feature as
  "Gateway credits" — never "n8n credits", "n8n Connect", "AI Gateway", or "gateway". Those are
  internal names only, including the `aiGateway` field on node/credential
  results: read it to make decisions, but never surface that name to the user.

## Credential Setup Preference

Discovery results can include a `setupPreference` array. Each entry has:

- `type`, the credential type
- `setupCompletionPercent`, a percentage from 0 to 100 rounded to the nearest
  5 percentage points, or `null`
- `popularityScore`, a relative adoption score from 0 to 1 rounded to one
  decimal place, or `null`

Setup completion measures completion of an Instance AI setup step containing
the credential; it is not an activation or validity rate. For either metric,
`null` means there was not enough data. Popularity is relative recent adoption,
not a percentage. Treat both as coarse signals and ignore small differences.

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

Use judgment instead of calculating a combined score or applying a fixed
threshold. Never let this metadata override stronger semantic relevance or use
it to choose between authentication methods for the same service.
