# Anthropic Prompt Caching Strategy Visualization

## Message Stack Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM MESSAGE                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Agent Instructions & Node Schemas                         │  │
│  │ Instance URL                                              │  │
│  │ Response Patterns                                         │  │
│  │ Previous Conversation Summary (if compacted)              │  │
│  │                                                           │  │
│  │ cache_control: { type: 'ephemeral' } ◄── BREAKPOINT 1     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION MESSAGES                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [0] SYSTEM (from above - cached via Breakpoint 1)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [1] USER: "Create a workflow to send emails"           │   │
│  │     (no workflow context, no cache marker)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [2] ASSISTANT: <tool_call: add_node>                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [3] TOOL: "Node added successfully"                     │   │
│  │     (no workflow context, no cache marker)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [4] ASSISTANT: <tool_call: add_node>                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [5] TOOL: "Node added successfully"                     │   │  ◄── ITERATION 3
│  │     (no workflow context, no cache marker)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [6] ASSISTANT: "Workflow ready!"                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [7] USER: "Add error handling"                          │   │  ◄── ITERATION 4
│  │     cache_control: { type: 'ephemeral' } ◄── BP 3       │   │      (current: second-to-last)
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [8] ASSISTANT: <tool_call: add_node>                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [9] TOOL: "What about email validation?"                │   │  ◄── ITERATION 5 (current)
│  │     + <current_workflow_json>                           │   │
│  │     + <current_execution_data>                          │   │
│  │     + <current_execution_nodes_schemas>                 │   │
│  │     cache_control: { type: 'ephemeral' } ◄── BP 4       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Cache Strategy Per Iteration

### ITERATION 1: First Request
```
Messages: [0: SYSTEM, 1: USER]

┌──────────────────────┐
│ [0] SYSTEM           │ ← ✓ Written to cache (BP1)
├──────────────────────┤
│ [1] USER + WORKFLOW  │ ← ✓ Written to cache (BP4)
└──────────────────────┘

Cache writes: BP1 (system) + BP4 (last message)
Cache reads: None (first time)
```

### ITERATION 2: Second Request
```
Messages: [0: SYSTEM, 1: USER, 2: ASSISTANT, 3: TOOL]

BEFORE cleanup:
┌──────────────────────┐
│ [0] SYSTEM           │ ← Already cached
├──────────────────────┤
│ [1] USER + WORKFLOW  │ ← Has OLD workflow + cache marker (needs cleaning)
├──────────────────────┤
│ [2] ASSISTANT        │
├──────────────────────┤
│ [3] TOOL             │ ← NEW (will get workflow)
└──────────────────────┘

AFTER cleanup & marker application:
┌──────────────────────┐
│ [0] SYSTEM           │ ← ✓ Cache HIT (BP1)
├──────────────────────┤
│ [1] USER             │ ← ✓ Cache HIT (workflow removed, BP4 marker removed)
├──────────────────────┤
│ [2] ASSISTANT        │ ← ✓ Cache HIT
├──────────────────────┤
│ [3] TOOL + WORKFLOW  │ ← ✗ Cache MISS (BP4 - new workflow)
└──────────────────────┘

Cache reads: BP1 (system) + partial history
Cache writes: BP4 (last message with new workflow)
```

### ITERATION 3: Third Request
```
Messages: [0: SYSTEM, 1: USER, 2: ASST, 3: TOOL, 4: ASST, 5: TOOL]

BEFORE cleanup:
┌──────────────────────┐
│ [0] SYSTEM           │ ← Cached
├──────────────────────┤
│ [1] USER             │ ← Clean (no workflow)
├──────────────────────┤
│ [2] ASSISTANT        │
├──────────────────────┤
│ [3] TOOL + WORKFLOW  │ ← Has OLD workflow + cache marker (needs cleaning)
├──────────────────────┤
│ [4] ASSISTANT        │
├──────────────────────┤
│ [5] TOOL             │ ← NEW (will get workflow)
└──────────────────────┘

AFTER cleanup & marker application:
┌──────────────────────┐
│ [0] SYSTEM           │ ← ✓ Cache HIT (BP1)
├──────────────────────┤
│ [1] USER             │ ← ✓ Cache HIT (messages 1-2 cached together)
├──────────────────────┤
│ [2] ASSISTANT        │ ← ✓ Cache HIT
├──────────────────────┤
│ [3] TOOL             │ ← ✓ Cache HIT (workflow + BP4 marker removed)
│                      │    → Anthropic finds prefix match!
├──────────────────────┤
│ [4] ASSISTANT        │ ← ✗ Cache MISS (new content)
├──────────────────────┤
│ [5] TOOL + WORKFLOW  │ ← ✗ Cache MISS (BP4 - new workflow)
│     [BP4 marker]     │
└──────────────────────┘

Cache reads: BP1 (system) + messages 1-3
Cache writes: BP4 (last message)
```

