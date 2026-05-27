# APPROACH.md — Pokemon Node for n8n

## How I Think About Building Software

This node was built using a multi-agent engineering harness I've developed over 44+ sessions of building a Compose Multiplatform application. The harness orchestrates specialized AI agents — builders, reviewers, architects, QA engineers, a PM — coordinated by a lead agent, with me as product owner making final calls. It's a system for building software the way I'd build it with a real team: specs before code, adversarial review before implementation, TDD discipline throughout, and quality gates at every stage.

The Pokemon node was a chance to point that system at something new and see what it produces under time pressure.

### The Process

**1. Spec-first, not code-first.** Before writing any TypeScript, I created a PRD with user stories, data shapes, workflow patterns showing how the node composes with other n8n nodes, and a visual mockup of what the configuration panel looks like in the editor. The goal was to think through the user experience completely before touching implementation.

**2. Adversarial review with three specialist agents.** A QA engineer, PM, and software architect independently reviewed the plan, then debated live via messaging. This wasn't theater — they found real issues:

- **QA** caught that CoinGecko's pagination termination pattern (`do...while(length !== 0)`) would silently break with PokeAPI's envelope structure (`{results, next, count}`). The correct pattern uses `while (next !== null)`.
- **The Architect** identified that CoinGecko's reference implementation uses the deprecated `helpers.request()` API — cloning it would produce deprecated code in a submission meant to demonstrate n8n convention awareness.
- **The PM** argued (correctly) that a resource selector dropdown for a single-resource node adds a mandatory click with zero user value. OpenWeatherMap, the closest pattern match, omits it.
- **QA + Architect** together identified that `continueOnFail` error handling in CoinGecko loses `pairedItem` tracking — the modern n8n pattern includes it for proper item correlation in multi-item workflows.

I overruled one of their consensus recommendations: they wanted to cut the "Return All" toggle because the list endpoint only returns stub data (`{name, url}`). I pushed back — Return All is a standard n8n convention, and cutting it would signal to reviewers that the candidate didn't know how to implement cursor-based pagination. The solution was a field description warning, not a feature cut.

**3. Security and trust audits before implementation.** A security review identified input validation as the top risk — the URL is constructed as `/pokemon/${nameOrId}`, so without validation, path traversal (`../../`), query injection (`?callback=`), and null bytes could hit unintended endpoints. We implemented allowlist regex validation, disabled HTTP redirects (SSRF prevention), and added a pagination circuit breaker. A separate trust audit verified that n8n's AGENTS.md and CLAUDE.md documentation was accurate — none of their agent-readable guidance was misleading.

**4. BDD scenarios written before implementation.** 20 scenarios across 7 features, each mapping to specific Jest test cases. These became the acceptance checklist that proved the implementation was complete.

**5. TDD with incremental Red-Green-Refactor.** Each commit in the git history shows the discipline: write one test (red), write minimum code to pass (green), refactor if needed, commit. Not "write all tests, then make them pass" — small increments where each cycle is a separate commit. The git log is the evidence.

**6. Parallel builders by user story.** Each user story got its own builder agent working on a dedicated branch. US-0 (scaffold) went first since everything depends on shared types and the API helper. US-1 (List) and US-2/3 (Get by name/ID) ran in parallel, then were merged with conflict resolution. Reviewer agents validated each PR against a 14-point ADR checklist before merge.

## Approach — Key Design Decisions

### Programmatic over Declarative

n8n supports declarative nodes (route + field mappings, framework handles HTTP) and programmatic nodes (custom `execute()` logic). I chose programmatic because the `simplifyPokemonData` function needs to flatten nested arrays (`types[].type.name`), map stat objects (`stats[].stat.name → base_stat`), handle nullable sprites, and drop the ~200KB `moves` array. These transformations aren't expressible in declarative `postReceive` without unreadable, untestable expressions.

**With more time:** Convert Get Many to declarative routing — it's a straightforward `GET /pokemon?limit=N` with a `postReceive` extracting `.results` from the API envelope. This hybrid approach (declarative list + programmatic detail) would reduce boilerplate while keeping the complex logic programmatic.

