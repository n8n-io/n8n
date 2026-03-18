# Converging Chat Hub and Instance AI — Proposal for Team Discussion

## Problem

n8n will ship two separate chat interfaces: **Chat Hub** (existing) and **Instance AI** (in development). Both are full-screen chat experiences with conversation history, but they serve different purposes. Having both will confuse users — "which chat do I use?" — and fragments the product surface.

This document proposes a phased roadmap to converge them into a single unified chat experience aligned with the design team's "One Agent" vision.

## Current State

### Instance AI (feature/instance-ai branch)
- Autonomous agent with 50+ domain tools (workflow CRUD, executions, credentials, data tables, web research, filesystem)
- Admin-configured LLM (env var `N8N_INSTANCE_AI_MODEL`)
- Mastra-based orchestrator that dynamically spawns sub-agents
- Observational memory (context compression for long conversations) + working memory (user context across threads)
- SSE streaming with agent tree visualization
- Backend: `packages/cli/src/modules/instance-ai/`, core: `packages/@n8n/instance-ai/`

### Chat Hub (master)
Three sub-features under one roof:

1. **Base LLM Chat**: Direct conversations with 13+ LLM providers using user-provided or admin-configured credentials. No tools, no agent overhead — just chat.
2. **Personal Agents**: User-created agents with custom system prompts, tools, file attachments/knowledge bases. Execute as temporary internal workflows. No workflow canvas needed.
3. **Workflow Agents**: Real workflows with Chat Trigger, exposed for chatting. Support streaming, multi-turn (Chat nodes pause execution and wait for user reply), draft and published modes. Key differentiator from generic chat products.

Plus: `global:chatUser` role (chat-only access, no workflow editor), WebSocket push streaming, rich message types (artifacts, buttons, code).

### Key Architectural Differences

| Dimension | Chat Hub | Instance AI |
|---|---|---|
| Execution model | Temporary n8n workflows | Mastra Agent with tool calls |
| Streaming | WebSocket push (`Push.sendToUsers()`) | SSE (`text/event-stream`) |
| Credential model | Per-user, per-session | Admin-configured, single model |
| Message model | Flat with retry/revision/attachment chains | Thread-based with agent tree |
| Memory | Simple message history | Observational memory + working memory |
| User roles | Supports `global:chatUser` | Normal authenticated users only |

### Key Insight

These are **complementary layers**, not competing features. Chat Hub is a multi-provider chat client with workflow execution capabilities. Instance AI is an autonomous operations agent. The confusion is purely UX — two chat panels — not capability overlap.

---

## Feature-by-Feature Analysis

### Base LLM Chat — Keep, reposition as lightweight mode

Users want to talk to specific models for specific tasks (GPT for writing, Claude for coding) without Instance AI's 50+ tool overhead. This is a valid use case.

**Recommendation**: Keep as a first-class mode within the unified UI. Long-term, Instance AI *could* absorb this via model routing or a "simple chat" mode that strips the agent overhead, but this is low priority and the current approach works well.

**Deprecation**: Not recommended in the near term. Revisit once Instance AI supports multi-model orchestration natively.

### Personal Agents — Keep, evolve toward Instance AI backing

Personal agents let users create simple agents without the workflow canvas. They're valuable for the `chatUser` role and for users who want purpose-built assistants.

**Recommendation**: Keep as-is short-term. Long-term, offer an optional "Instance AI-powered" backend where a personal agent becomes a configured Instance AI persona (custom system prompt + restricted tool subset + admin model). The "Direct LLM" backend remains for users who want their own model/credential.

### Workflow Agents — Keep as first-class, add Instance AI integration

Workflow agents are n8n's differentiator — workflows-as-agents. They must remain a first-class direct-chat option.

**Additionally**, Instance AI should be able to delegate to workflow agents. This is architecturally complex because workflow agents can be multi-turn (Chat nodes pause execution, wait for user input, resume). Two approaches:

**Option A — Single-turn only**: Instance AI sends one message to a workflow agent, gets a response. Simple to implement, covers deterministic "respond to chat" workflows. Multi-turn workflows would only work in direct chat mode.

**Option B — Multi-turn support**: Instance AI manages a sub-conversation with a workflow agent. When the workflow pauses on a Chat node, Instance AI can either:
- (a) Ask the *user* for input (via `ask-user` tool) and relay it to the workflow — the user sees a "sub-conversation" within the agent tree
- (b) Generate the reply *itself* based on context — fully autonomous delegation where the orchestrator acts as the user for the workflow agent

