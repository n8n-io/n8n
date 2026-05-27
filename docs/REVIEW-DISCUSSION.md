## QA Review — QA Engineer (Adversarial Spec Review)

### Critical Findings (must fix before implementation)

- **No test for empty string `nameOrId`**: The BDD list covers "pikachu" (name), "25" (numeric ID), and "notapokemon" (404). An empty string `""` is a different failure mode — PokeAPI would return a 404 or a malformed URL (`/pokemon/`). This needs an explicit test since the node likely constructs the URL as `/pokemon/${nameOrId}` and an empty string would silently produce `/pokemon/` which hits a different API behavior than expected.

- **Pagination loop termination is undefined in the spec**: The `returnAll` scenario says "paginates through all pages and returns all Pokemon" but the plan never specifies the termination condition for `pokemonApiRequestAllPages`. PokeAPI's list endpoint returns a `next` field (null when done). The CoinGecko pattern used by the plan terminates on `respData.length === 0`, which assumes the last response body is an empty array — but PokeAPI's paginated list wraps results in `{ results: [], next: null, count: N }`. If the implementation blindly follows CoinGecko's loop termination, it will infinite-loop or fail to terminate correctly because `results` on the last partial page is never empty — it just becomes `null` in `next`. The spec must explicitly define the termination condition.

- **`simplifyPokemonData` with null/missing `sprite` is not tested**: The simplified output schema shows `sprite` as a plain string URL. But PokeAPI's `sprites.front_default` can be `null` for some Pokemon (e.g., forms without sprites). The BDD list has no scenario for this. If the implementation does `pokemon.sprites.front_default` without a null check, it passes the value through as `null`, which silently breaks workflows expecting a string. There must be a test with mock data where `sprites.front_default` is `null`.

- **`continueOnFail` test scenario is BDD-specified but has no workflow test counterpart**: The plan lists `Pokemon.workflow.test.ts` fixtures as only `get.workflow.json` and `getMany.workflow.json`. The `continueOnFail` scenario is only in the unit test section. This means the integration path for error handling is untested at the harness level. Either add a `getNotFound.workflow.json` fixture or remove the scenario from the BDD list to avoid false coverage claims.

### Important Findings (should fix)

- **Numeric `0` as ID is unspecified**: The plan says "nameOrId" accepts a name or numeric ID. Pokemon ID 0 does not exist in PokeAPI — requesting `/pokemon/0` returns a 404. But `0` is a valid JavaScript number that could be passed. The node takes a string parameter, so `"0"` as a string would hit the API and get a 404. This is fine, but there's no test for it and no mention that the node treats `0` as invalid input vs. a pass-through. The expected behavior should be explicit.

- **Very large `limit` values (e.g., 10000) exceed PokeAPI's max**: PokeAPI accepts `limit` up to `100000` (it does not hard-cap), but requesting a huge limit in a single call is effectively a "return all" operation that bypasses pagination. The plan does not address whether the node should cap the `limit` parameter or pass it through verbatim. For the test at `limit > 1350` (current total Pokemon count), the mock must reflect what actually comes back, not just an arbitrary truncation.

- **Negative `offset` and `limit` are unspecified**: Passing `offset=-1` or `limit=-1` to PokeAPI returns a 400 Bad Request. The plan has no validation for these cases and no test. Since the node exposes these as user-configurable fields, a user could accidentally enter negatives. The node should either validate client-side or the test suite should assert the resulting NodeApiError.

- **Mock data in `apiResponses.ts` must include the `next`/`count` fields for getMany**: The simplified Pokemon list response from PokeAPI is `{ count: 1302, next: "...", previous: null, results: [{name, url}] }`. The plan's BDD only specifies "returns 20 Pokemon entries with name and url" — it doesn't mention testing that the wrapper fields are stripped. If the simplify function or execute loop returns the full wrapper object instead of just `results`, output will be wrong.

