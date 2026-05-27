# APPROACH.md — Pokemon Node for n8n

## Approach

I built a programmatic n8n node with two operations — **Get** (full Pokemon details) and **Get Many** (paginated list of name+URL stubs) — following n8n's composable pattern where users wire a loop between list and detail calls rather than hiding N+1 API calls inside the node.

The key design choices visible in the code:

- **Typed interfaces throughout, zero `any`.** Every API response shape has a concrete TypeScript interface (`IPokemonListResponse`, `IPokemonDetailResponse`, `IPokemonSimplified`). n8n's conventions say "NEVER use `any`" — the code follows that literally.
- **Input validation before URL construction.** `nameOrId` is validated against an allowlist regex and trimmed before being interpolated into the URL. HTTP redirects are disabled and pagination has a circuit breaker.
- **Modern API usage.** Uses `this.helpers.httpRequest()` instead of the deprecated `this.helpers.request()` that appears in the CoinGecko reference node.
- **Cursor-based pagination.** Return All follows PokeAPI's `next` field (not offset arithmetic), with a 50-page circuit breaker.
- **`simplifyPokemonData` flattens the response.** The raw PokeAPI response is ~200KB with deeply nested objects. The simplify function extracts the high-value fields (types, abilities, stats as a flat map, sprite URL, species name) into a clean output.

I didn't build this by writing code directly. I used a multi-agent engineering harness I've developed over 44+ sessions, built on Claude Code's agent teams feature. The harness orchestrates specialist agents — builders, reviewers, QA, PM, Architect, security — coordinated by a lead agent, with me as product owner making final calls.

**Before any code was written:**

- A PRD defined user stories, data shapes, and workflow patterns showing how the node composes with other n8n nodes
- Three specialist agents (QA, PM, Architect) independently reviewed the plan and debated live — they found real issues (wrong pagination pattern from the reference node, deprecated API usage, unnecessary UI elements)
- A security audit identified input validation as the top risk and defined mitigations
- BDD scenarios were written as acceptance criteria mapped to Jest tests
- I overruled one consensus recommendation (cutting Return All) because it would signal a gap to reviewers

**During implementation:** each user story got its own builder agent with TDD discipline — write one test, make it pass, refactor, commit. Each cycle is a separate commit in the git history. Reviewer agents validated each PR before merge.

The process is the differentiator. The code is clean, tested, and follows n8n conventions — but the decision-making arc (spec → adversarial review → TDD → quality gates → refinement) is how I build software, whether the team is human or AI.

## Assumptions

1. **PokeAPI is stable, free, and requires no credentials.** No auth implementation needed. The node doesn't cache responses because PokeAPI returns `Cache-Control: public, max-age=86400` and n8n doesn't have a built-in per-execution cache.
2. **The simplified output covers common downstream use cases.** Fields chosen: id, name, height, weight, base_experience, types, abilities, stats, sprite, species. Based on what's useful for workflow automation (filtering, display, chaining to evolution/type lookups).
3. **Users understand the list/detail pattern.** Get Many returns stubs; Get returns full details. This is standard for paginated APIs and is documented in the field descriptions.
4. **Return All is expected.** Even though the list endpoint returns stubs, omitting it would look like a gap. The pagination implementation demonstrates real API integration.
5. **Input validation is necessary even for a read-only API.** The URL is constructed from user input — without validation, path traversal and injection are possible. This is baseline hygiene.

## How I Tested

**66 unit tests (Jest + nock)** covering: Get by name, Get by ID, simplified vs full output, multi-type Pokemon, null sprites, hyphenated names, 404 errors with helpful messages, `continueOnFail` with `pairedItem` tracking, input validation (path traversal, query injection, null bytes, empty strings), pagination with multi-page mocks, circuit breaker, limit clamping.

**2 workflow test suites (NodeTestHarness)** with JSON workflow fixtures proving the node works in n8n's execution pipeline, not just in isolation.

**Manual verification** in the n8n visual editor: Get "pikachu", Get by ID "25", Get "notapokemon" (error message quality), Get Many with limit, Return All (1300+ items), simplify toggle.

## What I'd Do Differently With More Time

- **Convert Get Many to declarative routing.** The list operation is a straightforward `GET` with envelope extraction — a clean candidate for n8n's declarative pattern. Hybrid nodes (declarative list + programmatic detail) would show deeper framework understanding.
- **PokeAPI GraphQL integration.** PokeAPI is launching GraphQL v1beta2. GraphQL would let users query exactly the fields they need, eliminating the simplify function entirely.
- **Batch enrichment mode.** A "Get Many with Details" operation that fetches stubs then auto-enriches in parallel with configurable concurrency.
- **In-memory LRU cache** scoped to the execution, to avoid redundant calls in loop patterns.
- **Run the Playwright E2E tests.** The spec file exists following n8n's patterns, but wasn't run against a dev server in this session.
- **Would have updated the harness before starting** — a few things have changed over the last month, including the advisor pattern for better token efficiency.

## Model Used and Why

**Claude Opus 4.7** for lead/coordination, **Sonnet 4.6** for specialist agents (builders, reviewers, QA). I have a subscription and built a multi-agent harness around it over 44+ sessions of building a Compose Multiplatform application.

Opus handles the judgment calls: what to build, in what order, when to override agent recommendations. Sonnet handles well-scoped specialist work where the instructions are clear. The harness has protocols for discovery gates (no code before specs are reviewed), loop detection (max 5 attempts on a failing test before escalation), and explicit escalation chains. It captures institutional knowledge about how to build software and applies it consistently.

The full prompt log (47 prompts) is in `docs/prompts.md`. A thematic summary is in `PROMPTS-SUMMARY.md`.
