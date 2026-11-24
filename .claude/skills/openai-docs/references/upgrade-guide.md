# Upgrading to GPT-5.5

Use this guide when the user explicitly asks to upgrade an existing integration to GPT-5.5. Pair it with current OpenAI docs lookups. The default target string is `gpt-5.5`.

## Freshness check

Before applying this bundled guide for a latest/current/default model upgrade, run `node scripts/resolve-latest-model-info.js` from the OpenAI Docs skill directory.

- If the command returns `modelSlug: "gpt-5p5"`, continue with this bundled guide and use `references/prompting-guide.md` when prompt updates are needed.
- If the command returns a different `modelSlug`, fetch both the returned `migrationGuideUrl` and `promptingGuideUrl` and use them as the current source of truth instead of the bundled references.
- If the command fails, metadata is missing, or either remote guide cannot be fetched, continue with bundled fallback references and say the remote freshness check was unavailable.
- If the user explicitly named a target model, preserve that target and use current docs only to check compatibility or caveats.

## Upgrade posture

Upgrade with the narrowest safe change set:

- replace the model string first
- update only the prompts that are directly tied to that model usage
- do not automatically upgrade older or ambiguous model usages that may be intentionally pinned, such as historical docs, examples, tests, eval baselines, comparison code, or low-cost fallback/routing paths. Unless the user explicitly asks to upgrade all model usage, leave those sites unchanged and list them as confirmation-needed
- prefer prompt-only upgrades when possible
- if the upgrade would require API-surface changes, parameter rewrites, tool rewiring, provider migration, or broader code edits, mark it as blocked instead of stretching the scope

## Upgrade workflow

1. Inventory current model usage.
   - Search for model strings, client calls, and prompt-bearing files.
   - Include inline prompts, prompt templates, YAML or JSON configs, Markdown docs, and saved prompts when they are clearly tied to a model usage site.
2. Pair each model usage with its prompt surface.
   - Prefer the closest prompt surface first: inline system or developer text, then adjacent prompt files, then shared templates.
   - If you cannot confidently tie a prompt to the model usage, say so instead of guessing.
3. Classify the source model family.
   - Common buckets: GPT-5.4, GPT-5.3-Codex or GPT-5.2-Codex, earlier GPT-5.x, GPT-4o or GPT-4.1, reasoning models such as o1 or o3 or o4-mini, third-party model, or mixed and unclear.
4. Decide the upgrade class.
   - `model string only`
   - `model string + light prompt rewrite`
   - `blocked without code changes`
5. Run the compatibility gate.
   - Check whether the current integration can accept `gpt-5.5` without API-surface changes or implementation changes.
   - Check whether structured outputs, tool schemas, function names, and downstream parsers can remain unchanged.
   - For long-running Responses or tool-heavy agents, check whether `phase` is already preserved or round-tripped when the host replays assistant items or uses preambles.
   - If compatibility depends on code changes, return `blocked`.
   - If compatibility is unclear, return `unknown` rather than improvising.
6. Apply the upgrade when it is in scope.
   - Default replacement string: `gpt-5.5`.
   - Keep the intervention small and behavior-preserving.
   - Start from the current reasoning effort when it is visible unless there is a measured reason to change it.
   - For in-scope changes, update the model string and directly related prompts.
   - For blocked or unknown changes, do not edit; report the blocker or uncertainty.
7. Summarize the result.
   - `Current model usage`
   - `Model-string updates`
   - `Reasoning-effort handling`
   - `Prompt updates`
   - `Structured output and formatting assessment`
   - `Tool-use assessment` when the flow uses tools, retrieval, or terminal actions
   - `Phase assessment` when the flow is long-running, replayed, or tool-heavy
   - `Compatibility check`
   - `Validation performed`

Output rule:

- For each usage site, state the starting reasoning-effort recommendation.
- If the repo exposes the current reasoning setting, recommend preserving it first unless current OpenAI docs say otherwise.
- If the repo does not expose the current setting, recommend not adding one unless current OpenAI docs require it.

## Upgrade outcomes

### `model string only`

Choose this when:

- the source model is GPT-5.4
- the existing prompts are already short, explicit, and task-bounded
- the workflow does not rely on strict output formats, tool-call behavior, batch completeness, or long-horizon execution that should be validated after the upgrade
- there are no obvious compatibility blockers

Default action:

- replace the model string with `gpt-5.5`
- preserve the current reasoning effort
- keep prompts unchanged
- validate behavior with existing tests, realistic spot checks, or an existing eval suite when one is already available

### `model string + light prompt rewrite`

Choose this when:

- the task needs stronger completeness, citation discipline, verification, or dependency handling
- the upgraded model becomes too verbose, too dense, or hard to scan unless formatting is constrained
- the workflow has strict output shape requirements and lacks an explicit format contract, schema, or parser validation
- the workflow is research-heavy and needs stronger handling of sparse or empty retrieval results
- the workflow is coding-oriented, terminal-based, tool-heavy, or multi-agent, but the existing API surface and tool definitions can remain unchanged

