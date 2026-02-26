# Implementation Phases

Sequencing for the deep agent architecture. Optimized for parallel
backend/frontend work with two testable milestones: end of Phase 1
(event infrastructure) and end of Phase 2 (full autonomous loop).

## Phase 1: Event Infrastructure

The event bus (AI-2116) is the critical path — everything else depends on it.
After it lands, backend and frontend work runs in parallel.

```
Backend                              Frontend
────────                             ────────
1. AI-2116 Event Bus + SSE ─────────→ 2. AI-2122 SSE Client + Store
                                          │
3. AI-2117 Run Serialization ────────→ 4. AI-2123 Run State + Cancel UI
                                          │
                                     5. AI-2125 Agent Activity Tree
```

**First testable moment**: Send a message, see events via SSE, cancel works,
agent tree renders (single agent, no sub-agents yet). All existing tools work
through the new transport.

## Phase 2: Deep Agent Loop

Two parallel tracks: plan + delegate tools (backend) alongside their
visualizations (frontend). System prompt comes last since it references both
tools.

```
Backend                              Frontend
────────                             ────────
6. AI-2106 Plan Tool ────────────────→ 8. AI-2126 Plan Visualization
7. AI-2118 Delegate Tool + Factory ──→ 9. AI-2127 Delegate Tool UX

10. AI-2120 Orchestrator System Prompt + config
```

**Second testable moment**: Full end-to-end. "Build me a Slack workflow" →
plan card appears with phase updates → sub-agent branches spawn in the tree →
orchestrator iterates on failures → cancel works mid-loop.

## Phase 3: Hardening

```
11. AI-2119 Observational Memory       (context doesn't degrade over long loops)
12. AI-2124 SSE Reconnection & Replay  (navigate away and come back)
13. AI-2104 HITL Event Bus Alignment   (confirmations through the new transport)
```

## Phase 4: Advanced Features

```
14. AI-2107 Smart Credential Resolver
15. AI-2121 Evaluation Sub-Agent & Eval Tools
16. AI-2128 LangSmith Tracing
17. AI-2111 Thread Persistence & Conversation History
18. AI-2105 Rich Tool Output Renderers
19. AI-2109 Live Execution Progress Streaming
20. AI-2110 Workflow-to-MCP-Tool Pipeline
21. AI-2112 Browser Control via DevTools MCP
22. AI-2113 Proactive Monitoring & Smart Notifications
```
