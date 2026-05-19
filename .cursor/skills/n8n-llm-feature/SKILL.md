---
name: n8n-llm-feature
description: Pattern for adding LLM-backed features in n8n. Use when integrating Anthropic, OpenAI, or any other LLM provider into a service. Picks the right abstraction layer and enforces deterministic fallback.
---

# n8n LLM Feature

## Pick the right abstraction

- **`@ai-sdk/<provider>` + `ai` (`generateText`/`streamText`)** — preferred for new server-side features in `packages/cli` (e.g. Insights Analyst). `packages/cli` already depends on `@ai-sdk/anthropic`. Lazy-load both packages so the import only happens when the feature runs.
- **`@langchain/<provider>`** — use only when integrating with workflow nodes (`packages/@n8n/nodes-langchain`) or when you need the LangChain chain/agent ecosystem.
- **`@n8n/agents`** — use only when you need tool-loops, suspend/resume, or conversation memory. Heavy for a single-prompt service.
- **Raw `@anthropic-ai/sdk` / `openai`** — avoid in n8n production code. No other module uses them directly.

## Required pieces

1. **Env config** — module-local `@Config` class:

   ```ts
   @Env('N8N_<FEATURE>_<PROVIDER>_API_KEY')
   anthropicApiKey: string = '';

   @Env('N8N_<FEATURE>_MODEL')
   anthropicModel: string = '<model-id>';
   ```

   Never read `process.env` directly outside `@n8n/config` consumers.

2. **Lazy-load the SDK** at point of use:

   ```ts
   const [{ createAnthropic }, { generateText }] = await Promise.all([
     import('@ai-sdk/anthropic'),
     import('ai'),
   ]);
   ```

   Keeps cli startup cheap and avoids pulling the SDK into processes that don't enable the feature.

3. **Deterministic fallback** — if the API key is empty or the call throws, fall back to a canned response that still uses the workspace data. The customer demo path must work without any keys. Surface a `mode: 'llm' | 'fallback'` flag on the response shape so the UI can render a "Powered by …" badge only in `'llm'` mode.

4. **Bound output shape** — ask the LLM for JSON that maps to a TypeScript type and validate before responding. Treat any malformed output as a fallback.

5. **Provider key safety** — never log the API key. Log only that the LLM call succeeded/failed and the chosen model id.

## Hard rules

- Do not default a feature to Opus-class models. The Bugbot rule in `.cursor/BUGBOT.md` will flag the PR. Use `claude-sonnet-4-6` unless an Opus run was approved (link the approval in the PR and add an `// opus-approved: <link>` comment beside the model id).
- Do not add a new direct dependency on `@anthropic-ai/sdk` or `openai` in n8n product code; those are reserved for tests and SDK adapters.
- All user-facing text (system prompts visible in tooltips, badges, errors) goes through `@n8n/i18n`.
- Streaming UIs (SSE/push) are heavier than they look — keep v1 sync JSON unless the feature truly needs token streaming.

## Tests

Cover, in unit tests:

- Empty key → fallback response, `mode: 'fallback'`.
- LLM throws → fallback response, `mode: 'fallback'`, error logged.
- LLM returns malformed JSON → fallback response.
- LLM returns valid JSON → parsed, `mode: 'llm'`, citations validated against the workspace data.

## Related

- `n8n-build-feature`
- `n8n-demo-feature`
- `.cursor/BUGBOT.md`
