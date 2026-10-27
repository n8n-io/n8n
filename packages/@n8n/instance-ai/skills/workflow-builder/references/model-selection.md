---
name: model-selection
description: >-
  Guides AI model choices in new workflows, existing workflows, pasted workflow
  JSON, and model-availability questions. Load before recommending, selecting,
  replacing, or judging a model. Preserve working or explicitly requested IDs.
  An unfamiliar name or generic 404 does not establish that a model is invalid.
  Do not claim otherwise or suggest a replacement without provider evidence.
  Prefer credential-specific resource lookup when available. Use workflow_builder_search_models
  only to choose an unspecified model without a relevant credential or suitable
  named recommendation, never to validate a supplied ID or diagnose an existing
  failure. For a new choice, do not narrow discovery to a remembered model ID.
  Do not choose GPT-4-family or Claude 3.x for an unspecified model unless verified
  access constraints require them. Also activated when inspecting a model-bearing
  node.
dependencies:
  tools:
    - workflow_builder_search_models
recommended_tools:
  - get_node_types
  - get_node_parameter_options
  - list_credentials
  - workflow_builder_search_models
  - research
---
# Model selection

Model memory suggests GPT-4o, GPT-4.1, Claude 3.x. Outdated defaults for new workflows. Don't recommend just because familiar, stable, or cheap. Preserve existing or requested model. When picking unspecified model, use older one only when verified access constraints require.

First check if user supplied model or workflow already has one.
**Preserve that ID without calling `workflow_builder_search_models` to validate.** Model in revised design still user choice, even if name unfamiliar.
Don't question validity or suggest replacement just because unrecognized.

Only when YOU must pick unspecified model, get credential model list, explicit named recommendation in node's `@builderHint`, or current catalog evidence. Node's `@default` and generic "prefer stable models" advice not recommendations. **Unspecified model + no credential + no named hint = call `workflow_builder_search_models` before writing workflow.** No remembered ID substitutes.

## Choose the source

1. Preserve existing working or explicitly requested model, incl. IDs in
   config fields and expressions. No upgrade during unrelated edit. If
   evidence shows it can't meet request, explain evidence and agree on
   alternative before changing.
2. New choice: check relevant credentials, incl. Gateway credits.
   Use `get_node_parameter_options` with that credential and parameter path (or lookup
   method from node definition). Its available models beat builder hints and
   public catalogs. Pick one fitting operation, task, budget. Explain access
   constraints if they force older model.
3. No relevant credential: use explicit model recommendation from node's
   `@builderHint` when fits task and serving provider. Generic "prefer stable
   models" names no candidate. Don't treat `@default` as builder-hint
   recommendation.
4. No suitable explicit hint: call `workflow_builder_search_models` with serving
   provider before picking ID. Picking model while building workflow is
   preliminary selection too. Reuse relevant results already fetched for task;
   no repeat discovery per node.

Unspecified model: leave `query` empty unless user requested model maker or family. Don't search remembered model ID and treat presence as proof current. Compare current candidates before picking.

Keep requested serving provider and model maker. Claude via OpenRouter: call `workflow_builder_search_models({ provider: "openrouter", query: "claude" })`. OpenAI via OpenRouter: `query: "openai"`. Query filters model IDs and names before selecting ten most recent matches, so other makers don't fill results. Use exact returned ID in `anthropic/` or `openai/` namespace. Don't construct OpenRouter IDs from direct-provider names. If no suitable model returned, consult serving provider's official catalog or docs.

Catalog results advisory, may include previews. Prefer stable model fitting task; report source and freshness of catalog-based advice. Catalog presence ≠ credential access. Once credential connected, its resource lookup wins. Never use catalog search to replace failed credential lookup or just to check unfamiliar model.

New recommendation: state which access or capabilities remain unverified. Don't invent model IDs, versions, prices, rankings. Don't force paid credential to get newer model.

## Diagnose availability

Don't call `workflow_builder_search_models` to diagnose existing model error. Catalog recency and absence don't justify repair. Keep model unchanged while collecting actual failure evidence; failed lookup not permission to guess.

Generic `404` or `MODEL_NOT_FOUND` = failed request. Alone doesn't prove global model nonexistence or account-wide unavailability. Check actual request, provider endpoint, credential, operation, execution evidence before recommending replacement. Scope provider rejection to what it establishes. Absence from partial model list or docs page not rejection.

Use execution-specific evidence to tell simulated verification from real provider calls. Current credential inventory doesn't show whether earlier run simulated. When direct execution and chat differ, compare records and config. Keep unsupported causes as hypotheses; no claiming live fix from mocked verification.