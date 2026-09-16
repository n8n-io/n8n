---
name: model-selection
description: >-
  Chooses models for AI nodes and answers model-choice questions. Load before
  recommending a model, selecting one for a new workflow, or diagnosing model
  availability. Also activated when inspecting a model-bearing node.
dependencies:
  tools:
    - searchModels
recommended_tools:
  - nodes
  - credentials
  - searchModels
  - research
---

# Model selection

Your model memory tends to suggest GPT-4o, GPT-4.1, or Claude 3.x. These are
outdated defaults for new workflows. Do not recommend them just because they
seem familiar, stable, or inexpensive. Preserve an existing or requested model;
use an older model for a new task only when verified access constraints require it.

First check whether the user supplied a model or the workflow already has one.
**Preserve that ID without calling `searchModels` to validate it.** A model in a
revised design is still a user choice, even if its name is unfamiliar.

Only when YOU must choose an unspecified model, obtain a credential model list,
an explicit named recommendation in the node's `@builderHint`, or current catalog
evidence. A node's `@default` and generic advice to "prefer stable models" are not
recommendations. **Unspecified model plus no credential and no named hint means
call `searchModels` before writing the workflow.** Do not substitute a remembered ID.

## Choose the source

1. Preserve an existing working or explicitly requested model, including IDs in
   configuration fields and expressions. Do not upgrade it during an unrelated
   edit. If evidence shows it cannot meet the request, explain that evidence and
   agree on an alternative before changing it.
2. For a new choice, check relevant credentials, including Gateway credits.
   Use `nodes(action="explore-resources")` with that credential and the exact
   lookup method from the node definition. Its available models take precedence
   over builder hints and public catalogs. Choose one that fits the operation,
   task, and budget. Explain access constraints if they require an older model.
3. Without a relevant credential, use an explicit model recommendation from the
   node's `@builderHint` when it fits the task and serving provider. Generic
   advice such as "prefer stable models" does not name a candidate. Do not treat
   `@default` as a builder-hint recommendation.
4. If there is no suitable explicit hint, call `searchModels` with the serving
   provider before choosing an ID. Choosing a model while building a workflow
   is preliminary selection too. Reuse relevant results already retrieved for
   this task; do not repeat discovery for every node.

Keep the requested serving provider and model maker. For Claude through OpenRouter,
call `searchModels({ provider: "openrouter", query: "claude" })`. For OpenAI through
OpenRouter, use `query: "openai"`. The query filters model IDs and names before
selecting the ten most recent matches, so other makers do not fill the results.
Use an exact returned ID in the `anthropic/` or `openai/` namespace. Do not construct
OpenRouter IDs from direct-provider names. If no suitable model is returned,
consult the serving provider's official catalog or documentation.

Catalog results are advisory and may include previews. Prefer a stable model
that fits the task, and report the source and freshness of catalog-based advice.
Catalog presence does not prove credential access. Once a credential is connected,
its resource lookup takes precedence. Never use catalog search to replace a
failed credential lookup or merely to check an unfamiliar model.

If evidence is unavailable, state what is unverified. Do not invent model IDs,
versions, prices, or rankings. Do not force a paid credential to get a newer model.

## Diagnose availability

Do not call `searchModels` to diagnose an existing model error. Catalog recency
and catalog absence do not justify a repair. Keep the model unchanged while
collecting the actual failure evidence; a failed lookup is not permission to guess.

A generic `404` or `MODEL_NOT_FOUND` reports a failed request. It does not alone
prove global model nonexistence or account-wide unavailability. Check the actual
request, provider endpoint, credential, operation, and execution evidence before
recommending a replacement. Scope any provider rejection to what it establishes.
Absence from a partial model list or documentation page is not a rejection.

Use execution-specific evidence to distinguish simulated verification from real
provider calls. The current credential inventory does not establish whether an
earlier run was simulated. When direct execution and chat behave differently,
compare their records and configuration. Keep unsupported causes as hypotheses;
do not claim a live fix from mocked verification.
