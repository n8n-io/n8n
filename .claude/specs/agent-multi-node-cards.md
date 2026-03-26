# Node Group Multi-Node Cards — PRD Spec

## Problem

In the setup wizard and setup panel, AI subnodes (models, tools, memory,
embeddings, retrievers) appear as separate, flat cards. This is unintuitive
because users don't see the relationship between a parent node and its
connected subnodes.

## Goal

Show any node with AI sub-node connections and their subnodes as a single
multi-node card with expandable sections per subnode. Reuse as much of the
existing setup infrastructure as possible. Both the **builder setup wizard**
and the **setup panel** must support this behavior.

## Scope

- Applies to **any node** with non-Main AI input connections (agents, chains,
  vector stores, retrievers, etc.).
- Grouping is fully generic — no hardcoded node type list.
- Sub-nodes are collected **recursively** (transitive sub-nodes of sub-nodes
  are included in the same group).
- Only "root parents" (nodes not themselves sub-nodes of another parent) form
  group cards.
- A node without subnodes needing setup looks the same as existing single-node
  cards (rendered as a regular `SetupCardItem`, not a node group).

---

## Requirements

### R1 — Multi-node card structure

An agent card is a single visual card containing:

1. **Agent header**: agent node icon + name.
2. **Agent section** (if the agent node itself has credentials or parameters
   that need setup): shows credential picker and/or parameter inputs, same as
   existing single-node cards.
3. **Subnode sections**: one expandable section per subnode that requires setup
   (has credentials to fill or parameter issues). Each section shows the
   subnode's icon, name, and its credential picker / parameter inputs /
   NDV link — same content as existing single-node cards.
4. **Footer**: shared for the entire card. Contains navigation (wizard) or
   expand/collapse (panel) and a single execute button targeting the agent node.

### R2 — Card visibility rules (consistent with existing behavior)

A subnode appears as a section in the agent card **only if** it has a card in
the flat `setupCards` list (i.e., it has credentials or parameters that need to
be filled). Subnodes with no setup needs do not appear as sections — consistent
with how all other nodes work.

If an agent node has no subnodes with cards and the agent itself has no card,
nothing is shown.

If an agent node has subnodes in the workflow but **none** of them have cards
(e.g., all their credentials are handled by top-level grouped credential cards
and they have no parameter issues), and the agent itself has a card, the agent
is rendered as a **regular single-node card** — not an agent group. Agent group
cards are only created when at least one subnode has a card.

### R3 — Credential grouping stays global

Credential-type grouping is **unchanged and global**. The existing logic that
merges multiple nodes sharing the same credential type into one credential picker
applies across the entire workflow, including across agent boundaries.

- If a subnode's only setup need is a credential handled by a top-level grouped
  credential card, that subnode does **not** appear as a section in the agent
  card (per R2 — nothing left to configure in that section).
- The `showCredentialPicker` flag (first-node-per-credential-type gets the
  picker) continues to work as-is.

### R4 — Expandable sections within the agent card

- Each subnode section is independently expandable/collapsible.
- On initial render, the **first incomplete** section is expanded; all others
  are collapsed.
- Complete sections show a checkmark next to the subnode name.

### R5 — Completion

- The agent card shows a single **overall checkmark** when all sections
  (agent + subnodes) are complete.
- Individual subnode sections show their own completion status (checkmark).
- `isComplete` for the agent group = every visible subnode card is complete AND
  the agent node's own state (if shown) is complete.
- Global credential cards that cover agent subnodes have their own top-level
  completion tracking — they are NOT factored into the agent card's
  `isComplete`. The agent card only tracks what is visible within it.

### R6 — Execution

- The footer has one execute button that targets the **agent node** (not
  individual subnodes).
- Tool nodes remain non-executable individually (existing behavior).
- Execution is shared across all sections — one button for the whole card.

### R7 — Step counting

- In the builder wizard, the agent multi-node card counts as **one step**.
- "2 of 5" step indicator treats the entire agent group as a single entry.
- Navigation (prev/next) moves between the agent card and other top-level cards,
  not between subnode sections.

### R8 — Ordering

- Subnode sections within the agent card follow the existing execution-based
  ordering. No changes to sort logic.
- The agent card's position in the overall card list follows the agent node's
  position in execution order (existing behavior).
- Note: `sortNodesByExecutionOrder` places subnodes BEFORE their parent agent
  in the flat list. The grouping algorithm relies on this.

### R9 — Both consumers

