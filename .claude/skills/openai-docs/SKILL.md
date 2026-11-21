---
name: "openai-docs"
description: "Use when the user asks how to build with OpenAI products or APIs, asks about Codex itself or choosing Codex surfaces, needs up-to-date official documentation with citations, help choosing the latest model for a use case, or model upgrade and prompt-upgrade guidance; use OpenAI docs MCP tools for non-Codex docs questions, use the Codex manual helper first for broad Codex self-knowledge, and restrict fallback browsing to official OpenAI domains."
---


# OpenAI Docs

Provide authoritative, current guidance from OpenAI developer docs using the developers.openai.com MCP server. "Docs MCP" means `mcp__openaiDeveloperDocs__search_openai_docs` and `mcp__openaiDeveloperDocs__fetch_openai_doc`; for API reference, schema, parameter, or required-field questions, also use `mcp__openaiDeveloperDocs__get_openapi_spec` when available. Official-domain web search is fallback after those tools are unavailable or unhelpful. Broad Codex questions use the manual helper before Docs MCP. This skill also owns model selection, API model migration, and prompt-upgrade guidance.

## Workflow Configuration

### Source Priority

- For Codex self-knowledge, use the Codex source route below; it owns when to use the manual helper, Docs MCP, or bounded uncertainty.
- For non-Codex OpenAI docs questions, use `mcp__openaiDeveloperDocs__search_openai_docs` to find the most relevant doc pages.
- For non-Codex OpenAI docs questions, fetch the relevant page with `mcp__openaiDeveloperDocs__fetch_openai_doc` before answering. If search is noisy, run a narrower Docs MCP search; when any plausible official OpenAI docs URL is known or found, try fetching that URL through Docs MCP before relying on web-search content.
- For API reference, schema, parameter, or required-field questions, use `mcp__openaiDeveloperDocs__get_openapi_spec` when available to verify the API shape alongside the relevant guide or reference page.
- Use `mcp__openaiDeveloperDocs__list_openai_docs` only when you need to browse or discover non-Codex pages without a clear query.
- For model-selection, "latest model", or default-model questions, fetch `https://developers.openai.com/api/docs/guides/latest-model.md` first. If that is unavailable, load `references/latest-model.md`.
- For model upgrades or prompt upgrades, run `node scripts/resolve-latest-model-info.js` only when the target is latest/current/default or otherwise unspecified; otherwise preserve the explicitly requested target.
- Preserve explicit target requests: if the user names a target model like "migrate to GPT-5.4", keep that requested target even if `latest-model.md` names a newer model. Mention newer guidance only as optional.
- If current remote guidance is needed, fetch both the returned migration and prompting guide URLs directly. If direct fetch fails, use MCP/search fallback; if that also fails, use bundled fallback references and disclose the fallback.

## OpenAI product snapshots

1. Apps SDK: Build ChatGPT apps by providing a web component UI and an MCP server that exposes your app's tools to ChatGPT.
2. Responses API: A unified endpoint designed for stateful, multimodal, tool-using interactions in agentic workflows.
3. Chat Completions API: Generate a model response from a list of messages comprising a conversation.
4. Codex: OpenAI's coding agent for software development that can write, understand, review, and debug code.
5. gpt-oss: Open-weight OpenAI reasoning models (gpt-oss-120b and gpt-oss-20b) released under the Apache 2.0 license.
6. Realtime API: Build low-latency, multimodal experiences including natural speech-to-speech conversations.
7. Agents SDK: A toolkit for building agentic apps where a model can use tools and context, hand off to other agents, stream partial results, and keep a full trace.

## Codex self-knowledge

Use this path for questions about Codex itself: configuring, extending, operating, troubleshooting, local state, product surfaces, or where Codex behavior should live. A codebase merely mentioning a plugin, skill, hook, MCP server, browser, or automation is not enough. For generic software tasks, answer the software task directly; if asked whether Codex self-knowledge applies, answer that meta question briefly and continue the requested artifact.