- **The `getMany` simplify behavior is underspecified**: The simplified schema only applies to the `get` (single Pokemon) operation which returns full detail. For `getMany`, the list endpoint only returns `name` and `url` per entry — there's nothing to simplify. The plan should clarify whether `Simplify` on `getMany` does anything meaningful, or if the toggle should be hidden/disabled for that operation. If it's shown but does nothing, that's a confusing UX.

- **No test for the `offset` parameter in `getMany`**: The BDD list covers limit and returnAll, but never exercises `offset`. A user who wants page 2 manually (without returnAll) needs offset to work correctly. This is a missing scenario.

- **Unexpected API response shape is not handled**: The plan mentions `simplifyPokemonData` but has no test for when the API returns a response missing top-level keys entirely (e.g., `{}` or a non-object). If the implementation does `response.sprites.front_default` without guarding that `response.sprites` exists, it throws a TypeError rather than a NodeApiError. The error surface is different and harder to debug.

- **`returnAll` with 0 results**: If the API returns `{ count: 0, results: [], next: null }`, the pagination loop must not execute an extra page fetch. With a `do...while` pattern (as used in CoinGecko), the loop body executes once before checking the condition — so a count-0 response still makes one API call and then terminates. This is correct behavior, but it should be explicitly tested so the loop logic is validated.

### Minor Findings (nice to have)

- **Special characters in name are not tested**: Pokemon names like "mr-mime", "farfetch'd", "type-null", "jangmo-o" contain hyphens, apostrophes, and hyphens-in-names. The node presumably passes the string directly to the URL. These edge cases are worth at least one test with a hyphenated name to confirm URL construction doesn't break.

- **No test for HTTP 500 response**: The BDD list has a 404 scenario. A 5xx scenario (server error) will produce a different nock response shape. While `NodeApiError` should wrap both, confirming the error message is actionable for 5xx vs 4xx is worth one test.

- **The `nock` mock for `returnAll` must model multiple pages**: The BDD scenario "paginates through all pages" is vacuous if the mock only returns one page with `next: null`. The test will pass even if pagination is broken, because there was only one page to fetch. The mock should set up at least two pages (page 1 with `next` pointing to page 2, page 2 with `next: null`) to actually exercise the loop.

- **No test confirming multi-type Pokemon**: The simplified schema shows `types` as an array. A test with a Pokemon that has two types (e.g., Bulbasaur: `["grass", "poison"]`) confirms the mapping works correctly. A single-type Pokemon test (like Pikachu: `["electric"]`) doesn't catch an off-by-one or head-only extraction bug.

- **No test confirming multi-ability Pokemon**: Same concern as types — `abilities` should be tested with a Pokemon that has more than one ability.

- **The submission `docs/TESTING.md` artifact vs. the in-repo `TESTING.MD` guidance file**: The plan proposes creating a `docs/TESTING.md` as a submission artifact. The existing `TESTING.MD` in `packages/nodes-base/` is guidance for node developers, not a per-node file. There's no naming conflict, but the submission doc should be named clearly to avoid confusion with the harness guidance doc.

### Questions for PM/Architect

- **What is the correct termination condition for `pokemonApiRequestAllPages`?** Should it be `response.next === null`, `response.results.length === 0`, or something else? CoinGecko's pattern checks empty array length, but PokeAPI's envelope structure is different. This needs an explicit answer before implementation starts.

- **Should `Simplify` be shown for `getMany`?** The list endpoint only returns `name` + `url` — there's nothing to strip. Showing a toggle that does nothing is confusing. Should it be hidden via `displayOptions`, or should it at least strip the `url` field from list results to justify its existence?

- **What is the input validation contract for `nameOrId`?** Does the node validate that it's non-empty? Does it accept numeric-as-string (e.g., `"25"`) and pass it directly to the URL, or does it coerce it? The spec is silent on client-side validation.

- **What `limit` value should trigger a warning or cap?** Requesting `limit=100000` is technically valid at the API level but may produce a very slow response. Should the node document a recommended max or enforce one?

- **Is the `offset` parameter exposed in the UI?** The plan's UI structure section only shows `Limit` for `getMany` (when `returnAll=false`). If `offset` is not exposed, users cannot page through results manually. If it is exposed but not in the spec, it's an undocumented feature. Clarify intent.