### Composable Two-Operation Design

The node has two operations: **Get** (single Pokemon with full details) and **Get Many** (paginated list of name+URL stubs). This isn't a limitation — it's the composable pattern n8n workflows are built for:

```
[Get Many (limit: 10)] → [Loop Over Items] → [Get (name)] → [Process Details]
```

Enriching all results inline would be an N+1 API call pattern that hides latency from the user and risks violating PokeAPI's fair-use policy. The node makes the cost visible: Get Many is fast (one call), enrichment is explicit (user wires the loop).

### No Resource Selector

Single-resource nodes don't need a dropdown. OpenWeatherMap (same pattern: read-only, single resource, no auth) omits it. This was a deliberate product judgment call, not an oversight — a one-option dropdown adds a required click with zero user value.

### Typed Interfaces, Zero `any`

Every API response shape has a concrete TypeScript interface: `IPokemonListResponse`, `IPokemonListItem`, `IPokemonDetailResponse`, `IPokemonSimplified`. n8n's conventions say "NEVER use `any`" — but the CoinGecko reference node (which many candidates will clone) uses `any` throughout. Following the stated convention rather than the reference implementation is a differentiator.

### Modern API Usage

The node uses `this.helpers.httpRequest()` (axios-based) instead of the deprecated `this.helpers.request()` (request-based). Subtle but important: `httpRequest()` doesn't auto-wrap errors in `NodeApiError`, so the API helper catches and wraps manually. This was caught by the Architect agent during spec review — before any code was written.

## Assumptions

1. **PokeAPI is stable and free.** No credentials needed, no rate limiting beyond fair-use expectations. The node doesn't implement caching because PokeAPI returns `Cache-Control: public, max-age=86400` and n8n doesn't have a built-in per-execution cache.

2. **The simplified output schema covers the most common downstream use cases.** Fields chosen: id, name, height, weight, base_experience, types, abilities, stats, sprite, species. The PM agent added `base_experience` (game logic) and `species` (evolution chains) during review — both are high-value fields that cost nothing to include.

3. **Users understand the list/detail pattern.** The field description on Get Many explicitly states "Returns name and URL only — use Get for full details." This is the same pattern used by GitHub, Jira, and most paginated APIs.