Both the **builder setup wizard** (`BuilderSetupWizard.vue`) and the
**setup panel** (`SetupPanelCards.vue`) must render agent multi-node cards.
The grouping logic lives in the shared `useWorkflowSetupState` composable.

### R10 — Collapsibility per consumer

- **Builder wizard**: the agent card is **not collapsible** (consistent with
  how all wizard cards work — one card shown at a time, always expanded).
- **Setup panel**: the agent card **is collapsible** at the top level
  (consistent with existing panel card behavior). Inside the card, subnode
  sections remain independently expandable/collapsible.

### R11 — Auto-collapse behavior (setup panel)

Consistent with current panel behavior:
- For agent groups: if **any** section has parameters, the group is treated as
  a "card with parameters" (no auto-collapse on completion — requires manual
  collapse).
- If the agent group is credential-only across all sections, it auto-collapses
  on completion and the next incomplete card auto-expands.
- Within the agent card, when a subnode section completes, the next incomplete
  subnode section auto-expands (same first-incomplete-expanded rule as R4).

### R12 — Highlighting

- **Top-level highlighting**: when the agent card is hovered (wizard) or
  expanded (panel), highlight the agent node and all subnodes shown in the card
  on the canvas.
- **Subnode highlighting**: when a specific subnode section has a credential
  picker, highlighting follows the existing credential-type behavior — all
  nodes using that credential type are highlighted (including nodes outside the
  agent card). This is consistent with the current per-node card highlighting.
- Highlighting applies in both the builder wizard and the setup panel.

### R13 — Shared subnodes

If a subnode is connected to multiple agent nodes, it belongs to the **first
agent encountered in execution order** — consistent with existing behavior
where `sortNodesByExecutionOrder` uses a `visited` set and processes each node
exactly once. The subnode's card is pulled into the first agent's group; the
second agent does not include it.

### R14 — Telemetry

No new telemetry events. Existing card-level telemetry (interaction tracking,
completion tracking) continues to fire per section using the same event types.

### R15 — Hide completed cards (setup panel)

When the "hide completed" filter is active, an agent group card is hidden only
when the entire group is complete (`agentGroup.isComplete === true`). If any
section is incomplete, the card remains visible.

---

## Technical Design

### Subnode detection

Agent subnodes are identified via `connectionsByDestinationNode` using AI
connection types (`AiLanguageModel`, `AiTool`, `AiMemory`, `AiOutputParser`,
`AiRetriever`, `AiVectorStore`, etc.). The agent node type is
`@n8n/n8n-nodes-langchain.agent` (`AGENT_NODE_TYPE`).

### Data model

```typescript
/** Groups an agent node with its subnode setup cards */
interface AgentGroupItem {
  agentNode: INodeUi;
  /** Agent's own setup state, if it has credentials/params needing setup */
  agentState?: NodeSetupState;
  /** Subnode cards pulled from the flat list, in execution order */
  subnodeCards: NodeSetupState[];
  /** True when all sections (agentState + subnodeCards) are complete */
  isComplete: boolean;
}

/** Updated union — a card is either a single-node card or an agent group */
type SetupCardItem =
  | { state: NodeSetupState; agentGroup?: undefined }
  | { agentGroup: AgentGroupItem; state?: undefined };
```

Helper to extract completion from either variant:

```typescript
function isCardComplete(card: SetupCardItem): boolean {
  return card.agentGroup ? card.agentGroup.isComplete : card.state.isComplete;
}
```

### Grouping algorithm (in `useWorkflowSetupState`)

```
1. Build flat setupCards as today (no changes to credential grouping).
2. Identify all agent nodes in the workflow via AGENT_NODE_TYPE.
3. For each agent node (in execution order):
   a. Find connected subnodes via connectionsByDestinationNode + AI
      connection types.
   b. Collect subnode node names into a Set.
   c. Scan flat list: pull cards whose state.node.name is in the subnode
      set → subnodeCards. Mark these cards as claimed (a node may connect
      to multiple agents — first agent claims it, consistent with R13).
   d. Scan flat list: pull card whose state.node.name matches agent node
      → agentState.
   e. If subnodeCards is empty → skip. Don't create an agent group.
      Leave the agent's own card (if any) as a regular SetupCardItem.
   f. Build AgentGroupItem { agentNode, agentState?, subnodeCards,
      isComplete }.
4. Build final list: replace pulled cards with AgentGroupItem entries.
   Agent group position = agent node's execution-order position.
   Standalone cards remain as-is.
```

