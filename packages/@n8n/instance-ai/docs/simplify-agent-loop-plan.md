# Simplify Instance AI Agent Loop

## Context

The instance-ai agent loop uses three layers of scaffolding that add latency and complexity
without matching what state-of-the-art coding agents (Claude Code, Codex) have converged on:
a **flat tool-use loop** where the model's internal reasoning is the planner, tools are called
directly, and delegation is optional — not mandatory.

This plan removes the unnecessary ceremony while keeping what's genuinely ahead of the curve
(background tasks, observational memory, HITL).

### State of the Art Comparison

```
CLAUDE CODE / CODEX                    INSTANCE AI (current)
────────────────────────               ────────────────────────
Think (internal reasoning)             Plan (explicit tool call)
    │                                      │
    ▼                                      ▼
Tool Call (direct)                     Delegate (spawn sub-agent)
    │                                      │
    ▼                                      ▼
Observe (result in context)            Sub-agent calls tool
    │                                      │
    └── loop                               ▼
                                       Result flows back
                                           │
                                       Evaluate (phase machine)
                                           │
                                           └── loop
```

**Key insight**: Frontier models are good enough at implicit planning that explicit scaffolding
adds latency and rigidity without improving outcomes. Both Claude Code and Codex use the model's
internal reasoning (extended thinking / reasoning tokens) as the planner.

---

## The Three Simplifications

### S1. Replace Explicit Plan Tool with Lightweight Task List

| Before | After |
|--------|-------|
| Structured `PlanObject` with goal, currentPhase enum, iteration counter, steps with toolCallId linking | Flat `TaskList` — array of `{ id, description, status }` |
| `PlanAutoTracker` subscribing to event bus, auto-updating step statuses | Model updates task list directly via `update-tasks` tool |
| 5 step statuses (pending, in_progress, completed, failed, skipped) | 3 statuses (todo, in_progress, done) |
| System prompt: 20 lines of planning discipline rules | System prompt: 3 lines of guidance |
| ~300 lines of code (tool + schemas + auto-tracker) | ~25 lines of code |

**Why**: The auto-tracker is clever engineering solving a problem that doesn't need to exist.
The model can manage a simple checklist. Claude Code has no plan tool at all.

### S2. Remove Delegate-Only Restriction for Execution Tools

| Before | After |
|--------|-------|
| Orchestrator → delegate → sub-agent → run-workflow → result → back | Orchestrator → run-workflow → result |
| 7 tools locked behind mandatory delegation | 7 tools directly callable + delegation as option |
| 3-4x latency for simple "run this workflow" | Single tool call |

**Why**: The restriction existed for "context window protection" but output truncation on the
tools themselves is a better, targeted solution. Claude Code and Codex let the model call
tools directly.

### S3. Give Orchestrator Direct Access to Data Table READ Tools

| Before | After |
|--------|-------|
| "Show my tables" → spawn background agent → agent calls list-data-tables → result | "Show my tables" → list-data-tables → result |
| 3 read tools locked behind manage-data-tables-with-agent | 3 read tools directly callable |
| ~10s latency for a simple read | ~1s latency |

**Why**: Reads are cheap, bounded (max 100 rows), and have no side effects.

---

## What We Keep (already state-of-the-art or better)

| Component | Rationale |
|-----------|-----------|
| Background task system | Neither Claude Code nor Codex has concurrent background agents |
| BUILDER_ONLY_TOOLS restriction | Builder is a specialized agent with its own sandbox + memory |
| 3-tier memory (recent + working + observational) | Better than lossy compaction |
| HITL confirmation protocol | Purpose-built for web UI |
| `delegate` tool (as option, not requirement) | Valuable for parallel work and context isolation |
| Iteration log | Retry intelligence is decoupled from planning |
| Sub-agent factory + protocol | Good constraint: stateless, no recursion |
| Event bus + SSE streaming | Clean pub/sub architecture |

---

## Target Architecture

```
┌─────────────────────────────────────────────┐
│              ORCHESTRATOR                     │
│                                               │
│  Think (extended thinking — not a tool)       │
│       │                                       │
│       ▼                                       │
│  Act (call tools directly)                    │
│       │                                       │
│       ▼                                       │
│  Observe (tool results in context)            │
│       │                                       │
│       ▼                                       │
│  Continue, delegate, or stop                  │
│       │            │                          │
│       │      ┌─────▼──────────┐               │
│       │      │  Background    │ (parallel)    │
│       │      │  agents for    │               │
│       │      │  heavy work    │               │
│       │      └────────────────┘               │
│       │                                       │
│       └──── loop                              │
└───────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: S3 — Data Table Reads

**Files modified**: 2 | **Risk**: Low

1. `src/agent/instance-agent.ts` — Rename `DATA_TABLE_ONLY_TOOLS` → `DATA_TABLE_WRITE_TOOLS`, remove 3 read tools from set
2. `src/agent/system-prompt.ts` — Update data table section: reads are direct, writes use agent

### Phase 2: S2 — Direct Execution Tools

**Files modified**: 4 | **Files created**: 1 | **Risk**: Medium

1. Create `src/tools/executions/truncate-output.ts` — shared truncation helper (8KB cap)
2. Add truncation to `run-workflow.tool.ts`, `get-execution.tool.ts`, `debug-execution.tool.ts`
3. Delete `DELEGATE_ONLY_TOOLS` set from `instance-agent.ts`
4. Update system prompt — remove delegation mandate, add direct-call guidance

### Phase 3: S1 — Replace Plan with Tasks

**Files modified**: 12 | **Files deleted**: 6 | **Files created**: 4 | **Risk**: Low-Medium

1. Define `TaskItem` / `TaskList` schemas in `@n8n/api-types`
2. Create `update-tasks.tool.ts` (~25 lines)
3. Create `task-storage.ts` (Mastra Memory-backed)
4. Delete: `plan.tool.ts`, `plan.schemas.ts`, `plan-auto-tracker.ts`, `plan-storage.ts` + tests
5. Update `instance-ai.service.ts` — remove PlanAutoTracker, wire TaskStorage
6. Update system prompt — replace 20 lines with 3 lines
7. Update frontend: reducer, store, ArtifactsPanel, AgentActivityTree

---

## Net Impact

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Orchestration tool code | ~450 lines | ~100 lines | -350 lines |
| Event bus subscribers | PlanAutoTracker + stream | Stream only | -1 subscriber |
| Tool calls for "run workflow X" | 3-4 (delegate + sub-agent) | 1 (direct) | -75% latency |
| Tool calls for "list tables" | 2+ (spawn agent) | 1 (direct) | -90% latency |
| System prompt planning rules | 20 lines | 3 lines | -85% prompt tokens |
| Plan step statuses | 5 | 3 | Simpler mental model |
| Files deleted | — | 6 | Reduced surface area |
