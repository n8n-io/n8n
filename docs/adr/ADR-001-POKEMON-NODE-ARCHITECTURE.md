# ADR-001: Pokemon Node Architecture Decisions

**Date:** 2026-05-27
**Status:** Accepted
**Decision Makers:** Lead (Opus), QA Reviewer (Sonnet), PM Reviewer (Sonnet), Architect (Sonnet)
**Method:** Adversarial multi-agent spec review with live debate

---

## Context

Building a Pokemon API node for n8n as a take-home assignment. The node integrates with PokeAPI (https://pokeapi.co/) to provide List and Get operations. Key constraints: 1-2 hour time budget, must demonstrate n8n convention awareness, TDD discipline, and product thinking.

Three review agents (QA, PM, Architect) independently analyzed the initial plan and then debated live via team messaging to identify gaps and reach consensus.

---

## Decisions

### D1: Programmatic Node over Declarative

**Decision:** Use programmatic `execute()` method, not declarative routing with `requestDefaults`.

**Context:** n8n supports two node patterns:
- **Declarative**: Define routes and field mappings in the description; n8n handles HTTP calls. Simpler for straightforward CRUD.
- **Programmatic**: Write custom `execute()` logic. Full control over request/response.

**Rationale:** The `simplifyPokemonData` function needs to:
- Flatten `types[].type.name` into a string array
- Map `stats[].stat.name → base_stat` into a keyed object
- Extract `abilities[].ability.name` into a flat array
- Handle nullable `sprites.front_default`
- Drop the ~200KB `moves` array

`postReceive` transformations in declarative mode can only use simple `set` operations or raw expressions. The array mapping and null-checking required here would produce unreadable, untestable expressions.

**Alternatives Considered:**
- Declarative with `postReceive`: Rejected — can't express conditional array mapping readably
- Declarative with custom `execute()` override: Defeats the purpose of declarative
- **Hybrid (declarative Get Many + programmatic Get)**: Get Many is a strong declarative candidate — simple `GET /pokemon?limit=N` with `postReceive` extracting `.results`. Get requires programmatic for simplify logic. However, no existing n8n node mixes both patterns, making this risky for a take-home where reviewers check convention awareness. Consistency wins over optimization.

**Fast follow:** Convert Get Many to declarative routing in a follow-up. The `postReceive` extraction of `.results` from the API envelope is straightforward and would reduce boilerplate while keeping Get programmatic for simplify logic.

**Source:** Architect proposed, PM and QA concurred. PO challenged "why not both?" — hybrid added as fast follow.

---

### D2: No Resource Selector

**Decision:** Omit the resource dropdown. Operations appear directly.

**Context:** CoinGecko uses a resource selector because it has two resources (Coin, Event). Our node has one resource (Pokemon).

**Rationale:**
- Single-option dropdown adds a required click with zero user value
- OpenWeatherMap (identical pattern: read-only, single resource) omits it
- Demonstrates product judgment: YAGNI for a take-home
- The node is extensible later by adding a resource selector if new resources are added

**Architect's condition:** APPROACH.md must explicitly state this was a deliberate decision, not an oversight.

**Source:** PM proposed, QA agreed, Architect conceded with condition.

---

### D3: Keep Return All (reversed from initial review)

**Decision:** Include "Return All" toggle on Get Many, with clear field descriptions about stub data.

**Context:** The adversarial review initially cut Return All because the list endpoint returns `{name, url}` stubs, not full Pokemon data. PO challenged this: "I'm not convinced on the cut. Convince me." The case didn't hold.

**Why the cut was wrong:**
- **Return All is a standard n8n convention.** CoinGecko, GitHub, and most list operations include it. An n8n reviewer will notice its absence and wonder if the candidate didn't know how to implement pagination.
- **The UX concern is solved by a field description.** "Returns name and URL only — use Get for full details." One sentence. The user is warned.
- **Stub data IS useful.** A user wanting all Pokemon names for a dropdown, a reference list, or to feed into a loop needs Return All. Getting 20 at a time is worse UX.
- **It demonstrates API proficiency.** Implementing cursor-based pagination with PokeAPI's `next` field shows real-world API integration skill — exactly what the take-home evaluates.

**Pagination implementation (correct pattern, NOT CoinGecko's):**
```typescript
let url: string | null = `${baseUrl}/pokemon?limit=100&offset=0`;
const allResults: IPokemonListItem[] = [];
while (url !== null) {
  const response = await pokemonApiRequest(url);
  allResults.push(...response.results);
  url = response.next;
}
```
CoinGecko's `do...while(length !== 0)` fires one wasted API call per execution because PokeAPI's last page has non-empty results with `next: null`. The `while (url !== null)` pattern is correct for PokeAPI's envelope structure.

**Test requirement (from QA review):** Mock must have 2+ pages. A single-page mock passes even if pagination is completely broken.

**Source:** PO overruled the adversarial review cut. Architect provided correct pagination pattern.

---

### D4: httpRequest over request (deprecated)

**Decision:** Use `this.helpers.httpRequest()` with `IHttpRequestOptions`, not the deprecated `this.helpers.request()`.

**Context:** CoinGecko (our reference node) uses `this.helpers.request.call(this, options)` which is marked `@deprecated` at `packages/workflow/src/interfaces.ts:870`. The deprecated `IRequestOptions` uses `uri` while the modern `IHttpRequestOptions` uses `url`.

**Rationale:**
- `request()` wraps the deprecated `request` npm package
- `httpRequest()` uses axios internally — the recommended approach
- Subtle API difference: `url` not `uri`, no `json: true` flag
- Cloning CoinGecko's GenericFunctions verbatim would produce deprecated code

**Critical finding (Architect):** `httpRequest()` does NOT auto-wrap errors in `NodeApiError`. It throws raw AxiosError on 4xx/5xx. GenericFunctions MUST catch and wrap: `throw new NodeApiError(this.getNode(), error as JsonObject)`.

**Source:** Architect identified, verified in source at `packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts`.

---

### D5: Typed Interfaces, No `any`

**Decision:** Define concrete TypeScript interfaces for all API shapes. Zero `any` types.

**Context:** n8n's AGENTS.md and CLAUDE.md both state "NEVER use `any`". CoinGecko's GenericFunctions uses `body: any` and `Promise<any>` throughout.

**Interfaces defined:**
- `IPokemonListResponse` — `{ count, next, previous, results }`
- `IPokemonListItem` — `{ name, url }`
- `IPokemonDetailResponse` — full detail shape with typed nested arrays
- `IPokemonSimplified` — simplified output shape

**Location:** Co-located in `GenericFunctions.ts` (node is small enough; separate types file is over-engineering).

**Source:** Architect proposed, all agreed. This is a submission differentiator — most candidates will use `any`.

---

### D6: Simplify Toggle Hidden on Get Many

**Decision:** `Simplify` toggle shown only when `operation === 'get'`, hidden on Get Many via `displayOptions`.

**Context:** Get Many calls `/pokemon?limit=N` which returns `{name, url}` per item. There's nothing to simplify.

**Rationale:** A toggle that does nothing is a UX lie. It confuses users and suggests the node is broken when the output doesn't change regardless of the toggle state.

**Source:** QA identified the gap, PM agreed on UX grounds, Architect concurred.

---

### D7: continueOnFail with pairedItem

**Decision:** Error items in `continueOnFail` mode include `pairedItem: { item: i }`.

**Context:** CoinGecko's pattern pushes `{ error: error.message, json: {} }` — this loses the pairedItem linkage that lets downstream nodes correlate error items back to their source inputs.

**Rationale:** In multi-item executions where some items fail and others succeed, without `pairedItem` the output ordering is not guaranteed to match input ordering. The modern n8n pattern includes it.

**Source:** Architect identified, QA promoted to critical finding.

---

### D8: Operation Value `getAll` not `getMany`

**Decision:** Use `value: 'getAll'` with `displayName: 'Get Many'` to match CoinGecko convention.

**Context:** The initial plan claimed `getMany` was "n8n convention" but CoinGecko actually uses `getAll` as the internal value with "Get Many" as the display name.

**Rationale:** Consistency with the reference implementation avoids unnecessary divergence that n8n-familiar interviewers would notice.

**Source:** Architect identified the inconsistency, PM confirmed.

---

### D9: Simplified Output Includes base_experience and species

**Decision:** Add `base_experience` and `species` to the simplified output schema.

**Context:** Initial plan only included id, name, height, weight, types, abilities, stats, sprite.

**Rationale:** `base_experience` is needed for game logic automations. `species.name` is needed for evolution chain lookups. Both are top-level or one-level deep in the raw response and cost nothing to add. These are the two most common fields for downstream use cases (Pokedex bots, educational tools, game-adjacent automation).

**Source:** PM identified based on likely user workflows.

---

### D10: TDD Approach — Incremental Red-Green-Refactor

**Decision:** Strict incremental TDD, not bulk test-then-implement.

**Sequence per feature:**
1. Write ONE test (or small related group for one behavior)
2. Run it — verify RED (fails)
3. Write minimum code to make it pass — GREEN
4. Refactor if needed
5. Commit with descriptive message
6. Next test

**Git history IS the evidence of TDD discipline.** Each cycle is a separate commit showing the test written before the implementation.

**Source:** PO directive — "TDD is red → green → refactor NOT ALL RED TESTS, ALL GREEN PASSING, Refactor."

---

### D11: Performance — No Code Changes, Field Description Warning Only

**Decision:** No caching, no concurrency limits, no batch enrichment. Add one warning to the Simplify field description.

**Context:** Architect assessed all operations. Get, Get Many, and Return All are all fast (<1.5s). The only risk is user-constructed Return All → Loop → Get (unsimplified) which hits ~780MB memory and ~260MB stored execution data.

**Rationale:**
- The risk is a user-constructed workflow pattern, not a node defect
- Mitigation is a field description: "Use Simplify for bulk operations — full data on large result sets may cause memory issues"
- In-memory caching adds complexity and flushes on n8n restart — not worth 1-2 hour budget
- Concurrency/batching is a workflow design choice (Split In Batches node exists for this)
- PokeAPI GraphQL (launching June 2026) would eliminate the problem entirely

**Future enhancements documented in PRD:**
- In-memory LRU cache for loop deduplication
- Batch enrichment option (Get Many with Details)
- PokeAPI GraphQL integration (v1beta2)
- Cache node documentation for repeated lookups

**Source:** Architect performance assessment, PO directed documenting as future enhancements.

---

## Rejected Alternatives Summary

| Alternative | Why Rejected |
|-------------|-------------|
| Pure declarative node | Can't express simplify logic in postReceive |
| Hybrid declarative/programmatic | No existing n8n reference for mixing; fast follow candidate |
| Resource selector | Single resource = clutter |
| Cut Return All | PO overruled — standard convention, demonstrates pagination skill, stub data is useful with clear descriptions |
| `helpers.request()` | Deprecated, wrong interface shape |
| `any` types | Hard-blocked by n8n conventions |
| Simplify on Get Many | No-op toggle = UX lie |
| Six submission docs | Over-engineered, dilutes signal |
| Bulk TDD (all red then all green) | Doesn't show incremental discipline |

---

## Review Process

Three agents reviewed independently, then debated live via team messaging:

1. **QA Engineer** — Found: pagination termination bug, null sprite gap, empty string edge case, multi-page mock requirement, continueOnFail pairedItem gap
2. **PM Agent** — Found: resource selector clutter, Return All stub-data trap, group misclassification, missing action strings, submission doc bloat
3. **Software Architect** — Found: deprecated API usage, `any` type violations, operation value inconsistency, error wrapping requirement, pairedItem pattern

All findings were debated with direct challenges between agents. Consensus reached on all items with zero irreconcilable disagreements. Full debate log available in docs/REVIEW-DISCUSSION.md.