### ITERATION 5: Long Conversation
```
Messages: [0: SYS, 1: U, 2: A, 3: T, 4: A, 5: T, 6: A, 7: U, 8: A, 9: T]

BEFORE cleanup:
┌──────────────────────┐
│ [0] SYSTEM           │
├──────────────────────┤
│ [1] USER             │ ← No workflow, no marker
├──────────────────────┤
│ [2] ASSISTANT        │
├──────────────────────┤
│ [3] TOOL             │ ← No workflow, no marker
├──────────────────────┤
│ [4] ASSISTANT        │
├──────────────────────┤
│ [5] TOOL             │ ← No workflow, no marker
├──────────────────────┤
│ [6] ASSISTANT        │
├──────────────────────┤
│ [7] USER + BP3       │ ← Has OLD BP3 marker (will be removed)
├──────────────────────┤
│ [8] ASSISTANT        │
├──────────────────────┤
│ [9] TOOL + WF + BP4  │ ← Has OLD workflow + BP4 (both will be removed)
└──────────────────────┘

AFTER cleanup & marker application:
┌──────────────────────┐
│ [0] SYSTEM           │ ← ✓ Cache HIT (BP1)
├──────────────────────┤
│ [1] USER             │ ← ✓ Cache HIT (prefix match)
├──────────────────────┤
│ [2] ASSISTANT        │ ← ✓ Cache HIT
├──────────────────────┤
│ [3] TOOL             │ ← ✓ Cache HIT
├──────────────────────┤
│ [4] ASSISTANT        │ ← ✓ Cache HIT
├──────────────────────┤
│ [5] TOOL             │ ← ✓ Cache HIT
├──────────────────────┤
│ [6] ASSISTANT        │ ← ✓ Cache HIT
├──────────────────────┤
│ [7] USER             │ ← ✓ Cache HIT (BP3 marker removed, but still matches)
│     [BP3 marker]     │ ← ✓ NEW BP3 marker added (conversation history)
├──────────────────────┤
│ [8] ASSISTANT        │ ← ✗ Cache MISS (new turn)
├──────────────────────┤
│ [9] TOOL + WORKFLOW  │ ← ✗ Cache MISS (BP4 - new workflow state)
│     [BP4 marker]     │
└──────────────────────┘

Cache reads: BP1 + messages 1-7 (85% of prompt)
Cache writes: BP3 (second-to-last) + BP4 (last with new workflow)
```

## Key Insights

### 1. **The "Sliding Window" Pattern**
```
Iteration N-1:            Iteration N:            Iteration N+1:

Messages 1-5: clean       Messages 1-5: clean     Messages 1-7: clean
Message 7: [BP3]      →   Message 7: clean    →   Message 9: [BP3]
Message 9: [BP4+WF]       Message 9: [BP3]        Message 11: [BP4+WF]
                          Message 11: [BP4+WF]
```

The markers "slide forward" through the conversation, always marking the last 2 user/tool messages.

### 2. **Workflow Context Lifecycle**
```
┌─────────────┐
│ NEW REQUEST │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ Strip workflow from old messages│  ← cleanStaleWorkflowContext()
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Add workflow to LAST message    │  ← applyCacheControlMarkers()
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Mark last 2 messages with cache │
│ BP3: conversation history       │
│ BP4: current workflow state     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Send to Anthropic               │
│ → Automatic prefix matching     │
│ → Cache hits on clean messages  │
│ → Cache miss only on BP4        │
└─────────────────────────────────┘
```

### 3. **Cache Hit Visualization**
```
┌────────────────────────────────────────────────────────────┐
│                    ANTHROPIC'S VIEW                        │
│                                                            │
│  Previous Request:         Current Request:               │
│  ┌─────────────────┐      ┌─────────────────┐            │
│  │ System [BP1]    │ ═══  │ System [BP1]    │ ✓ HIT     │
│  │ User msg 1      │ ═══  │ User msg 1      │ ✓ HIT     │
│  │ Tool msg 1      │ ═══  │ Tool msg 1      │ ✓ HIT     │
│  │ User msg 2      │ ═══  │ User msg 2      │ ✓ HIT     │
│  │ Tool msg 2 [BP3]│ ═══  │ Tool msg 2      │ ✓ HIT     │
│  │ User+WF [BP4]   │      │ Tool msg 3 [BP3]│ ✗ MISS    │
│  └─────────────────┘      │ User+WF [BP4]   │ ✗ MISS    │
│                            └─────────────────┘            │
│                                                            │
│  Cache reuses: System + msg1-4 (lines match!)             │
│  Cache writes: New BP3 + BP4                               │
└────────────────────────────────────────────────────────────┘
```

## Result
- ✓ System message: 100% hit (never changes)
- ✓ Old messages: ~100% hit (workflow stripped, prefixes match)
- ✓ Second-to-last: ~85% hit (conversation history cached)
- ✗ Last message: ~0% hit (workflow changes every time)

Only the last message with the fresh workflow state is a cache miss!