Option B is significantly more complex but more powerful. It requires Instance AI to manage `ChatHubExecutionService` lifecycle (start, detect waiting state, resume with new input, repeat until completion). The UX for (a) would show the workflow agent's questions as nested prompts in the agent tree.

**Recommendation**: Start with single-turn (Option A), iterate toward multi-turn (Option B-a, where user provides input) when the UX for nested conversations is designed.

### Chat-Only Users — Must continue working

**Recommendation**: Chat-only users see the unified chat. Instance AI is conditionally available (admin opt-in). When enabled, destructive tools (delete workflow, activate/deactivate, etc.) check user role and deny access.

---

## Phased Roadmap

### Phase 0: Unified Message Schema (~2-3 weeks)

**Goal**: One frontend component can render messages from any backend.

Define a `UnifiedChatMessage` type in `@n8n/api-types` that represents all message types: plain LLM text, tool call results, agent activity trees, structured chunks (artifacts, code, buttons), workflow execution outputs.

**Do NOT unify the transport** (WebSocket vs SSE). They serve different needs — WebSocket for Chat Hub's multi-session push model with Redis pub/sub, SSE for Instance AI's long-running agent tasks with stateless reconnect. Unification happens at the message schema level.

**Key files**:
- `packages/@n8n/api-types/src/chat-hub.ts`
- `packages/@n8n/api-types/src/push/chat-hub.ts`

### Phase 1: Unified Frontend Shell (~3-4 weeks)

**Goal**: One chat panel instead of two.

Single chat view at `/home/chat` that aggregates conversations from both Chat Hub and Instance AI. The "new conversation" flow extends the existing model/agent picker to include "Instance AI" as an option alongside LLM providers, personal agents, and workflow agents.

Each conversation is tagged with its backend type. Rendering delegates to the appropriate component — Instance AI's rich agent tree view vs Chat Hub's message view. Frontend stores remain separate (`chat.store.ts` + `instanceAi.store.ts`); the unified view composes them.

**Deprecates**: Standalone `/instance-ai` route (redirect to `/home/chat`).

**Key files**:
- `packages/frontend/editor-ui/src/features/ai/chatHub/ChatView.vue` — extend as unified shell
- `packages/frontend/editor-ui/src/features/ai/instanceAi/` — reuse components, remove standalone view
- `packages/frontend/editor-ui/src/features/ai/chatHub/module.descriptor.ts` — absorb instance-ai routes

### Phase 2: Instance AI as Chat Hub Provider (~4-6 weeks)

**Goal**: Backend unification — Instance AI is a provider within Chat Hub's service layer.

Add `provider: 'instance-ai'` to `ChatHubProvider`. When `ChatHubService.sendHumanMessage()` sees this provider, it routes to `InstanceAiService.startRun()` instead of building a temporary workflow.

Bridge Instance AI's SSE events to WebSocket push via a thin `InstanceAiStreamBridge` that subscribes to `InProcessEventBus` and emits `chatHubStreamChunk` push events.

Instance AI's own DB tables (threads, messages, observational memory, etc.) remain — the Chat Hub session holds a reference. No risky data migration.

**Deprecates**: Direct frontend use of `/instance-ai/*` API routes (kept as aliases for one release cycle).

**Key files**:
- `packages/@n8n/api-types/src/chat-hub.ts` — extend `ChatHubProvider` enum
- `packages/cli/src/modules/chat-hub/chat-hub.service.ts` — routing branch
- `packages/cli/src/modules/instance-ai/instance-ai.service.ts` — expose for Chat Hub
- New: `InstanceAiStreamBridge` service

### Phase 3: Credential & Role Convergence (~3-4 weeks)

**Goal**: Clean up the credential model and extend role support.

- Instance AI gains a credential resolution chain: user preference → admin default → env var fallback (partially exists via `PersistedUserPreferences`)
- Chat Hub gains admin default credentials per provider (partially exists via `ChatHubSettingsService`)
- Chat-only users get conditional Instance AI access (admin opt-in)
- Instance AI tools check `context.userRole` for permission enforcement