Default action:

- replace the model string with `gpt-5.5`
- preserve the current reasoning effort for the first pass
- make only the smallest prompt edits needed for the observed workflow risk
- read the [GPT-5.5 prompting guide](/api/docs/guides/prompt-guidance?model=gpt-5.5) to choose the smallest prompt changes that recover or improve behavior
- avoid broad prompt cleanup unrelated to the upgrade
- for research workflows, add citation rules, retrieval budgets, missing-evidence behavior, and validation guidance from the prompting guide
- for dependency-aware or tool-heavy workflows, add prerequisite checks, missing-context handling, explicit tool budgets, stop conditions, and validation guidance
- for coding or terminal workflows, add repo-specific constraints, acceptance criteria, and concrete validation commands
- for multi-agent support or triage workflows, add task ownership, handoff, completeness, and stopping criteria
- for long-running Responses agents with preambles or multiple assistant messages, explicitly review whether `phase` is already handled; if adding or preserving `phase` would require code edits, mark the path as `blocked`
- do not classify a coding or tool-using Responses workflow as `blocked` just because the visible snippet is minimal; prefer `model string + light prompt rewrite` unless the repo clearly shows that a safe GPT-5.5 path would require host-side code changes

### `blocked`

Choose this when:

- the upgrade appears to require API-surface changes
- the upgrade appears to require parameter rewrites or reasoning-setting changes that are not exposed outside implementation code
- the upgrade would require changing tool definitions, tool handler wiring, or schema contracts
- the user is asking for a tooling, IDE, plugin, shell, or environment migration rather than a model and prompt migration
- the integration depends on provider-specific APIs that do not map to the current OpenAI API surface without implementation work
- you cannot confidently identify the prompt surface tied to the model usage

Default action:

- do not improvise a broader upgrade
- report the blocker and explain that the fix is out of scope for this guide
- if useful, describe the smallest follow-up implementation task that would unblock the migration

## Compatibility checklist

Before applying or recommending a model-and-prompt-only upgrade, check:

1. Can the current host accept the `gpt-5.5` model string without changing client code or API surface?
2. Are the related prompts identifiable and editable?
3. Does the host depend on behavior that likely needs API-surface changes, parameter rewrites, provider migration, or tool rewiring?
4. Would the likely fix be prompt-only, or would it need implementation changes?
5. Is the prompt surface close enough to the model usage that you can make a targeted change instead of a broad cleanup?
6. Do strict structured outputs, schemas, or downstream parsers still have an explicit contract?
7. For long-running Responses or tool-heavy agents, is `phase` already preserved if the host relies on preambles, replayed assistant items, or multiple assistant messages?
8. Are latency, token, or price assumptions validated by tests, realistic spot checks, or an existing eval suite rather than inferred from general model positioning?

If item 1 is no, items 3 through 4 point to implementation work, or item 7 is no and the fix needs code changes, return `blocked`.

If item 2 is no, return `unknown` unless the user can point to the prompt location.

Important:

- Existing use of tools, agents, or multiple usage sites is not by itself a blocker.
- If the current host can keep the same API surface and the same tool definitions, prefer `model string + light prompt rewrite` over `blocked`.
- Reserve `blocked` for cases that truly require implementation changes, not cases that only need stronger prompt steering.
- Do not claim token savings without task-level validation.

## Scope boundaries

This guide may:

- update or recommend updated model strings
- update or recommend updated prompts
- inspect code and prompt files to understand where those changes belong
- inspect whether existing Responses flows already preserve `phase`
- flag compatibility blockers
- propose validation with existing tests, realistic spot checks, or existing eval suites

This guide may not:

- move Chat Completions code to Responses
- move Responses code to another API surface
- migrate SDKs, APIs, IDE configuration, shell hooks, plugins, or provider-specific tooling
- rewrite parameter shapes
- change tool definitions or tool-call handling
- change structured-output wiring
- add or retrofit `phase` handling in implementation code
- edit business logic, orchestration logic, SDK usage, IDE configuration, shell hooks, or plugin integration behavior except for model-string replacements and directly related prompt edits

If a safe GPT-5.5 upgrade requires any of those changes, mark the path as blocked and out of scope.

## Validation plan

- Validate each upgraded usage site with existing tests, realistic spot checks, or an existing eval suite when one is already available.
- Compare against the current GPT-5.4 baseline when available.
- Check task success, retry count, tool-call count, total tokens, latency, output shape, and user-visible quality.
- For specialized workflows, validate the contract that matters most instead of judging only general output quality.
- If prompt edits were added, confirm each block is doing real work instead of adding noise.
- If the workflow has downstream impact, add a lightweight verification pass before finalization.
