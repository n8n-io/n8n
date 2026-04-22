# Agent Builder: First-Experience Pass — Design

**Date:** 2026-04-22
**Owner:** Michael Drury
**Scope:** n8n agent builder (`packages/cli/src/modules/agents`, `packages/frontend/editor-ui/src/features/agents`)

## Problem

The first time a user creates an agent in n8n, they land in a distinct "building" UI (`AgentBuilderProgress.vue`) — a centered spinner with ~7 rotating monospace log lines showing tool calls. This differs from the Build tab an already-built agent shows (a full `AgentChatPanel` with `endpoint="build"`). The mismatch is confusing: users learn one pattern for their first build, then see a different pattern afterward.

The builder agent also has two prompt-related issues:

1. **It builds when it shouldn't.** The system prompt is biased toward immediate action. A user saying "hi" triggers an attempted build with fabricated instructions, producing a semi-broken agent that can't chat properly.
2. **It's silent.** `RESPONSE_STYLE_SECTION` tells it to reply with a single sentence ("Done."). Users don't learn what changed, so they have no mental model of the agent they just built.

It also lacks a research capability: when the builder encounters an unfamiliar API or node, it guesses.

Finally, when an agent is in a broken state (missing instructions / model / credential), the chat breaks with no user-facing error message.

## Goals

1. First-build UX matches the Build-tab UX — same component, same layout, same affordances.
2. Builder agent asks clarifying questions when user intent is unclear; never writes empty-instruction configs.
3. Builder agent explains what it did in 1–2 sentences after each build step (but still terse — no JSON repetition).
4. Builder can search the web when uncertain about APIs / services.
5. A broken agent surfaces a clear error in the frontend instead of failing silently.
6. Builder runs on the current-generation model (`claude-sonnet-4-6`).

## Non-goals

- Redesign of the Build tab itself.
- Changes to the home screen (prompt input, recent sessions).
- Refactoring the agents SDK.
- Telemetry changes.

## Design

### 1. Unify first-build UI with the Build tab

**File:** `packages/frontend/editor-ui/src/features/agents/views/AgentBuilderView.vue`

Remove the `'building'` mode. In `startChat(msg)`, the branch that currently sets `mode.value = 'building'; buildPrompt.value = msg` becomes:

```ts
// Fresh agent — route through the same build chat panel the Build tab uses.
initialPrompt.value = msg;
chatMode.value = 'build';
mode.value = 'chat';
```

`AgentChatPanel` with `endpoint="build"` already accepts `initial-message` and auto-sends it on mount (verified at `AgentChatPanel.vue:85`). Pass `initialPrompt` to the build panel the same way it's currently passed to the test panel.

Delete:
- The `'building'` branch of the `Mode` type.
- The `AgentBuilderProgress` import and its `<AgentBuilderProgress>` render block.
- The `onBuildDone` handler (returning to home is no longer required — the user stays in the build chat and can keep iterating).
- The `buildPrompt` ref (replaced by `initialPrompt`).
- The `AgentBuilderProgress.vue` file itself.

Keep:
- The `isBuilding` ref (or merge with `isBuildChatStreaming`) — still needed by the settings sidebar's `:building` prop.
- `v-if="mode !== 'building'"` is removed; the Test/Build radio toggle shows in chat mode by default.

**Preventing accidental first-build cancellation.**
`setChatMode('test')` in `AgentBuilderView.vue:198` kicks the user back to home when there's no session, which unmounts the build panel — and `AgentChatPanel.vue:92` aborts any in-flight stream on unmount. Today, that's hidden because the `'building'` mode hides the toggle entirely. Removing the mode exposes this as a "switch cancels the build" bug.

Mitigation — disable the Test option of the radio toggle while a first build is streaming AND there is no active session. `N8nRadioButtons` supports a per-option `disabled` flag; compute `options` so the `test` option is disabled when `isBuildChatStreaming.value && !effectiveSessionId.value && chatMode.value === 'build'`. Hover tooltip: "Available once the build produces an agent to test." This matches the current implicit behavior (toggle hidden during build) and is less surprising than an interrupt.

