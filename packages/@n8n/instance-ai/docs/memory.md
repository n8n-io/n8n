# Memory System

## Overview

The memory system serves three purposes:

- **Native agent persistence** — thread and message storage through the
  `@n8n/agents` `BuiltMemory` interface.
- **Operational context management** — rolling compaction of older messages into
  a thread metadata summary when the conversation approaches the model context
  window.
- **Conversation continuity** — recent messages, plan state, retry history,
  checkpoints, UI run snapshots, and semantic recall hooks for backends that
  support retrieval.

Sub-agents are stateless. Context is passed through the briefing, and retry
history is appended from thread-scoped iteration logs.

## Tiers

### Tier 1: Native Storage

Instance AI uses n8n's application database for native agent storage.

| Store | Tables |
|-------|--------|
| `TypeORMAgentMemory` | `instance_ai_threads`, `instance_ai_messages`, `instance_ai_resources` |
| `TypeORMAgentCheckpointStore` | `instance_ai_checkpoints` |
| UI run snapshots | `instance_ai_run_snapshots` |
| Iteration logs | `instance_ai_iteration_logs` |
| Temporary workflow mapping | `ai_builder_temporary_workflow` |

The native agents reset migration clears rows from the active runtime tables
above so stale state does not mix with the native checkpoint/message schema.
Legacy `instance_ai_observational_memory` and `instance_ai_workflow_snapshots`
tables are not read by the native runtime.

### Tier 2: Recent Messages

A sliding window of the most recent N messages is sent as context to the LLM on
every request.

- **Default**: 20 messages
- **Config**: `N8N_INSTANCE_AI_LAST_MESSAGES`

### Tier 3: Rolling Compaction

`InstanceAiCompactionService` estimates thread token usage. When a conversation
exceeds the configured context threshold, older messages outside the recent
tail are summarized by a native compaction agent.

Compaction state is stored in thread metadata under
`instanceAiConversationSummary`. Raw messages remain in the database for UI and
debugging. When a summary exists, it is prepended to the next user input as a
`<conversation-summary>` block; native memory still loads the recent
`lastMessages` tail separately.

### Tier 4: Semantic Recall (Reserved)

The native agents runtime can retrieve semantically related past messages when
the memory backend implements `search()` or the embeddings pair
`saveEmbeddings()` / `queryEmbeddings()`. Instance AI's current
`TypeORMAgentMemory` backend stores threads, messages, and working memory only,
so the semantic recall environment variables are configuration hooks and do not
enable retrieval with the default backend yet.

- **Config**: `N8N_INSTANCE_AI_EMBEDDER_MODEL`
- **Config**: `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` (default: 5)

Disabled by default.

### Tier 5: Plan And Retry State

The `plan` tool stores execution plans in thread metadata. Workflow loop
attempts are stored in `instance_ai_iteration_logs` and appended to sub-agent
briefings on retry.

### Tier 6: Checkpoints And Run Snapshots

Native checkpoints persist suspended agent state for human-in-the-loop resume.
Run snapshots persist the UI agent tree used to reconstruct visible progress
after reconnects.

## Scoping Model

All memory is thread-scoped unless a native memory call explicitly requests a
resource-scoped working-memory key.

- **Recent messages** — current conversation history.
- **Compaction summary** — older context summarized for the same thread.
- **Plan and iteration logs** — current task state and retry history.
- **Checkpoints** — suspended native agent state keyed by run.

### Sub-Agent Memory

Sub-agents do not read or write persistent memory directly. The orchestrator
builds their briefing from the current request, relevant task state, and retry
history.

### Cross-User Isolation

Each user's memory is independent. The agent cannot see other users'
conversations, checkpoints, or runtime state.

## Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `N8N_INSTANCE_AI_LAST_MESSAGES` | number | 20 | Recent message window |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | string | `''` | Reserved embedder model for semantic-recall-capable backends (empty = disabled) |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | number | 5 | Reserved semantic recall match count |
