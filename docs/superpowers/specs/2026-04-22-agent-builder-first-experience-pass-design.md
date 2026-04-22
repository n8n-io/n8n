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
- The `isBuilding` ref — the existing `isBuildChatStreaming` already covers streaming state for the build chat panel.
- The `AgentBuilderProgress.vue` file itself.

Keep: the `v-if="mode !== 'building'"` guard on the radio-button toggle is no longer needed; the toggle is always visible in chat mode. This means a user in a fresh-build chat can switch to Test, which (per existing `setChatMode` logic) kicks them back to home — acceptable and intuitive.

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

### 4. Empty-instructions guard in `write_config`

**File:** `packages/cli/src/modules/agents/builder/agents-builder-tools.service.ts`

After zod validation succeeds, before calling `updateConfig`, reject empty-instruction writes:

```ts
if (!zodResult.data.instructions.trim()) {
  return {
    ok: false,
    errors: [{
      path: '/instructions',
      message:
        'Refusing to write an agent with empty instructions. Ask the user what the agent should do before calling write_config again.',
    }],
  };
}
```

This is a safety net — the prompt change is the primary defence. Returning a structured error means the builder sees the refusal and can act on it without a crash.

Note: we deliberately do NOT add `.min(1)` to the zod schema, because agents start life with empty instructions (initial creation path). The guard lives in the tool handler so initial agent creation is unaffected.

### 5. Frontend error handling for broken agents

**Files:**
- `packages/frontend/editor-ui/src/features/agents/components/AgentChatPanel.vue` (or the chat composable it uses)
- `packages/cli/src/modules/agents/agents.controller.ts` (chat endpoint — to ensure the backend returns a structured error, not a 500 without a message)

When the chat endpoint fails because the agent config is broken (missing model, missing credential, empty instructions), the frontend should show a clear error banner in place of (or above) the chat stream, naming what's missing and suggesting the user either finish configuring the agent or switch to Build.

Implementation outline (verify during build):
- The chat endpoint catches config-validation errors from `AgentsService` and returns a stable shape: `{ error: 'agent_misconfigured', message: string, missing: string[] }`. Any existing generic error path becomes a plain `500` with text.
- The chat composable (`useAgentChat` or equivalent inside `AgentChatPanel`) exposes an `error` ref. When it's set, render a dismissible error banner at the top of the messages area.
- The error banner links the user to the Build tab ("Ask the builder to finish setting this up") via `setChatMode('build')`.

If the existing chat path already surfaces a generic error, we extend it; we don't introduce a second error system.

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
- `agents-builder-tools.service.spec.ts` — add a test that `write_config` rejects empty instructions.
- `agents-builder-prompts.spec.ts` (if it exists, else create) — assert the prompt contains the conversation-mode gate and the research section.

Manual/UI:
- Create a fresh agent → type "build me a gmail-to-slack notifier" on the home screen → expect to land in the Build chat panel, not the progress UI.
- Create a fresh agent → type "hi" → expect a conversational reply asking what the agent should do, NOT a config write.
- Manually save a broken agent config (e.g. clear `instructions` via the sidebar) → chat from the Test tab → expect a clear error banner naming what's missing, not a silent failure.
- On a built agent, ask the builder about a random API → expect it to use web search if it's unfamiliar.

## Risk & rollout

- **Model upgrade (4-5 → 4-6):** behavioural drift risk. Mitigated by the tighter prompt. Fallback: revert the one-line change.
- **Web search cost:** capped at 5 uses/turn. Monitor via Anthropic usage.
- **Empty-instructions guard:** could in theory block a legitimate write if the model tries to write config with just a name/model first and plans to add instructions later. The prompt change discourages this; the guard's error message tells the builder how to recover. Low risk.