**Intentional difference preserved**: Instance AI uses a single powerful admin-managed model (you don't want a cheap model building your workflows). Base LLM chat lets users pick their own models.

### Phase 4: Workflow Agent ↔ Instance AI Integration (~4-6 weeks)

**Goal**: Instance AI can delegate to workflow agents.

**Step 1 — Single-turn**: New Instance AI tool `chat-with-workflow-agent` that lists available workflow agents, sends a message via `ChatHubExecutionService`, waits for completion, returns the response as a tool result. Works for deterministic workflows with "Respond to Webhook" or "last node" response modes.

**Step 2 — Multi-turn**: Extend the tool to detect when a workflow enters `waiting` state (Chat node paused). When this happens, Instance AI uses its `ask-user` tool to relay the workflow's question to the user, then resumes the workflow execution with the user's answer. This creates a visible "sub-conversation" in the agent tree: `Instance AI → [delegates to Workflow Agent] → [Workflow asks: "Which environment?"] → [User answers: "Production"] → [Workflow continues]`.

**UX**: Workflow agent interactions appear as expandable tool call sections in the agent tree. The user sees what workflow was called, what it asked, what it returned.

**Key files**:
- New tool: `packages/@n8n/instance-ai/src/tools/workflow/chat-with-workflow-agent.ts`
- `packages/cli/src/modules/chat-hub/chat-hub-execution.service.ts` — reuse execution logic
- `packages/cli/src/modules/instance-ai/adapter.ts` — expose workflow agent execution

### Phase 5: Personal Agent Evolution (~3-4 weeks)

**Goal**: Personal agents can optionally be powered by Instance AI.

Personal agent editor gains a "Backend" toggle: **Direct LLM** (current behavior — user's model + credential) vs **Instance AI-powered** (admin's model + Instance AI orchestrator with custom system prompt and user-selected tool subset).

This is where the "One Agent" vision materializes for power users: create specialized Instance AI personas ("my data analyst", "my workflow builder") without understanding the underlying architecture.

### Phase 6: Cleanup (~2-3 weeks)

Remove deprecated `/instance-ai/*` routes and standalone frontend module. Consolidate or cross-reference remaining DB tables. Update telemetry and documentation.

---

## What Should NOT Be Merged

| Keep separate | Reason |
|---|---|
| Mastra agent framework vs workflow execution engine | Fundamentally different execution models — one is LLM tool-calling, the other is n8n workflow DAG execution |
| Observational memory system | Sophisticated context compression specific to long Instance AI conversations — not needed for Chat Hub's simpler conversations |
| Tool definition formats | Chat Hub tools are `INode` definitions; Instance AI tools are Mastra tool definitions — incompatible abstractions |
| In-process event bus | Needed for sub-agent coordination within Instance AI; different concern from Chat Hub's Redis pub/sub relay |

---

## Timeline

```
Phase 0 ──────── (2-3w)   Unified message schema
Phase 1 ────────── (3-4w) Unified frontend shell
Phase 2 ──────────── (4-6w) Instance AI as Chat Hub provider
                     ├── Phase 3 ──── (3-4w) Credential & role convergence
                     ├── Phase 4 ──────── (4-6w) Workflow agent integration
                     └── Phase 5 ──── (3-4w) Personal agent evolution
Phase 6 ──── (2-3w) Cleanup
```

**Phases 0-2** are the critical path (~10-13 weeks) and deliver the main UX improvement: one chat panel instead of two.

**Phases 3-5** can be parallelized and deliver deeper integration (~4-6 weeks additional with parallel work).

**Total**: ~5-8 months for full convergence, with the key UX win landing in ~3 months.

---

## Open Questions for Discussion

1. **Should Instance AI be the default for new conversations?** Or should users explicitly pick it? If it's the default, users get the most powerful experience immediately but at higher LLM cost. If it's opt-in, users might never discover it.

2. **How should the unified UI handle the visual difference between Instance AI's rich agent tree and Chat Hub's simpler messages?** Should we standardize on one rendering approach, or is the per-provider rendering acceptable?

3. **Multi-model orchestration**: The "One Agent" design vision mentions orchestrating across models (cheap for simple queries, specialized for images, etc.). This is currently not in Instance AI. Should it be a goal for this convergence, or a separate initiative?

4. **Electron app / local computer access**: The "One Agent" vision mentions filesystem and command line access via a dedicated Electron app. Instance AI already has filesystem tools. How does this factor into the timeline?

5. **Skills/connections marketplace**: The Figma design shows a "Skills" page with installable integrations. How does this relate to Instance AI's MCP tool support and Chat Hub's tool definitions?
