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

**Source:** Architect proposed, PM and QA concurred.

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

### D3: Cut Return All

**Decision:** No "Return All" toggle on Get Many. Simple single-call with limit.

**Context:** The standard n8n pattern for list operations includes a "Return All" toggle that paginates through all pages. PokeAPI's list endpoint returns `{name, url}` stubs — not full Pokemon data.

**Rationale:**
- "Return All" would fetch 1350+ stub records with no stats, types, sprites, or abilities
- Users who enable it expecting full data get incomplete results with no warning
- The composable pattern (Get Many → Get) is the honest design
- Removing it also removes the pagination helper function, eliminating an untested code path
- The CoinGecko pagination pattern (`do...while(length !== 0)`) doesn't even work with PokeAPI's envelope structure (`{results, next, count}`) — would require a different termination condition (`next === null`)

**What we'd do with more time:** Add Return All with clear field descriptions warning about stub data, using `while (url !== null)` pagination driven by the `next` field.

**Source:** PM proposed cut, QA and Architect agreed. Architect provided correct pagination pattern for documentation.

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

## Rejected Alternatives Summary

| Alternative | Why Rejected |
|-------------|-------------|
| Declarative node | Can't express simplify logic in postReceive |
| Resource selector | Single resource = clutter |
| Return All | Stub data = misleading results |
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