**Behavior change:** After the first build completes, the user stays in the Build chat panel instead of being returned to home. This matches the Build-tab flow and is the consistency the user asked for.

### 2. Builder system prompt rewrite

**File:** `packages/cli/src/modules/agents/builder/agents-builder-prompts.ts`

Three targeted changes:

**(a) New `CONVERSATION_MODE_SECTION`**, inserted before `WORKFLOW_SECTION`:

```
## When to build vs when to converse

Not every user message is a build request. Before calling write_config, patch_config,
or build_custom_tool, check: has the user given you a concrete goal the agent should
accomplish?

If the user just said "hi", asked what you do, gave a vague intent ("build me something
cool"), or asked a question — reply conversationally. Ask what they want the agent to do,
what systems it needs to touch, what triggers it. Only start building once you have a
real goal.

Never call write_config with empty, placeholder, or guessed `instructions`. An agent
without real instructions is broken and can't chat. If you don't have enough detail to
write meaningful instructions, ask the user.
```

**(b) Replace `RESPONSE_STYLE_SECTION`** with:

```
## Response style

Be concise but informative.

After a build step (write_config, patch_config, build_custom_tool), give a 1–2 sentence
summary of what you changed and, if useful, what the user might want to try next. No
field-by-field narration, no JSON repetition, no re-stating the user's request.

When you're asking a clarifying question, respond naturally — a short conversational
reply, not a bulleted list.

Don't narrate your reasoning before a tool call (no "Let me check the credentials…").
Just do it, then summarise the result.
```

**(c) New `RESEARCH_SECTION`**, added after `MEMORY_PRESETS_SECTION`:

```
## Research

You have access to Anthropic's web_search tool. Use it when you encounter an API,
service, node, or concept you don't fully understand. Better to search once and be
correct than to guess at node parameters or endpoint shapes.

Good reasons to search:
- The user named an API or service you're unsure about
- You're unsure of an endpoint's URL shape, auth method, or request format
- The user referenced a recent/external product or standard

Don't search for things you already know (n8n internals, common JS/TS patterns).
```

Insert points updated in `buildBuilderPrompt()`:
```ts
return [
  'You are an expert agent builder…',
  getAgentStateSection(configJson, toolList),
  CONVERSATION_MODE_SECTION,      // new, early
  TOOL_TYPES_SECTION,
  N8N_EXPRESSIONS_SECTION,
  PROVIDER_TOOLS_SECTION,
  MEMORY_PRESETS_SECTION,
  RESEARCH_SECTION,                // new, after memory presets
  getConfigRulesSection(builderModel),
  getSchemaReferenceSection(),
  WORKFLOW_SECTION,
  WRITE_CONFIG_SECTION,
  PATCH_CONFIG_SECTION,
  IMPORTANT_SECTION,
  RESPONSE_STYLE_SECTION,           // rewritten
].join('\n\n');
```

### 3. Wire Anthropic web search into the builder

**File:** `packages/cli/src/modules/agents/builder/agents-builder.service.ts`

Import and attach the provider tool:

```ts
import { Agent, Memory, providerTools } from '@n8n/agents';

// …inside buildAgent()
const builder = new Agent('agent-builder')
  .model({ id: builderModel, apiKey: envAnthropicKey })
  .instructions(instructions)
  .memory(builderMemory)
  .providerTool(providerTools.anthropicWebSearch({ maxUses: 5 }));
```

Conservative `maxUses: 5` per turn. Web search costs Anthropic credits per call; this cap prevents run-away research loops. We can lift it later if it's too constraining.

### 4. Empty-instructions guard on both builder write paths

**File:** `packages/cli/src/modules/agents/builder/agents-builder-tools.service.ts`

The guard has to cover every way the builder can land the agent in an empty-instructions state. The builder has two write paths:

- `write_config` — replaces the whole config.
- `patch_config` — applies RFC 6902 ops; a `replace` or `add` at `/instructions` with `""` would silently land.

Extract a shared helper and call it from both tool handlers:

```ts
const EMPTY_INSTRUCTIONS_ERROR = {
  path: '/instructions',
  message:
    'Refusing to write an agent with empty instructions. Ask the user what ' +
    'the agent should do before calling write_config or patch_config again.',
} as const;

function rejectIfEmptyInstructions(config: AgentJsonConfig):
  | { ok: false; errors: ConfigValidationError[] }
  | null {
  if (!config.instructions.trim()) {
    return { ok: false, errors: [EMPTY_INSTRUCTIONS_ERROR] };
  }
  return null;
}
```

- In `write_config`: after zod validation succeeds, call `rejectIfEmptyInstructions(zodResult.data)` and return its result if non-null.
- In `patch_config`: after zod validation of the patched document, call the same helper on `zodResult.data` and return its result if non-null. For `patch_config`, surface the refusal with `stage: 'schema'` so the builder sees it as a validation-shaped failure, consistent with other post-patch rejections.

**Deliberately NOT addressed here:** the direct config-save path (`AgentsService.updateConfig` / the sidebar JSON editor) still accepts empty `instructions` because the schema only requires `z.string()`. If a user manually clears instructions via the sidebar, the "broken agent" banner from §5 tells them what's missing. That's intentional — §5 is the user-facing safety net for non-builder write paths. The guard's job is narrowly to keep the builder from producing broken agents without user intent.

No change to `AgentJsonConfigSchema` — adding `.min(1)` would break the legitimate empty-instructions creation state of a fresh agent, where the sidebar renders the empty field for the user (or the builder) to fill in.

### 5. Frontend error handling for broken agents

**Transport reality.** Both agent endpoints are SSE, not JSON (`agents.controller.ts:281` for chat, `:385` for build). Headers are flushed before execution starts, so a JSON error body is no longer an option. The existing error contract is a single SSE `data.error` event (`agents.controller.ts:313`, consumed in `useAgentChatStream.ts:224`), which the frontend currently renders inline as `"Error: <message>"` on the assistant message bubble. We extend that same contract — no new protocol.

**Files:**
- `packages/cli/src/modules/agents/agents.controller.ts` — emit a structured SSE error event before starting the stream when the agent is misconfigured.
- `packages/cli/src/modules/agents/agents.service.ts` — add a `validateAgentIsRunnable(agentId, projectId)` helper that returns the list of missing/invalid fields. Called at the top of the chat path.
- `packages/frontend/editor-ui/src/features/agents/composables/useAgentChatStream.ts` — recognise the structured error, expose it on a new `fatalError` ref.
- `packages/frontend/editor-ui/src/features/agents/components/AgentChatPanel.vue` — render a banner when `fatalError` is set; suppress the inline error message for this case.

**Backend — structured SSE error event.**

Extend the SSE event shape with optional structured fields. Current shape (in the `catch` at `agents.controller.ts:311-314`):
```ts
send({ error: errorMessage });
```
New shape for misconfiguration, emitted BEFORE `executeForChat` runs:
```ts
send({
  error: 'This agent is not ready to run yet.',
  errorCode: 'agent_misconfigured',
  missing: string[],  // e.g. ['instructions', 'model', 'credential']
});
res.end();
return;
```
Keep `error: string` for compatibility — every consumer already reads it. The new `errorCode` and `missing` are additive.

The existing catch block that wraps `executeForChat` stays as-is for runtime errors; only the pre-flight misconfiguration check is new. Applied to both `chat` and `build` endpoints, but in practice it only matters for `chat` — the builder is always runnable because it uses an env-var key and has its own prompt/tools.

`validateAgentIsRunnable(agentId, projectId)` returns `{ missing: string[] }` derived from the persisted config:
- `instructions` → empty or whitespace-only string.
- `model` → missing or fails the `AgentJsonConfigSchema` model regex.
- `credential` → `credential` name is set but doesn't resolve to a real credential in the project (skip if `credential` is unset; the runtime falls back to env).

**Frontend — recognise the structured event.**

In `useAgentChatStream.ts` around line 224, extend the `data.error` handler. Today it appends to the assistant message. After the change:

```ts
if (typeof data.error === 'string') {
  if (data.errorCode === 'agent_misconfigured') {
    fatalError.value = {
      message: data.error,
      missing: Array.isArray(data.missing) ? (data.missing as string[]) : [],
    };
    // Suppress the inline error bubble for this case.
  } else {
    ensureMsg();
    assistantMsg.content += `\n\nError: ${data.error}`;
    assistantMsg.status = 'error';
  }
}
```

Expose `fatalError` from the composable alongside `messages`, `isStreaming`, etc.

**Frontend — banner UI.**

In `AgentChatPanel.vue`, when `fatalError.value` is truthy, render a banner above the message list with:
- A short explanation ("This agent needs configuration before it can run.").
- A list of what's missing (joined from `fatalError.missing`, humanised — `instructions` → "Instructions", `credential` → "Credential", etc.).
- A "Finish setup in Build" action that clears `fatalError` and calls the view's `setChatMode('build')` via an event (`@open-build`).

Show the banner in both `chat` and `build` endpoints (for `build` it should in practice never fire, but the branch keeps the component uniform).

Dismiss semantics: the banner clears automatically when the user sends a new message (the next stream resets `fatalError`). No explicit dismiss button — if the user has read it and wants to ignore it, their next action will clear it.

**Scope.** Only misconfiguration triggers the banner. Generic runtime errors (provider failure, network) keep the existing inline-error path.

### 6. Builder model upgrade

**File:** `packages/cli/src/modules/agents/builder/agents-builder.service.ts`

```ts
const builderModel = 'anthropic/claude-sonnet-4-6';
```

Confirmed via SDK test fixtures that `anthropic/<model-id>` is the expected format and `claude-sonnet-4-6` is the current-generation ID.

## Secondary prompt adjustments

Folded into the prompt rewrite in §2:

- `IMPORTANT_SECTION` currently starts with "Always call list_credentials first" — conflicts with the new converse-first gate. Soften to "Call list_credentials before adding credentialed tools".
- `WORKFLOW_SECTION` step 1 ("FIRST call list_credentials, list_workflows…") has the same issue — reword so step 1 is "Understand the user's goal; ask clarifying questions if needed" and the list-credentials/list-workflows guidance moves to step 2.

## Out of scope

- The `AGENT_SESSION_DETAIL_VIEW` route (separate agent session view).
- Home-screen prompt input or recent-sessions UI.
- Builder memory storage / thread model.

## Testing plan

Unit:
- `agents-builder-tools.service.spec.ts` — assert `write_config` AND `patch_config` reject empty/whitespace `instructions`; patch_config refusal surfaces under `stage: 'schema'`.
- `agents-builder-prompts.spec.ts` (if it exists, else create) — assert the prompt contains the conversation-mode gate and the research section.
- `agents.service.spec.ts` — `validateAgentIsRunnable` returns expected `missing` lists for empty instructions, invalid model, unresolved credential.
- `useAgentChatStream.spec.ts` — when the stream emits `{ error, errorCode: 'agent_misconfigured', missing: [...] }`, `fatalError` is set and no inline error bubble is added.

Manual/UI:
- Create a fresh agent → type "build me a gmail-to-slack notifier" on the home screen → expect to land in the Build chat panel, not the progress UI; the Test option of the radio toggle is disabled while the build streams.
- Create a fresh agent → type "hi" → expect a conversational reply asking what the agent should do, NOT a config write.
- Manually save a broken agent config (e.g. clear `instructions` via the sidebar) → chat from the Test tab → expect the misconfigured banner naming "Instructions", with a "Finish setup in Build" action.
- On a built agent, ask the builder about a random API → expect it to use web search if it's unfamiliar.

## Risk & rollout

- **Model upgrade (4-5 → 4-6):** behavioural drift risk. Mitigated by the tighter prompt. Fallback: revert the one-line change.
- **Web search cost:** capped at 5 uses/turn. Monitor via Anthropic usage.
- **Empty-instructions guard:** could in theory block a legitimate write if the model tries to write config with just a name/model first and plans to add instructions later. The prompt change discourages this; the guard's error message tells the builder how to recover. Low risk.
