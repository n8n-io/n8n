---
name: model-selection
description: >-
  Guides AI model choices in new workflows, existing workflows, pasted workflow
  JSON, and model-availability questions. Load before recommending, selecting,
  replacing, or judging a model. Preserve working or explicitly requested IDs.
  An unfamiliar name or generic 404 does not establish that a model is invalid.
  Do not claim otherwise or suggest a replacement without provider evidence.
  Prefer credential-specific resource lookup when available. Use searchModels
  only to choose an unspecified model without a relevant credential or suitable
  named recommendation, never to validate a supplied ID or diagnose an existing
  failure. For a new choice, do not narrow discovery to a remembered model ID.
  Do not choose GPT-4-family or Claude 3.x for an unspecified model unless verified
  access constraints require them. Also activated when inspecting a model-bearing
  node.
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
seem familiar, stable, or inexpensive. Preserve an existing or requested model.
When choosing an unspecified model, use an older one only when verified access
constraints require it.

First check whether the user supplied a model or the workflow already has one.
**Preserve that ID without calling `searchModels` to validate it.** A model in a
revised design is still a user choice, even if its name is unfamiliar.
Do not question its validity or suggest a replacement solely because you do not
recognize it.

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

For an unspecified model, leave `query` empty unless the user requested a model
maker or family. Do not search for a remembered model ID and treat its presence
as proof that it is current. Compare current candidates before choosing one.

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

When making a new recommendation, state which access or capabilities remain
unverified. Do not invent model IDs, versions, prices, or rankings. Do not force
a paid credential to get a newer model.

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