### Source Route

The Codex manual is the first source for broad Codex synthesis. Treat the manual and Docs MCP as different lanes, not interchangeable official-doc sources. For published-user Codex product answers, the source route is complete: the manual, Docs MCP when this route calls for it, official OpenAI web fallback, and callable capabilities surfaced in the current session when the question is about that capability. Knowledge bases outside developers.openai.com are outside this route for public product answers.

For broad Codex behavior, setup, customization, skills, plugins, MCP, hooks, `AGENTS.md`, automations, surfaces, local state, or system-map questions:

1. Reuse a same-thread manual and outline path when it is still fresh.
2. Otherwise run the skill-local helper first in normal writable sessions. Skip it without trying only when the session is explicitly read-only, shell execution is unavailable, or visible policy shows no allowed temp cache.
3. By default, the helper chooses the first usable temp cache dir in this order: `$TMPDIR/openai-docs-cache`, `%TEMP%\openai-docs-cache`, `%TMP%\openai-docs-cache`, `/private/tmp/openai-docs-cache`, then `/tmp/openai-docs-cache`. Workspace-only write access is not enough for this temp cache.
4. Run the helper directly unless you need to override the cache dir. The helper falls back to `curl` when native `fetch` is unavailable or when proxy env vars are present, so no shell-specific proxy prefix is required. Resolve `<skill-dir>` to this skill's actual directory; in copied local eval workdirs this is usually `.codex/skills/openai-docs`:

```bash
node <skill-dir>/scripts/fetch-codex-manual.mjs
```

If you need to override the cache dir, pass `--cache-dir <cache-dir>`. On Windows, the helper checks `%TEMP%` and `%TMP%` automatically; in PowerShell, `$env:TEMP\\openai-docs-cache` is a typical explicit override.

Treat helper availability as established by explicit read-only/no-shell policy or an actual command result. A guessed sandbox or guessed helper failure is not enough to switch to Docs MCP or web lookup; after an actual helper command failure, continue to the narrowest official next source below.

The helper verifies freshness, writes `codex-manual.md`, and emits `codex-manual.outline.md`. The outline maps source pages and headings to line ranges; use it to choose the relevant manual section, then read or search targeted manual sections for Codex product facts. Use the skill directory to locate and run the helper; after the helper succeeds, use the returned manual and outline paths as the search scope for Codex product facts and term coverage checks.

Reuse the same-thread manual and outline paths for follow-up Codex questions. Refresh first when the manual was fetched more than about a day ago, the path is unusable, the path came from another thread or uncertain provenance, or likely-current information is missing and staleness is plausible.

For questions about whether the manual is current enough to rely on now, run the helper when temp caching is allowed and base the answer on its returned status, manual path, and outline path.

If the manual resolves a Codex claim, answer from it and stop expanding sources for that claim; continue the user's broader task if the docs lookup was only one dependency. Manual source pages and known anchors are enough citation support for manual-covered material.

If the helper is skipped because the session is read-only, has no shell execution, or has no allowed temp cache, the next source is Docs MCP: call `mcp__openaiDeveloperDocs__search_openai_docs`, then `mcp__openaiDeveloperDocs__fetch_openai_doc` for a relevant hit before any web fallback.

If a user names a Codex term or mode that a fresh manual does not use, search the manual for obvious adjacent concepts, then answer that the exact term is not documented and use the closest documented terminology. If the prompt asks how that term maps to Codex behavior, resolve the mapping from adjacent manual sections. If the exact term remains material or likely current after that manual pass, use one narrow Docs MCP search/fetch before bounded uncertainty; otherwise, the source lookup for that terminology or mapping claim is complete.