---

## PM Review — PM Agent

### Critical Findings (must fix before implementation)

- **Resource selector is unnecessary clutter.** With a single "Pokemon" resource that will never expand in a take-home context, the resource dropdown adds a required UI step with zero user value. OpenWeatherMap skips it entirely and goes straight to `Operation`. CoinGecko uses it because it genuinely has two resources (Coin + Event). With one resource, n8n convention says omit it. Removing it simplifies the node to: Operation → fields. This is a meaningful UX improvement and demonstrates product judgment to interviewers.

- **"Return All" ships incomplete data without user warning.** The PokeAPI `/pokemon` list endpoint returns only `{name, url}` stubs — not stats, types, sprites, or abilities. A user who enables "Return All" expecting full Pokemon data will get 1350 names and URLs with no indication they need a follow-up "Get" node to hydrate each result. This is a silent data completeness failure. Either (a) drop "Return All" entirely (correct for 1-2 hours), (b) add a notice/hint in the field description that list results are stubs, or (c) follow-up-fetch each item inline (blows the time budget). Option (a) is the right product call here.

### Important Findings (should fix)

- **`group: ['output']` is wrong for a read-only data source.** The plan inherits CoinGecko's `group: ['output']` but PokeAPI is pure data retrieval. OpenWeatherMap uses `group: ['input']` for the same reason. This affects where the node appears in the palette categories. A node that fetches data belongs in `input`. This is a one-word fix that shows attention to n8n conventions.

- **Simplified schema is missing two high-value fields.** The plan's simplified output includes `sprite` (useful for display) but omits `base_experience` (needed for game logic automations) and `species.name` (needed for evolution chain lookups). These are the two most common fields needed downstream for the likely use cases of this node (game-adjacent automation, Pokedex bots, educational tools). Both are top-level or one-level deep in the raw response and cost nothing to add.

- **Submission docs are over-engineered.** Six separate markdown files (APPROACH, ASSUMPTIONS, TESTING, PROMPTS, BUILD-JOURNAL, AGENT-AUDIT) reads as process overhead rather than product output. A single `APPROACH.md` (~200 lines) covering decisions, assumptions, test strategy, and AI prompt summary will scan better in an interview review. Interviewers skim; six files dilutes the signal. Merge into one doc.

### Minor Findings (nice to have)

- **`action` field missing from operation definitions.** CoinGecko and Discord both include an `action` string on each operation option (e.g., `action: 'Get a coin'`). This drives the human-readable subtitle on the canvas node. Without it, the canvas shows the raw value ("get", "getAll") instead of a readable label. One-line fix per operation.

- **`getMany` operation value should match convention.** The plan uses `value: 'getMany'` but CoinGecko uses `value: 'getAll'` with `displayName: 'Get Many'`. The display name is correct in the plan; only the internal value diverges from the reference implementation. Either is defensible, but matching `getAll` avoids an unnecessary divergence interviewers familiar with the codebase will notice.

- **Node-level `description` is missing.** CoinGecko has `description: 'Consume CoinGecko API'`, OpenWeatherMap has `description: 'Gets current and future weather information'`. The plan omits this field entirely. Add: `description: 'Get Pokemon data from PokeAPI'`.

- **"Pokemon Name or ID" label should hint case-insensitivity.** Users copying from Bulbapedia or the games will try "Pikachu" (capitalized). PokeAPI accepts it, but the label and placeholder don't make this clear. Add `"case-insensitive"` to the field description to eliminate first-use confusion.

### Questions for QA/Architect

- The QA review correctly identifies that `Simplify` on `getMany` does nothing meaningful (list endpoint only returns name+url). Should the toggle be hidden for `getMany` via `displayOptions`, or removed from that operation entirely? This affects whether we expose a control that misleads users.
- If we drop "Return All" (as recommended), does the scope feel too thin for a 1-2 hour take-home? The remaining surface is: one Get operation + one Get Many with limit. That may actually be the right call — the implementation quality and test coverage become the differentiator, not feature breadth.
- Is `usableAsTool: true` exercised anywhere in the test plan? AI agent tool use has specific schema requirements. Worth confirming the workflow tests don't break when the node is invoked as a tool.

