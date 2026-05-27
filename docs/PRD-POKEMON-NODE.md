# PRD: Pokemon Node for n8n

**Author:** Corey Latislaw (with Claude Opus 4.7 multi-agent review)
**Date:** 2026-05-27
**Status:** Approved (post adversarial review)
**Scope:** n8n Product Engineer take-home assignment

---

## Problem Statement

n8n users need a native way to access Pokemon data from PokeAPI (https://pokeapi.co/) within their workflows. Currently, users must use the generic HTTP Request node with manual URL construction, which requires knowledge of the PokeAPI schema and produces unstructured output that's hard to chain with downstream nodes.

## User Stories

### US-1: List Pokemon
**As** an n8n workflow builder,
**I want** to list Pokemon with a configurable limit,
**So that** I can browse available Pokemon and feed names/IDs into downstream nodes.

**Acceptance Criteria:**
- Node appears in the n8n palette under the correct category
- "Get Many" operation is available
- User can set a limit (1-100, default 20)
- Output is an array of `{name, url}` items extracted from the API envelope
- Field description explicitly states that list results are name+URL only

### US-2: Get Pokemon by Name or ID
**As** an n8n workflow builder,
**I want** to get detailed Pokemon data by name or numeric ID,
**So that** I can access stats, types, abilities, and sprites for use in my workflow.

**Acceptance Criteria:**
- "Get" operation is available
- Accepts either a name (e.g., "pikachu") or numeric ID (e.g., "25")
- Input is case-insensitive
- Default: simplified output with key fields (id, name, height, weight, base_experience, types, abilities, stats, sprite, species)
- Toggle to get full raw API response when needed
- 404 errors produce a clear NodeApiError message
- continueOnFail works correctly with pairedItem tracking

### US-3: AI Agent Tool Use
**As** an n8n AI workflow builder,
**I want** the Pokemon node to be usable as a tool by AI agents,
**So that** agents can autonomously look up Pokemon data in conversational flows.

**Acceptance Criteria:**
- `usableAsTool: true` in node description
- Node-level description clearly explains what each operation returns
- `action` strings on operations for agent operation selection

## Composable Pattern

The node is designed for composability in n8n's visual workflow model:

```
[Get Many (limit: 10)] → [Loop Over Items] → [Get (by name)] → [Process Details]
```

- Get Many returns the index (name + URL)
- Get enriches a single entry with full details
- Users wire them together in the canvas

This is a deliberate design choice — the list endpoint only returns stubs, and enriching all results inline would be an N+1 API call pattern that violates PokeAPI's fair-use policy and hides latency from the user.

## Out of Scope (deliberate)

| Feature | Reason |
|---------|--------|
| Return All toggle | List returns stubs only — 1350 incomplete records is misleading. Cut during adversarial review. |
| Resource selector | Single resource = clutter. OpenWeatherMap (same pattern) omits it. |
| Simplify on Get Many | List only returns name+url — nothing to simplify. Hidden via displayOptions. |
| Offset UI field | Static offset encourages hardcoded pagination state. Users inject via expression. |
| Search by type | Out of scope for 1-2 hour budget. Document as "with more time" in APPROACH.md. |
| Credentials | PokeAPI is free, no auth required. |

## Data Shapes

### Get Many Output
```json
[
  { "name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/" },
  { "name": "ivysaur", "url": "https://pokeapi.co/api/v2/pokemon/2/" }
]
```

### Get Output (Simplified, default)
```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "base_experience": 112,
  "types": ["electric"],
  "abilities": ["static", "lightning-rod"],
  "stats": {
    "hp": 35,
    "attack": 55,
    "defense": 40,
    "special-attack": 50,
    "special-defense": 50,
    "speed": 90
  },
  "sprite": "https://raw.githubusercontent.com/.../25.png",
  "species": "pikachu"
}
```

### Get Output (Full, simplify=false)
Raw PokeAPI response (~200KB including moves array).

## Node UI

```
┌─────────────────────────────────┐
│ Pokemon                    🔴⚪  │
├─────────────────────────────────┤
│ Operation: [ Get        ▼ ]     │
│                                 │
│ Pokemon Name or ID: [pikachu ]  │
│   "Name or numeric ID.          │
│    Case-insensitive."           │
│                                 │
│ ☑ Simplify                      │
│   "Return simplified version    │
│    instead of raw data"         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Pokemon                    🔴⚪  │
├─────────────────────────────────┤
│ Operation: [ Get Many   ▼ ]     │
│                                 │
│ Limit: [ 20 ]                   │
│   "How many to return.          │
│    Returns name and URL only —  │
│    use Get for full details."   │
└─────────────────────────────────┘
```

## Success Metrics (for take-home evaluation)

1. Both operations work correctly in the n8n editor
2. Clean TDD history showing test-first discipline
3. Typed TypeScript with no `any`
4. Follows n8n conventions (httpRequest, NodeApiError, pairedItem, action strings)
5. Comprehensive test coverage (unit + workflow tests)
6. Clear APPROACH.md documenting decisions and trade-offs

## Test Strategy

See ADR-001 for testing approach details. Key points:
- BDD scenarios drive test cases
- Incremental TDD: one Red→Green→Refactor cycle per behavior
- Both unit tests (jest + nock) and workflow tests (NodeTestHarness)
- Edge cases: null sprites, empty nameOrId, 404 errors, multi-type Pokemon

## References

- PokeAPI docs: https://pokeapi.co/docs/v2
- n8n node development: packages/nodes-base/AGENTS.md
- CoinGecko node (reference): packages/nodes-base/nodes/CoinGecko/
- OpenWeatherMap node (UI reference): packages/nodes-base/nodes/OpenWeatherMap/
- Adversarial review: docs/REVIEW-DISCUSSION.md