Use the narrowest official next source only when the manual is unavailable, the helper fails, temp caching is not allowed, another material claim is missing or likely stale, or the user explicitly needs a page-specific citation. Prefer one specific Docs MCP search and, if it returns a clearly relevant page, one fetch; for unresolved Codex capability names, acronyms, scheduling terms, or exact error text, this Docs MCP step is the next source before web search. After the manual plus any permitted Docs MCP gap-fill, resolve remaining gaps as bounded uncertainty. Use official-domain web fallback only after that Docs MCP path is unavailable or unhelpful. If the claim is still not established, stop with bounded uncertainty. If official docs/manual conflict with a callable capability already surfaced in the current session, state the conflict and prefer verified current-session behavior for that environment.

For undocumented or private-looking model slugs, product mode labels, entitlement labels, account access paths, or rollout names, answer from current public docs and bounded uncertainty. Those labels are not a reason to leave the public source route.

For support-style diagnostics, prefer a layer-by-layer answer from the manual over provider-specific web lookups: installed/enabled plugin, bundled app or connector authorization, MCP setup, workspace/admin policy, restart or new-thread expectations, then support or feedback if still unresolved.

If the source route still does not establish a claim, return bounded uncertainty or route to support, an admin, or product feedback instead of widening the investigation.

For unresolved product terminology, answer from the manual plus the allowed official next source. If those sources do not establish the term, answer with bounded uncertainty from those sources.

### Surface Map

When Codex nouns or durable-instruction surfaces overlap, recommend the smallest surface that matches the scope:

- Prompt or thread context -> one-off task constraints.
- `AGENTS.md` -> durable repo conventions, commands, verification steps, and review expectations; closer nested files apply under their subtree.
- Project `.codex/config.toml` -> trusted-repo Codex settings such as sandbox, MCP, hooks, model, or reasoning defaults.
- Global config or global guidance -> personal defaults across repos.
- Skill -> reusable task workflow with references or scripts.
- Plugin -> installable bundle with skills plus commands, tools, MCP config, hooks, assets, apps, or marketplace metadata.
- MCP server or app connector -> live external data/actions or authorized private app/workspace data. Use connectors for private Google Docs, Calendar, Slack, GitHub, Notion, and similar data instead of web search or model memory.
- Automation -> scheduled checks, reminders, monitors, or follow-up work; use a thread heartbeat when continuity in an existing thread matters.
- Hook -> lifecycle enforcement around tool calls, commands, or file edits.

Split mixed-scope requests instead of forcing one answer. Example: "always do X, but only for this PR" defaults to prompt/thread context for the current run; use `AGENTS.md` or project config only if it should persist, hooks only for mechanical enforcement, and automations only for scheduled or follow-up work.

Use this quick product map when needed: CLI is terminal-first local repo work; IDE extension is editor-attached coding; Codex app is desktop planning, review, and interactive work; cloud/web is hosted parallel/offloaded work; Browser Use/in-app browser is Codex-controlled web testing; Chrome extension uses the user's Chrome profile; Computer Use controls desktop apps and OS UI. Keep `config.toml` defaults, `requirements.toml` constraints, and managed/admin policy separate.

### Boundaries And Output

- API key auth does not imply ChatGPT, cloud task, or connector access. For plugin/app/auth failures, check bundle availability, plugin installed/enabled state, connector/app authorization, MCP setup, restart/refresh expectations, workspace policy, and per-surface availability before answering.
- Sandbox or network denials need scoped escalation with a clear justification. Destructive commands, writes outside the workspace, or broad access changes require explicit approval.
- Memory can provide user preference or context, but explicit prompt instructions win and memory is not a source for current external facts.
- For affirmative surface-selection answers, use this shape: recommendation, why, what to avoid, and the manual/source evidence used.
- When page-specific Codex citations are actually needed, these anchors often fit: `concepts/customization#agents-guidance` for `AGENTS.md`, `concepts/customization#skills` for skills, `plugins/build#plugin-structure` for plugins, `concepts/customization#mcp` for MCP, `config-advanced#hooks` for hooks, `app/automations#thread-automations` for thread automations, and `config-reference#configtoml` for config.

## If MCP server is missing

If MCP tools fail or no OpenAI docs resources are available:

1. Run the install command yourself: `codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp`
2. If it fails due to permissions/sandboxing, immediately retry the same command with escalated permissions and include a 1-sentence justification for approval.
3. Ask the user to run the install command only if the escalated attempt fails.
4. Ask the user to restart Codex.
5. Re-run the doc search/fetch after restart.

## Workflow

1. Clarify whether the request is general docs lookup, model selection, a model-string upgrade, prompt-upgrade guidance, or broader API/provider migration.
2. For Codex self-knowledge requests, follow the Codex self-knowledge source procedure above.
3. For model-selection or upgrade requests, prefer current remote docs over bundled references when the user asks for latest/current/default guidance.
   - Fetch `https://developers.openai.com/api/docs/guides/latest-model.md`.
   - Find the latest model ID and explicit migration or prompt-guidance links.
   - Prefer explicit links from the latest-model page over derived URLs.
   - For explicit named-model requests, preserve the requested model target. Mention newer remote guidance only as optional.
   - For dynamic latest/current/default upgrades, run `node scripts/resolve-latest-model-info.js`, then fetch both returned guide URLs directly when possible.
   - If direct guide fetch fails, use the developer-docs MCP tools or official OpenAI-domain search to find the same guide content.
   - If remote docs are unavailable, use bundled fallback references and say that fallback guidance was used.
4. For model upgrades, keep changes narrow: update active OpenAI API model defaults and directly related prompts only when safe.
5. Leave historical docs, examples, eval baselines, fixtures, provider comparisons, provider registries, pricing tables, alias defaults, low-cost fallback paths, and ambiguous older model usage unchanged unless the user explicitly asks to upgrade them.
6. Keep SDK, tooling, IDE, plugin, shell, auth, and provider-environment migrations out of a model-and-prompt upgrade unless the user explicitly asks for them.
7. If an upgrade needs API-surface changes, schema rewiring, tool-handler changes, or implementation work beyond a literal model-string replacement and prompt edits, report it as blocked or confirmation-needed.
8. For general docs lookup, start with a compact, title-like search query of 2-6 essential terms. Do not turn the full user question into a keyword list. Fetch the best page and exact section needed, and answer with concise citations.

## Reference map

Read only what you need:

- `https://developers.openai.com/api/docs/guides/latest-model.md` -> current model-selection and "best/latest/current model" questions.
- `scripts/fetch-codex-manual.mjs` -> current Codex manual fetch, verification, local temp cache, and outline generation.
- `https://developers.openai.com/codex/codex-manual.md` -> current Codex self-knowledge synthesis, including setup, customization, skills, plugins, MCP, hooks, `AGENTS.md`, automations, and surface behavior; normally access it through the helper path and targeted file reads when temp caching is available.
- `references/latest-model.md` -> bundled fallback for model-selection and "best/latest/current model" questions.
- `references/upgrade-guide.md` -> bundled fallback for model upgrade and upgrade-planning requests.
- `references/prompting-guide.md` -> bundled fallback for prompt rewrites and prompt-behavior upgrades.

## Quality rules

- Treat OpenAI docs as the source of truth; avoid speculation.
- For Codex self-knowledge, follow the source route above instead of relying on remembered behavior.
- Keep migration changes narrow and behavior-preserving.
- Prefer prompt-only upgrades when possible.
- Avoid inventing pricing, availability, parameters, API changes, or breaking changes.
- Keep quotes short and within policy limits; prefer paraphrase with citations.
- If multiple pages differ, call out the difference and cite both.
- If official docs and verified callable current-session behavior disagree, state the conflict before making broad claims or edits.
- If docs do not cover the user’s need, say so and offer next steps.

## Tooling notes

- Use MCP doc tools before web search for OpenAI-related markdown docs. The Codex manual flow is the exception: follow the Codex self-knowledge source procedure for broad Codex synthesis.
- If the MCP server is installed but returns no meaningful results, then use web search as a fallback.
- When falling back to web search, restrict to official OpenAI domains (developers.openai.com, platform.openai.com) and cite sources.