---

## Architect Review — Software Architect

### Critical Findings (must fix before implementation)

- **`helpers.request` is deprecated — the plan's CoinGecko reference uses the wrong API**: The plan's Design Decisions table correctly says "HTTP helper: `this.helpers.httpRequest()` — Modern approach (axios)," but the CoinGecko `GenericFunctions.ts` it cites as the reference uses `this.helpers.request.call(this, options)`, which is `@deprecated Use .httpRequest instead` per `packages/workflow/src/interfaces.ts:870`. `IRequestOptions` is also `@deprecated Prefer using IHttpRequestOptions` (interfaces.ts:532). The builder will see CoinGecko and clone it. The implementation must use `this.helpers.httpRequest(options)` with `IHttpRequestOptions` shape (`url` not `uri`, no `json: true` flag, `responseType: 'json'` instead). The plan must explicitly say "do NOT clone CoinGecko's GenericFunctions signature."

- **`any` type violations will cause reviewer blocking and fail the project's hard rule**: CoinGecko's `GenericFunctions.ts` has `body: any = {}` and `Promise<any>` return types throughout. Both `AGENTS.md` and the project `CLAUDE.md` state NEVER use `any`. The plan must specify concrete interfaces: at minimum `IPokemonListResponse` (wrapping `{ count, next, previous, results }`), `IPokemonListItem` (`{ name, url }`), `IPokemonDetailResponse` (the full detail shape), and `IPokemonSimplified` (the simplified output). Without these defined before implementation starts, the builder will fall back to `any` and the PR will be blocked.

- **`getMany` as the operation value conflicts with n8n convention — CoinGecko actually uses `getAll`**: The plan states "Operations: `get` + `getMany` — n8n convention (not `getAll`)" but this is wrong. CoinGecko's source uses `operation === 'getAll'` as the conditional (verified at lines 191 and 410). The `displayName` is "Get Many" but the `value` is `'getAll'`. Using `value: 'getMany'` in `PokemonDescription.ts` and then checking `operation === 'getMany'` in `execute()` is internally consistent, but it's a divergence from the reference the plan claims to follow. The PM review also flagged this. Pick one and document it: either `getMany` (new convention) or `getAll` (follows reference), but the plan must not say "n8n convention" while citing a reference that contradicts that claim.

### Important Findings (should fix)

- **The pagination loop must not follow CoinGecko's do-while termination**: CoinGecko's `coinGeckoRequestAllItems` uses `do { ... } while (respData.length !== 0)`. This works because CoinGecko list responses return raw arrays. PokeAPI returns `{ count, next, previous, results }` — the termination signal is `next === null`, not an empty `results`. The last page has a non-empty `results` array with `next: null`. Following CoinGecko's pattern means one extra API call after all data is fetched (fetching with `next: null` offset, receiving empty `results`, then stopping). The correct pattern: `let url: string | null = baseUrl; while (url !== null) { response = await ...(url); results.push(...response.results); url = response.next; }`.

- **`continueOnFail` error output loses `pairedItem` tracking**: CoinGecko pushes `{ error: error.message, json: {} }` directly to `returnData`. This is the old pattern — it loses the `pairedItem` linkage that lets downstream nodes correlate error items back to their source inputs. The modern pattern is `returnData.push({ json: { error: error.message }, pairedItem: { item: i } })`. In multi-item executions where some items fail and others succeed, without `pairedItem` the output ordering is not guaranteed to match the input ordering. The BDD spec tests `continueOnFail` — the test will pass either way, but production behavior differs.

- **`simplifyPokemonData` must be independently testable with typed input**: The plan correctly places it in `GenericFunctions.ts`. Its signature must be `simplifyPokemonData(data: IPokemonDetailResponse): IPokemonSimplified` — not `(data: unknown): IDataObject`. This is both a `no-any` enforcement issue and a testability issue: the unit tests for `simplifyPokemonData` in isolation need a typed interface to construct mock input without casting.