### Changes by file

| File | Change |
|------|--------|
| `setupPanel.types.ts` | Add `AgentGroupItem`; update `SetupCardItem` union; add `isCardComplete` helper |
| `useWorkflowSetupState.ts` | Post-process flat `setupCards` into grouped list: detect agent nodes, pull subnode cards into `AgentGroupItem`s. Export grouped list as `setupCards`. |
| `SetupCardBody.vue` (new) | Extract shared card body (credential picker + parameter list + NDV link) from existing card components |
| `AgentGroupCard.vue` (new, builder) | Multi-node card for wizard: agent header, expandable subnode sections using `SetupCardBody`, shared footer with execute + navigation |
| `AgentGroupSetupCard.vue` (new, panel) | Multi-node card for setup panel: collapsible outer card, expandable inner subnode sections using `SetupCardBody`, shared footer with execute |
| `BuilderSetupCard.vue` | Refactor to use `SetupCardBody` |
| `NodeSetupCard.vue` | Refactor to use `SetupCardBody` |
| `SetupPanelCards.vue` | Render `AgentGroupSetupCard` for group items; adjust expansion/auto-collapse tracking; use `isCardComplete` helper |
| `BuilderSetupWizard.vue` | Conditionally render `AgentGroupCard` vs `BuilderSetupCard`; update highlighting for agent groups |
| `useBuilderSetupCards.ts` | Use `isCardComplete` helper for `isAllComplete`, `skipToFirstIncomplete` |

### Key implementation notes

1. **`SetupCardItem` union is breaking**: every consumer that accesses
   `card.state` must be updated to handle the discriminated union. Key spots:
   `useBuilderSetupCards.ts` (`isAllComplete`, `skipToFirstIncomplete`),
   `SetupPanelCards.vue` (`cardKey`, expansion tracking, auto-collapse),
   `BuilderSetupWizard.vue` (highlighting, rendering).

2. **Expression context per section**: `BuilderSetupCard` provides
   `ExpressionLocalResolveContextSymbol` per node. Each subnode section in the
   agent group card needs its own expression context for its node.

3. **Sticky parameters (panel only)**: `NodeSetupCard` uses `shownParameters`
   ref to persist parameters after issues resolve. Each subnode section in the
   panel's agent group card needs its own sticky parameter tracking.

4. **`autoAppliedAcknowledged` (panel only)**: `NodeSetupCard` tracks whether
   auto-applied credentials have been acknowledged. Each subnode section in the
   panel's agent group card needs its own acknowledgment tracking.

5. **`showCredentialPicker` ordering**: subnodes appear before their agent in
   execution order. If a subnode and the agent share a credential type, the
   subnode gets `showCredentialPicker: true`. This is correct — the picker
   appears in the first section that needs it.

6. **`cardsWithParameters` in `SetupPanelCards`**: agent groups should be
   treated as "has parameters" if any section has parameters, preventing
   auto-collapse on completion.

7. **Card key for agent groups**: `SetupPanelCards` uses `cardKey()` for
   expansion state tracking. Agent groups use `agent-${agentNode.id}` as key.

8. **Multiple cards per node**: A node with two per-node credential types can
   produce two cards in `nodeStates`. If such a node is an agent subnode, both
   cards are pulled into the agent group as separate sections. This is rare but
   the algorithm handles it naturally since it scans by `state.node.name`.

9. **Auto-apply runs on pre-grouping data**: The auto-apply credential logic
   in `useWorkflowSetupState` iterates `credentialTypeStates` and `nodeStates`
   directly, not `setupCards`. Grouping does not affect auto-apply.

### What stays unchanged

- `groupCredentialsByType()` — global, no agent scoping
- `perNodeCredTypes` classification — unchanged
- `credentialTypeStates` — unchanged
- `setCredential` / `unsetCredential` — work per-node, no changes
- `isNodeSetupComplete()` — per-node, reused for each section
- Auto-apply and auto-test credential logic — unchanged
- Sticky tracking in `useWorkflowSetupState` — unchanged
- `sortNodesByExecutionOrder()` — unchanged
- Telemetry event types — unchanged

---

## Out of Scope

- Agent-scoped credential grouping (credentials group globally as today)
- Shared subnode deduplication beyond first-agent-wins (R13)
- Changes to non-AI-Agent node cards
- Changes to credential auto-apply logic
- Changes to execution order sorting
- New telemetry events