4. **Return All is a table-stakes convention.** Even though the list endpoint returns stubs, omitting Return All would look like a gap to n8n-familiar reviewers. The pagination implementation (cursor-based via PokeAPI's `next` field) demonstrates real API integration skill.

5. **Input validation is necessary even for a "fun" API.** The node validates `nameOrId` against `/^[a-zA-Z0-9-]+$/` before URL construction, disables HTTP redirects, and includes a pagination circuit breaker (50-page max). These aren't paranoid — they're baseline hygiene for any node that constructs URLs from user input.

## How I Tested That It Works

### Automated (66 unit tests, 2 workflow test suites)

- **Unit tests (Jest + nock):** Cover every BDD scenario — Get by name, Get by ID, simplified vs full output, multi-type Pokemon, null sprites, hyphenated names, 404 errors, `continueOnFail` with `pairedItem`, input validation (path traversal, query injection, null bytes), pagination with multi-page mocks, circuit breaker, limit clamping, empty string rejection.
- **Workflow tests (NodeTestHarness):** Two workflow JSON fixtures (`get.workflow.json`, `getMany.workflow.json`) that prove the node works in n8n's actual execution pipeline, not just in isolation.
- **TDD commit history:** Each test was written before its implementation. The git log shows the Red-Green-Refactor cadence.

### Manual Verification

Ran the node in the n8n visual editor against the real PokeAPI:
- Get "pikachu" — verified simplified output (id: 25, types: ["electric"], stats, sprite URL)
- Get "25" — same result (proves name and ID both work)
- Get "notapokemon" — clear error message (not a raw stack trace)
- Get Many (limit: 5) — 5 stub items with name + URL
- Return All — 1300+ items (proves pagination works)
- Simplify toggle — visible difference between simplified and full (~200KB) output

## What I'd Do Differently With More Time

### Strategic (highest leverage)

- **PokeAPI GraphQL integration.** PokeAPI is launching GraphQL v1beta2 (June 2026). GraphQL would let users query exactly the fields they need, reducing the ~200KB response to only what's required. This eliminates the simplify function entirely and gives users a better composability model.
- **Search by type/ability/generation.** Additional operations that turn the node from a lookup tool into a discovery tool. The PokeAPI has rich filtering endpoints that would make the node significantly more useful for automation workflows.
- **Batch enrichment mode.** A "Get Many with Details" operation that fetches stubs, then auto-enriches in parallel with configurable concurrency. Hides the N+1 loop pattern from the user while keeping the cost transparent via a progress indicator.

### Quick wins (low effort, high signal)

- **Convert Get Many to declarative routing.** The list operation is a simple `GET` with `postReceive` extraction — a clean candidate for n8n's declarative pattern. Hybrid nodes (declarative list + programmatic detail) would show deep framework understanding.
- **In-memory LRU cache.** Cache Pokemon detail responses within a single execution to avoid redundant calls in loop patterns. Scoped to the execution — n8n restarts flush it.
- **Playwright E2E tests.** Wrote the spec file following n8n's `http-request-node.spec.ts` pattern. With more time, I'd run them against a real dev server to prove the full stack (node picker → canvas → configuration → execution → output).

## AI Prompts Used

**Model:** Claude Opus 4.7 (1M context) via Claude Code CLI

**Why this model:** I needed a model that could coordinate multiple specialist agents, maintain context across a complex multi-step build process, and make nuanced judgment calls about when to follow conventions vs. when to deviate. Opus handles the lead/coordination role — deciding what to build, in what order, and resolving disagreements between agents. Sonnet handles the specialist roles (builders, reviewers, QA, PM, Architect) where the task is well-scoped and the instructions are clear.

**How I use AI — the harness model:**

I don't prompt AI to "write me a Pokemon node." I built an orchestration harness over 44+ sessions that treats AI agents like a real engineering team:

- **Product Owner (me):** Sets requirements, challenges decisions, makes final calls. I reversed the Return All cut. I caught that TDD was being done as "all red then all green" instead of incremental cycles. I pushed for user-experience depth in the PRD (workflow patterns, canvas mockups).
- **Lead Agent (Opus):** Coordinates the team, synthesizes findings, escalates when stuck. Manages branch strategy, PR flow, and merge sequencing.
- **Specialist Agents (Sonnet):** QA, PM, Architect for adversarial review. Builders for TDD implementation (one per user story). Reviewers for PR validation against a 14-point checklist. Security engineer for input validation audit. Auditors for build-state verification.

The harness has protocols for: discovery gates (no code before specs are reviewed), loop detection (max 5 attempts on any failing test before escalation), context window management, and explicit escalation chains. It's not a script — it's a system that captures institutional knowledge about how to build software well, and applies it consistently.

**Key prompts that shaped the build** (full log in `docs/prompts.md`):

| Prompt | What it triggered |
|--------|-------------------|
| "Let's do a planning session... then do an adversarial review with QA, PM, and Architect" | Three-agent live debate that produced ADR-001 with 12 architecture decisions |
| "TDD is red -> green -> refactor, NOT all red tests, all green passing, refactor" | Changed builder agent instructions — each cycle is a separate commit |
| "I'm not convinced on the Return All cut. Convince me." | Reversed the adversarial trio's consensus — field description warning instead of feature cut |
| "Do a deep security audit to see if there's any risk" | Security engineer found 5 findings (input validation, redirect protection, circuit breaker) |
| "Assess if any of the agent-readable docs might be telling us lies" | Trust audit verified all 8 key claims from AGENTS.md/CLAUDE.md — none were misleading |
| "Shouldn't this be two user stories? US-2: Get Pokemon by Name or ID" | Split into separate stories — different edge cases for name vs ID lookup |
| "What will the node look like in the visual editor? How would you plug it into flows?" | Expanded PRD from API-focused to UX-focused — added 6 workflow patterns and canvas mockups |