- **Declarative pattern is correctly rejected, but the rationale must be documented**: The plan says "PokeAPI needs client-side simplification" which is correct — `postReceive` transformations cannot flatten `types[].type.name` or drop the 200KB `moves` array. This is the right call. However, `docs/APPROACH.md` should explicitly address this so interviewers don't flag "why not declarative?" The simplification logic requires conditional array mapping that `postReceive` `set` can only express as raw expressions, making it unreadable and untestable.

### Minor Findings (nice to have)

- **`action` field should be on each operation option for `usableAsTool` discoverability**: The Okta node (declarative reference) includes `action: 'Create a new user'` on each operation option. With `usableAsTool: true`, n8n uses this string to describe the operation to AI agents. CoinGecko omits it (and predates the usableAsTool pattern). The plan includes `usableAsTool: true` as a first-class feature — add `action: 'Get a Pokemon'` and `action: 'Get many Pokemon'` to the respective operation options.

- **`Pokemon.node.json` must include `alias` for editor discoverability**: Reference node JSONs include an `alias` array (e.g., Okta has `["authentication", "users", "Security"]`). The plan's `.node.json` section mentions metadata but does not list `alias`. Suggest `["pokeapi", "pokemon api", "pokedex"]`. Not a build failure, but the metadata file spec in the plan is incomplete.

- **`subtitle` expression should be specified**: CoinGecko uses `subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}'`. With a single resource, this produces "get: Pokemon" — readable. The plan omits `subtitle` from the node description spec. Inherit the CoinGecko pattern exactly.

- **`node` key in `Pokemon.node.json` must match the description `name` exactly**: Must be `"n8n-nodes-base.pokemon"` (lowercase camelCase matching `name: 'pokemon'` in the description). Any mismatch means the codex entry won't bind to the node and it won't appear in search results with the correct metadata.

### Questions for QA/PM

- **What is the correct `IHttpRequestOptions` shape for `pokemonApiRequest`?** The builder needs an explicit signature to avoid `any`. Proposed: `(method: IHttpRequestMethods, endpoint: string, qs?: IDataObject): Promise<unknown>` with typed return at call sites. Is this acceptable or should the function be generic `<T>(...)`: `Promise<T>`?
- **Should `offset` be in the `getMany` UI as an "Additional Fields" collection?** Without it, `returnAll=false` always starts from the beginning. This is a UX gap QA also flagged. Architect recommendation: expose as `Additional Fields` to keep the primary UI clean.
- **PM recommends removing "Return All" entirely due to stub-data problem. Architect agrees on simplification grounds.** If dropped, the pagination helper (`pokemonApiRequestAllPages`) is also dropped, and the implementation scope shrinks significantly. This is a better submission: one operation done completely right beats two operations with a subtle pagination bug.

---

## Lead Decisions (synthesized from debate)

All three reviewers debated live via team messaging. Final decisions:

| Decision | Choice | Rationale | Source |
|----------|--------|-----------|--------|
| Resource selector | **Removed** | Single resource = clutter, matches OpenWeatherMap | PM + QA + Architect |
| Return All | **Cut** | List returns stubs only, misleading at scale | All three |
| Simplify on getMany | **Hidden** via displayOptions | No-op toggle is bad UX | QA + PM |
| Operation value | `getAll` (value) / "Get Many" (displayName) | Matches CoinGecko convention | Architect + PM |
| `group` | `['input']` | Read-only data node | PM |
| Offset UI | **Absent** | Users inject via expression | PM |
| HTTP helper | `httpRequest()` with `IHttpRequestOptions` | NOT deprecated `request()` | Architect |
| Types | No `any` — typed interfaces required | n8n hard rule | Architect |
| Error handling | `continueOnFail` includes `pairedItem` | Modern pattern | Architect + QA |
| Submission docs | Single `APPROACH.md` | Six files dilutes signal | PM |
