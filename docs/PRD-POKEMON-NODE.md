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

The following are example JSON outputs that the node produces. These show the structure and fields a user will see in the n8n output panel after executing the node.

### Get Many — Example Output
Each item in the output represents one Pokémon stub. The list endpoint only returns names and URLs — not full details. Users chain this with the Get operation to enrich results.

```json
[
  { "name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/" },
  { "name": "ivysaur", "url": "https://pokeapi.co/api/v2/pokemon/2/" }
]
```

### Get (Simplified) — Example Output
When Simplify is enabled (default), the node extracts the most useful fields from the ~200KB raw API response into a clean, flat structure. This is what most workflow builders will use.

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

### Get (Full) — Example Output
When Simplify is disabled, the node returns the complete PokeAPI response (~200KB, 1000+ lines). Includes the full moves array, game indices, held items, and all sprite variants. Useful when users need data not in the simplified view.

## Node in the Visual Editor

### On the Canvas
The Pokemon node appears as a standard n8n node card on the workflow canvas. Users find it by:
- Clicking the **+** button on any node output
- Searching "Pokemon" or "PokeAPI" in the node picker
- Browsing the "Input" category in the palette

On the canvas, the node shows:
```
┌──────────────────┐
│  🔴 Pokemon      │
│  Get: Pokemon    │  ← subtitle shows current operation
└──────────────────┘
```

### Configuration Panel (opens on click)

**Get operation:**
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
│    instead of raw data. Use     │
│    Simplify for bulk operations │
│    — full data on large result  │
│    sets may cause memory issues"│
└─────────────────────────────────┘
```

**Get Many operation:**
```
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

## Workflow Patterns — How Users Actually Use This Node

### Pattern 1: Quick Lookup (simplest)
A user wants to look up a single Pokémon's stats. One node, immediate result.

```
[Manual Trigger] → [Pokemon: Get "pikachu"] → [Output]
```
The user clicks Execute, gets Pikachu's stats, types, abilities, and sprite in the output panel. Done.

### Pattern 2: List and Enrich (composable)
A user wants full details for the first 10 Pokémon. This is the core composable pattern — the reason Get Many and Get are separate operations.

```
[Manual Trigger] → [Pokemon: Get Many (limit=10)] → [Loop Over Items] → [Pokemon: Get (name={{$json.name}})] → [Collect Results]
```
Get Many returns 10 `{name, url}` stubs. The loop feeds each name into Get, which returns full details. The output is 10 fully enriched Pokémon.

### Pattern 3: Webhook-Triggered API
A user builds an API that returns Pokémon data on demand — other services call their n8n webhook.

```
[Webhook: /pokemon/:name] → [Pokemon: Get (name={{$json.params.name}})] → [Respond to Webhook]
```
External services POST to the webhook with a Pokémon name, get back structured data. Simplify mode keeps the response clean.

### Pattern 4: Scheduled Pokédex Builder
A user builds a daily digest of random Pokémon for a Slack channel or email.

```
[Schedule Trigger: daily] → [Pokemon: Get Many (limit=5)] → [Loop] → [Pokemon: Get] → [Slack: Post Message]
```
Every morning, fetch 5 Pokémon, enrich with full details, post to Slack with sprites and stats.

### Pattern 5: AI Agent Tool Use
An AI agent in n8n can use the Pokémon node as a tool to answer user questions about Pokémon.

```
[Chat Trigger] → [AI Agent (tools: Pokemon node)] → [Chat Response]
```
User asks "What type is Charizard?" → AI agent calls Pokemon Get("charizard") → reads types → responds "Charizard is Fire/Flying type."

The `usableAsTool: true` flag and descriptive `action` strings make this work — the AI agent reads the node description to decide which operation to call.

### Pattern 6: Data Pipeline with Expressions
Advanced users use n8n expressions to dynamically set parameters from upstream data.

```
[Google Sheets: Read Row] → [Pokemon: Get (name={{$json.pokemon_name}})] → [Google Sheets: Update Row]
```
Read a spreadsheet of Pokémon names, look up each one, write stats back to the sheet. The `nameOrId` field accepts expressions, so the value comes from the upstream node.

## Performance Profile

Assessed by Architect agent. All operations are performant for typical use cases. One edge case requires a field description warning.

| Operation | Latency | Memory | Data Transfer |
|-----------|---------|--------|---------------|
| Get (simplified) | ~100ms network + <2ms processing | ~1MB | ~36KB |
| Get (full) | ~100ms + ~8ms | ~600KB per item | ~200KB |
| Get Many (limit ≤ 100) | ~100ms single call | Negligible | ~3KB |
| Return All (1350 stubs) | ~1.4s (14 calls) | ~270KB | ~42KB |

### Risk: Return All → Loop → Get (enrichment pattern)
Users can chain Return All → Loop Over Items → Get to enrich all 1350 Pokemon. This is valid but expensive:
- **Wall clock:** ~2.2 minutes (1302 sequential HTTP calls)
- **Memory (simplified):** ~650KB — safe
- **Memory (full/unsimplified):** ~780MB in-process, ~260MB stored execution data — **will freeze browser UI and OOM on SQLite installations**

**Mitigation (in this submission):** Simplify field description warns: "Use Simplify for bulk operations — full data on large result sets may cause memory issues."

### PokeAPI Fair Use
PokeAPI has no published rate limit but requests caching and reasonable usage. Returns `Cache-Control: public, max-age=86400`. The enrichment pattern (1302 calls in ~2 minutes) is borderline for repeated use.

### Future Enhancements (with more time)
- **In-memory LRU cache:** Cache Pokemon detail responses within a single execution to avoid redundant calls in loop patterns. n8n restarts flush it, so scope is limited — but saves repeated lookups in the same workflow run.
- **Batch enrichment option:** A "Get Many with Details" mode that fetches stubs then auto-enriches in parallel with configurable concurrency. Hides the N+1 pattern from the user.
- **PokeAPI GraphQL integration:** PokeAPI is launching GraphQL v1beta2 (June 2026). GraphQL would let users query exactly the fields they need, reducing the ~200KB response to only what's required. Eliminates the simplify function entirely.
- **Cache node documentation:** Document that users should place an n8n Cache node upstream of the Pokemon Get node for repeated lookups, honoring PokeAPI's 24-hour cache header.

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
