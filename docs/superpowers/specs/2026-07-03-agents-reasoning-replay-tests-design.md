# Provider-generic reasoning replay integration tests for @n8n/agents

Date: 2026-07-03
Status: implementing

## Problem

PR #33193 (`fix: Preserve AI Assistant Anthropic reasoning through proxy`) added a
guard in `packages/@n8n/agents/src/runtime/model/messages.ts`
(`hasReplayableReasoningProviderOptions`) that drops reasoning parts from
replayed history unless they carry Anthropic `signature`/`redactedData` (or
metadata from a provider other than anthropic/openai). OpenAI reasoning replay
metadata (`itemId`, `reasoningEncryptedContent` under `providerOptions.openai`)
is explicitly excluded, so on OpenAI reasoning models every tool call fails on
the follow-up request with `function_call was provided without its required
reasoning item`.

The integration suite (nockBack VCR, replay in CI) could never catch this:

- The only OpenAI reasoning test (`thinking.test.ts`, o3-mini) is single-turn
  with no tools — history is never replayed through `toAiMessages`.
- Every tool-call test uses `getModel()` → `gpt-4o-mini` / `claude-haiku-4-5`,
  both non-reasoning models.
- Across all cassettes, not a single recorded OpenAI request replays assistant
  history (23 OpenAI requests total: 19 embeddings, 4 single-turn).

This was a coverage gap, not a VCR limitation: nockBack lockdown mode matches
recorded request bodies, so a regression that changes the outbound request
shape fails replay deterministically.

## Goal

1. Make reasoning + client-executed tool coverage provider-generic
   (Anthropic + OpenAI now, more providers later as one-line additions).
2. Verify the regression on master is caught by the new tests.
3. Record real cassettes for both providers (blocked on API keys; OpenAI can
   only record green once the reasoning fix lands, so this branch merges with
   or after the fix).

## Design

### Provider/model matrix (`helpers.ts`)

```ts
export interface ReasoningProviderCase {
  provider: 'anthropic' | 'openai';
  model: string;      // full 'provider/model' id
  thinking: object;   // provider-specific thinking config
}
export const REASONING_PROVIDER_CASES: ReasoningProviderCase[] = [
  { provider: 'anthropic', model: 'anthropic/claude-sonnet-4-5', thinking: { budgetTokens: 5000 } },
  { provider: 'openai',    model: 'openai/gpt-5-mini',           thinking: { reasoningEffort: 'low' } },
];
```

Existing test files stay untouched; they can migrate to the matrix
incrementally. Their existing Anthropic cassettes remain valid.

### New test file `reasoning-tool-replay.test.ts`

Loops over the matrix; each case wrapped in `describeIf(provider)` so it
skips locally when that provider's key is absent, and always runs in CI
replay. Provider name is embedded in every `it()` title because
`cassetteName()` derives the cassette path from the test name only —
identical titles across providers would collide.

Per provider case:

- **Replay round-trip test (regression guard):** agent with `add_numbers`
  tool + `.thinking(provider, cfg)`, one `stream()` call that forces a tool
  call, asserting the tool resolved and the final text contains the sum.
  This makes a second provider request that replays reasoning +
  function_call — the path #33193 broke. Both providers reject a
  function_call/tool_use whose reasoning block was stripped, so breakage
  fails the test in record mode (provider 400) and replay mode (nock body
  mismatch).
- **Metadata retention test:** asserts the run's returned messages retain a
  reasoning part carrying replay metadata (`anthropic.signature` /
  `openai.itemId`), catching silent drops.

### Verification on master (no API keys in this environment)

- Unit-level: feed `toAiMessages` a message with OpenAI reasoning replay
  metadata on master → reasoning part is dropped (demonstrates the bug).
- Integration-level: crafted OpenAI cassette replayed on master → second
  request omits the reasoning item → nock "no match for request" → test
  fails. Crafted cassette is a placeholder to be replaced by a real
  recording once keys are available.

### Recording

`packages/@n8n/agents/.env` with `ANTHROPIC_API_KEY` + `OPENAI_API_KEY`,
then `pnpm test:integration:record`. Anthropic records green on master;
OpenAI records green only with the reasoning fix applied.

## Out of scope

- Migrating existing tool-call suites onto the matrix (follow-up).
- The second half of the eventual fix (instructive error for malformed
  streamed tool inputs) — better served by unit tests on the stream parser.
