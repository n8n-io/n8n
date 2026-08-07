# RFC-0001: Should frontend source resolution move into each package's `package.json`?

**Status:** Draft — in review
**Author:** index (staff researcher) · design by gravity, 2026-08-07
**Reviewers:** alex (decider) · palette (frontend build tooling) · Matsuuu (raised the objection on [#35642](https://github.com/n8n-io/n8n/pull/35642))
**Class:** 2 — expensive to reverse (deletes six build pipelines and changes six published artifacts). One sub-part is Class 1; see §5.
**Comment window closes:** 2026-08-12 (three working days from 2026-08-07)

> This RFC decides nothing. It exists so that alex can. It recommends, and it attaches the strongest case against its own recommendation.

**Confidence labels used throughout:** `[verified]` — reproduced by the author against this repo or its toolchain, command included. `[strong]` — read directly out of committed code or config. `[inferred]` — follows from verified facts but not itself executed. `[assumed]` — believed, untested, and flagged as such.

All measurements are point-in-time against `master` @ `8ac5a60616`, taken 2026-08-07. Re-run §A before acting on any number.

---

## 1. Problem

`packages/frontend/editor-ui` consumes 14 workspace packages **from source** rather than from their built `dist`. That fact has to be told to two different tools in two different languages:

- `packages/frontend/editor-ui/vite.config.mts` — a `resolve.alias` array, ~36 entries `[strong]`
- `packages/frontend/editor-ui/tsconfig.json` — a `paths` map, 18 keys plus a `rootDirs` array of 8 `[strong]`

Nothing structurally keeps the two in agreement. They had already silently disagreed: PR #35642 found **7 resolution classes across 1,111 import specifiers** that `vue-tsc` was checking from `src` while the production build bundled `dist`, and one class — `@n8n/tournament` — was a live footgun worth **397,306 bytes** of prod bundle and a broken `pnpm dev`, with typecheck *and* build green throughout. Receipts on N8N-188 (reproduced 1/1 by filter). `[strong]`

PR #35642 landed the two artifacts into agreement plus `aliases.test.ts` to keep them there, and is now blocked by `CHANGES_REQUESTED` from Matsuuu:

> Any reason we didn't use e.g. `vite-tsconfig-paths`? Did it not support our needs? Feels like this is more scaffolding on top of previous ones just to keep two files in sync instead of us parsing through one source of truth.

**The principle in that review is correct and this RFC accepts it.** Two artifacts held in sync by a test is a smell; the test is a symptom, not a cure. The question is what the single source of truth should be. Three candidates are on the table and one of them is materially larger than the PR under review, which is why this is an RFC and not a PR comment.

### Why now

1. A colleague's objection is sitting unanswered on a blocked PR.
2. The frontend modularization roadmap takes the workspace from ~8 frontend packages to ~25. Whatever this mechanism is, it gets multiplied by 25. `[strong: `.context/design.md` §6.2, §13]`
3. `@n8n/i18n`'s `BaseTextKey` "needs a rebuild before types are right" pain is the same problem wearing a different hat. `[strong: design.md §4.2]`

### Constraints that are actually fixed

- **`pnpm dev` HMR must not regress.** It is the daily loop; typecheck-green and build-green are *not* sufficient evidence here — the tournament incident was invisible to both. Anything that changes resolution needs a check that actually loads the app. `[verified by the incident]`
- **Backend production resolution must not change.** Six of the twelve candidate packages are consumed by `packages/cli`, `packages/core`, `packages/workflow`, `packages/nodes-base` and others (§4).
- **TypeScript is mid-migration to TS 7.** `pnpm-workspace.yaml` carries a `typescript` catalog at `7.0.2` (tsgo) and a `typescript-tooling` catalog at `6.0.2`; the frontend catalog pins `vue-tsc: ^2.2.8`. Any mechanism must work under both. `[strong]`
- **Vite is on `^8.0.2`, i.e. rolldown.** Resolution semantics are rolldown's, not rollup's or esbuild's. `[strong]`

### Constraints that are merely traditional

- That resolution is described centrally. It is described centrally because it started that way, not because it must be.
- That every workspace package ships a `dist`. `@n8n/design-system` already does not — `"main": "src/index.ts"`, no `exports` map, and it is published to npm that way. `[verified: `curl -sI registry.npmjs.org/@n8n%2Fdesign-system` → 200]`

### Prior art in our own archive

- **N8N-188** — the divergence measurements and the tournament incident.
- **N8N-204** — the generator was built, measured, reviewed, and rejected by alex on 2026-08-07 on reviewability and team-acceptance grounds, not on a technical defect: *"I don't like the generation script. Get rid of it. Maintain this by hand for now."* Stripped in `fae4c98` (= the current head of PR #35642 `[verified: git ls-remote refs/pull/35642/head]`).
- **N8N-198** — `@n8n/design-system`'s own Vite aliases used regex-*looking* string keys that Vite matches exact-or-prefix, so four entries never matched anything. Not a codegen bug; a hand-maintenance bug.
- One archive note: `packages/frontend/@n8n/design-system/vite.config.mts:140` cites *"Rejected in ADR-0002"*, and no ADR file exists anywhere in this repo. `docs/rfcs/` did not exist before this file. That is the gap this directory starts closing. `[verified: `find` for ADR/RFC files returns nothing]`

---

## 2. Options considered

### Option A — Keep the hand-maintained lists, as landed in #35642

**The case for, written so its advocate would sign it.**

This option already shipped and it already paid for itself. It found and fixed a 397 kB regression plus six other divergence classes that had been live in `master` and invisible to every gate in CI. What remains after `fae4c98` is a ~95-line declarative table plus `aliases.test.ts`, which asserts both directions and fails CI when they part. No codegen, no plugin, no new dependency, no CI gate beyond a unit test. `[strong]`

It is also **already the Operator's ruling**. Alex decided on 2026-08-07 that this mapping stays hand-maintained, explicitly for team acceptance. Reopening that is a cost this RFC should count honestly.

The "doesn't scale to 25 packages" objection is real but slower than it sounds: Wave 1 of the module roadmap is three packages, and a module built on `tsconfig.frontend-module.json` inherits its paths rather than adding its own. `[strong: N8N-188 scope, design.md §4.4]` A 95-line table read by two consumers is a small object to hate.

**Costs:** zero additional work; it is the status quo.
**Risks:** the divergence class that produced the incident is still latent — hand maintenance is precisely what produced it. The guard is a test, and tests guard what they were written to guard. Two aliases (`@n8n/tournament`, `@n8n/expression-runtime`) are load-bearing but reachable only *transitively*, so they look droppable to anyone reading declared dependencies. That trap stays armed. `[strong: N8N-198 carry-forward]`
**Who does this:** most monorepos, including large ones. It is unremarkable and defensible.

### Option B — `vite-tsconfig-paths` (the reviewer's suggestion)

**The case for, written so its advocate would sign it.**

It is the canonical answer to exactly this smell, and the reviewer is not reaching for something obscure — it is a widely used plugin whose entire purpose is to stop hand-syncing Vite aliases against tsconfig `paths`. It replaces a table plus a test with roughly five lines of config. A new contributor reading `vite.config.mts` and seeing `tsconfigPaths()` understands the system in one line; reading a 95-line table plus an equivalence test, they have to reconstruct the intent. It removes the *possibility* of divergence rather than detecting it after the fact, which is strictly stronger than a test. And the plugin's `projects` option lets you enumerate which tsconfigs are loaded, which blunts the per-project objection below.

**Costs:** one dependency, one plugin registration, delete the table and the test.

**Risks, and why they are decisive here rather than merely annoying `[strong: read out of `vite.config.mts` and `tsconfig.json` on master]`:**

1. **tsconfig `paths` are per-project; this graph is global.** editor-ui transforms files that physically live inside *other* packages' `src`. The plugin resolves an import by the importing file's nearest tsconfig, so one hop into `@n8n/stores/src` lands under stores' config — or none. `resolve.alias` is one rule for the whole module graph. The plugin's unit of truth is exactly the boundary this system dissolves.
2. **An irreducible Vite-only residue cannot live in tsconfig at all.** On master: `stream` → `stream-browserify` (line 29); the `@n8n/expression-runtime` browser stub, because it pulls `isolated-vm`, a Node-only native module — typecheck must see the real package, the bundle must not (lines 30–33); `@n8n/tournament` → `src` (line 37); the lodash rewrites (lines 88–95); `source-map-js` → a shim for `sanitize-html` (lines 96–100). So a hand-maintained Vite list survives the plugin. One source of truth *and a half*, minus the test.
3. **It inverts the blast radius.** With the plugin, a `paths` edit made for typecheck reasons silently changes what the production bundle ships. That is the precise failure class #35642 paid down.

**Honest concession:** risks 1 and 3 are consequences of *this graph*, not defects of the plugin. In a repo where each package built to `dist` and only the app read source, Option B would be right, and it is right in many repos.

### Option C — Per-package resolution: source-only + an `n8n:source` export condition

**The case for, written so its advocate would sign it.**

Follow the reviewer's principle all the way down and the single source of truth is not a table and not a tsconfig — it is **each package's own `package.json`**, the artifact whose job is already to describe how that package resolves. No mapping is maintained anywhere, by hand or by machine, and a new package needs zero entries in zero central files. That is a better answer than either A or B on the axis the reviewer actually raised.

Two classes, split by who consumes the package (§4 measures the split):

**C-a. Frontend-only packages** — `@n8n/stores`, `@n8n/composables`, `@n8n/rest-api-client`, `@n8n/frontend-utils`, `@n8n/frontend-constants`, `@n8n/i18n` — go **source-only**: `"main": "src/index.ts"`, tsdown `build` deleted. This is the `@n8n/design-system` precedent, already in the tree and already published to npm that way.

**C-b. Shared frontend/backend packages** — `@n8n/api-types`, `@n8n/constants`, `@n8n/utils`, `@n8n/telemetry`, `@n8n/chat-hub`, `@n8n/tournament` — keep `dist` as the default and add one **`"n8n:source"` export condition** pointing at `./src/...`. Frontend Vite contexts set `resolve.conditions`; the frontend tsconfig bases set `customConditions`. Backend resolution is untouched by construction, because no default condition changes.

**What gets deleted:** the alias table, every workspace `paths` key in editor-ui's tsconfig and in `tsconfig.frontend-module.json` (only `@/*` survives), `rootDirs`, the equivalence test's reason to exist, and the transitive false-negative class — because `@n8n/tournament` would declare its own resolution instead of relying on someone remembering it. The Vite residue shrinks to true shims: the stream polyfill, the lodash rewrites, `source-map-js`, and the expression-runtime stub.

**The mechanism is verified end to end on this repo's exact toolchain versions**, with negative controls (method in §A):

| Probe | With the condition | Without it (control) |
|---|---|---|
| `tsc` @ `@typescript/typescript6@6.0.2`, `moduleResolution: bundler`, `customConditions: ["n8n:source"]` | barrel **and** `./*` deep subpath resolve to `src/*.ts` — clean | `TS2322` ×2: types came from `dist/*.d.ts` |
| `tsc` @ `typescript@7.0.2` (tsgo), same config | clean | `TS2322` ×2, identical |
| `vite@8.0.2` build (rolldown), `resolve.conditions: ['n8n:source', ...defaultClientConditions]` | bundle contains the **src** markers | bundle contains the **dist** markers |

`[verified]` — both tools honour the condition, including for pattern subpaths, on both TypeScript catalogs.

**Costs, measured — and three of them are larger than the design as briefed accounts for:**

1. **Source-only alone does not serve deep imports. This is the finding that most changes the design.** `editor-ui/src` contains **2,039 deep-import specifiers across 106 distinct subpaths** into these twelve packages (`@n8n/stores` alone: 810 deep vs 116 bare; `@n8n/composables`: 617 deep, 0 bare; `@n8n/utils`: 197 deep, 0 bare) `[verified: §A.1]`. With `"main": "src/index.ts"` and no `exports` map, `@n8n/composables/useToast` resolves to `<pkg-root>/useToast`, **not** `<pkg-root>/src/useToast` — Node's subpath resolution does not know about `src/`. That is exactly why the cited precedent, `@n8n/design-system`, still carries **two Vite aliases plus a tsconfig `paths` key** on master despite being source-only `[strong: vite.config.mts:63–69, tsconfig.json]`. So the briefed claim that source-only packages need "no alias, no `paths` entry, no condition — plain node resolution" is **false as stated for these six packages as they are imported today.**
   **The design survives this, but only by adding `exports` maps to the source-only packages** — which is a strictly larger change than "delete the dist build", and it means C-a and C-b converge on one mechanism rather than being two.
2. **Subpath patterns must be extension-specific.** `"n8n:source": "./src/*"` **fails** — it falls through to the `types`/`import` branch, because `./src/deep` is not a file. It must be `"./src/*.ts"`. `[verified: §A.2, negative control fired]` Packages with mixed subpath kinds therefore need one pattern per extension class. 18 of editor-ui's deep specifiers carry an explicit extension today (`@n8n/design-system/components/N8nAlert/Alert.vue`, `@n8n/i18n/locales/en.json`, …) `[verified]`, so the shape is:
   ```jsonc
   "exports": {
     ".":        { "n8n:source": "./src/index.ts", "types": "./dist/index.d.mts", "import": "./dist/index.mjs" },
     "./*.vue":  { "n8n:source": "./src/*.vue" },
     "./*.json": { "n8n:source": "./src/*.json" },
     "./*":      { "n8n:source": "./src/*.ts",  "types": "./dist/*.d.mts",   "import": "./dist/*.mjs" }
   }
   ```
   More per-package JSON than briefed — but written once, next to the code it describes, and never synced against anything. The direction is still better than a central list; it is the *cost* that was understated, not the idea.
3. **`exports` is a deny-list.** Adding a map to a package that lacks one restricts what may be imported. SCSS `@use '@n8n/design-system/css/...'` specifiers carry no extension and are not `.ts` files (7 distinct in editor-ui; 49 call sites by design-system's own count `[strong: vite.config.mts:47–50]`), so no `.ts`-appending pattern serves them. Whether sass specifiers consult `exports` conditions at all under Vite 8 is untested `[assumed: they do not; Vite hooks sass through its own importer]`. Practical effect: **design-system keeps its aliases under every option**, which is tolerable — it has no `dist` in `main` to diverge from.

**Payoffs, concretely:**

- `turbo.json` declares `typecheck: { dependsOn: ["^build"] }` and `test: { dependsOn: ["^build", "build"] }` `[strong]`. Source-only removes six packages from the frontend critical path for both tasks, and retires the `@n8n/i18n` `BaseTextKey`-needs-a-rebuild class by construction. It does **not** grow the `vue-tsc` program: editor-ui's `paths` already point those six at `src`, so vue-tsc already compiles their sources `[strong]`.
- **`@n8n/tournament` is a one-line fix that deletes a landmine.** Its manifest already has `"module": "src/index.ts"` — dead, because `exports` takes precedence and its `"."` entry offers only `require`/`import`/`types`, all pointing at CJS `dist` `[strong]`. Adding `"n8n:source": "./src/index.ts"` to that entry makes the alias unnecessary *and* makes the dependency self-describing, so nobody can delete it by reading declared dependencies. It already ships `src/` in `files`, so the published tarball does not change `[strong]`. This is the highest-value, lowest-risk item in the whole proposal and it is independently landable.
- Scales to the ~25-package module world with zero per-package resolution config in any central file.

---

## 3. The three named risks, costed

### Risk 1 — Deep-import extension semantics under `exports` patterns, in Vite and vue-tsc

**Status: mostly retired, with two named gaps.** `[verified]` Both TypeScript catalogs and Vite 8/rolldown honour a custom condition for pattern subpaths, and the failure mode of the wrong pattern shape is now known precisely (§2 C cost 2): it is silent — resolution falls back to `dist` rather than erroring, which is the same shape as the D11 divergence. Mitigation is therefore not "be careful" but "assert it": the pilot must include a test that a source-condition subpath resolves to a `src` path in both toolchains.

**Gaps, honestly:** the probe used `tsc`, not `vue-tsc` 2.x `[inferred: vue-tsc delegates module resolution to TypeScript's resolver, so it should inherit — untested]`, and the Vite half used the rolldown **build** path, not the dev server `[inferred: both go through the same `resolve` plugin]`. `.vue` and `.scss` patterns are untested. **Cost to close: ~2 hours inside the pilot** — one fixture package, four assertions.

### Risk 2 — Every frontend Vite context must opt into the condition

**Status: real, enumerable, and larger than "editor-ui plus a few".** Fifteen configs resolve at least one of these packages `[verified: §A.3]`:

| Where | Configs | Note |
|---|---|---|
| `packages/frontend/editor-ui` | `vite.config.mts` | dev, prod build, and its vitest via the `vitestConfig` merge |
| `packages/frontend/@n8n/*` | `storybook`, `design-system`, `chat`, `stores`, `composables`, `i18n`, `rest-api-client`, `frontend-utils`, `frontend-constants`, `frontend-module-sdk` | 10 configs, plus `storybook/.storybook/main.ts` |
| `packages/@n8n/mcp-apps` | `vite.config.mts`, `vitest.config.mts` | frontend-shaped, outside `packages/frontend` |
| `packages/cli` | `vitest.config.base.ts` | **backend** — already aliases `@n8n/telemetry` → `src` |
| `packages/testing/playwright` | `vitest.config.ts` | consumes api-types / constants / utils |

Plus three tsconfig bases (`tsconfig.frontend.json`, editor-ui's own, and `tsconfig.frontend-module.json` landing in #35642).

**The sharp edge: `resolve.conditions` replaces Vite's defaults, it does not append.** `defaultClientConditions` is `["module","browser","development|production"]` in Vite 8.0.2 `[verified]`. Any opt-in that forgets to spread it silently changes third-party resolution across the whole graph. **Cost: 15 one-line edits, each of which is a footgun; ~1 day, and it wants a lint rule or a shared helper rather than 15 hand-written spreads.** Note that two of the fifteen are outside the frontend, so "frontend-only opt-in" is not quite the shape of the work.

### Risk 3 — Does anything external consume the dists that would be deleted?

**Status: not yet cleared, and the question is sharper than briefed.** All twelve candidate packages are **public** — none carries `"private": true` — and `.github/workflows/release-publish.yml` publishes every non-private workspace package with `pnpm publish -r --filter '!n8n'`; `.github/scripts/detect-new-packages.mjs` exists specifically to assert that every public package already exists on npm `[strong]`. Spot-checked against the registry: `@n8n/stores`, `@n8n/composables`, `@n8n/rest-api-client`, `@n8n/frontend-utils`, `@n8n/frontend-constants`, `@n8n/i18n`, `@n8n/design-system`, `@n8n/tournament` all return HTTP 200 `[verified 2026-08-07]`.

The six frontend-only packages publish `"files": ["dist"]` `[strong]`. **Deleting the `build` script therefore publishes an empty tarball** unless the package is also flipped to `private: true` (which changes the release job's package set) or `files`/`main` are changed to ship `src`. Precedent exists for both endings: `@n8n/design-system` is public, has no `files` field, and publishes source; `@n8n/tournament` publishes `src/` and `dist/`.

**What I did not check:** download counts, dependents, or whether any n8n-adjacent project imports these. Registry presence proves the name exists, not that anyone consumes it. **Cost to close: ~1 hour** (`npm view <pkg> --json` for downloads plus a registry dependents query per package) — and the answer changes the *shape* of C-a, not just its risk, so it is a gate on C-a rather than a caveat.

---

## 4. Blast radius

Consumers are declared workspace dependencies, measured 2026-08-07 `[verified: §A.4]`.

### Frontend-only (C-a) — the classification holds

| Package | Consumers | Deep / bare imports in `editor-ui/src` | npm |
|---|---|---|---|
| `@n8n/stores` | storybook, editor-ui | 810 / 116 | public, `files: [dist]` |
| `@n8n/composables` | design-system, stores, storybook, editor-ui | 617 / 0 | public, `files: [dist]` |
| `@n8n/rest-api-client` | stores, editor-ui | 214 / 168 | public, `files: [dist]` |
| `@n8n/i18n` | composables, rest-api-client, stores, storybook, editor-ui | 2 / 1007 | public, `files: [dist]` |
| `@n8n/frontend-utils` | composables, design-system, editor-ui | 2 / 0 | public, `files: [dist]` |
| `@n8n/frontend-constants` | composables, stores, editor-ui | 3 / 0 | public, `files: [dist]` |

Every consumer is under `packages/frontend/`. **Gravity's frontend-only classification is confirmed on declared dependencies.**

### Shared frontend/backend (C-b) — "backend untouched" needs two qualifiers

| Package | Backend / other consumers | Deep / bare in `editor-ui/src` |
|---|---|---|
| `@n8n/utils` | 23 packages incl. `cli`, `core`, `workflow`, `nodes-base`, `nodes-langchain`, `task-runner`, `mcp-apps`, `playwright` | 197 / 0 |
| `@n8n/constants` | 15 incl. `cli`, `core`, `backend-common`, `config`, `db`, `decorators`, `scheduler`, `workflow-sdk`, `playwright` | 0 / 2 |
| `@n8n/api-types` | 13 incl. `cli`, `db`, `decorators`, `chat-hub`, `instance-ai`, `ai-workflow-builder.ee`, `playwright` | 34 / 573 |
| `@n8n/telemetry` | `cli` | 0 / 19 |
| `@n8n/chat-hub` | `cli` | 0 / 4 |
| `@n8n/tournament` | `expression-runtime`, `workflow` — **not editor-ui** | 0 / 0 (transitive only) |

**Qualifier 1 — the claim is true of backend *production* resolution, and true by construction:** adding a non-default condition cannot change what the backend resolves, because the backend never asks for that condition. `[inferred, high confidence — it follows from conditional-exports semantics, not from a measurement]`

**Qualifier 2 — backend *test* resolution already deviates.** `packages/cli/vitest.config.base.ts` aliases `@n8n/telemetry` → `../@n8n/telemetry/src` `[strong]`, and the same file runs a `workspaceDistExternals()` plugin that deliberately externalizes workspace packages to their built dist. So `@n8n/telemetry` is *already* read from source in a backend context by a hand-maintained alias — under C-b that alias could be deleted, which is a small payoff rather than a risk. But "backend untouched" as a flat statement is not accurate about test contexts, and `packages/testing/playwright` is a third context that is neither frontend nor backend.

**Not in the twelve, but affected:** `@n8n/design-system` keeps its aliases under every option (§2 C cost 3); `@n8n/expression-runtime`'s browser stub is Vite-only residue under every option; `@n8n/api-requests` is a dead alias whose target directory does not exist and should go regardless `[strong: N8N-198]`.

---

## 5. Trade-off summary

|  | A — hand-maintained (landed) | B — `vite-tsconfig-paths` | C — per-package resolution |
|---|---|---|---|
| **Delivery cost** | 0 (shipped) | ~1 day, then a residual hand Vite list forever | **C1** ~½ day (tournament) · **C2** ~2–3 weeks for the remaining 11 + 15 opt-ins |
| **Operational cost (the 2 a.m. cost)** | Two artifacts, one test between them; the transitive trap stays armed | tsconfig edits change bundle output; residual list still hand-held | Resolution lives with the code; failure mode is *silent fallback to dist*, so it needs its own assertion |
| **Reversibility** | n/a — status quo | Class 1 — remove the plugin | **C1 Class 1** (delete one JSON line) · **C2 Class 2** (re-create 6 build pipelines + republish) |
| **Risk & blast radius** | Known, bounded, guarded by a test | 15 Vite contexts unchanged; 3 tsconfigs become bundle-affecting | 12 packages, 15 resolution contexts, 3 tsconfig bases, **6 published npm artifacts** |
| **Answers the reviewer's principle?** | No — it detects divergence instead of removing it | Partly — "one source of truth and a half" | **Yes** — no mapping exists to diverge |
| **Scales to ~25 module packages?** | Poorly, but slowly | Poorly (same per-project problem, ×25) | **Yes** — new packages need zero central entries |
| **Verified on this toolchain?** | Shipped and tested | Not attempted here | **Yes** — TS 6.0.2, TS 7.0.2, Vite 8.0.2, with negative controls |

---

## 6. Recommendation

**Adopt Option C's direction, in two independently-gated halves, and keep Option A as the net under both. Do not adopt Option B.**

The reviewer's principle wins; their tool does not survive this graph's Vite-only residue (§2 B risk 2, read straight out of `vite.config.mts`). Option C is the same principle taken one layer further, and — unlike either alternative — its mechanism is now verified on the exact TypeScript and Vite versions this repo pins.

The two halves have opposite risk profiles and should not be decided as one thing:

**C1 — the `n8n:source` condition, piloted on `@n8n/tournament` alone. Recommend: do it now. Class 1.**
One line of JSON in one manifest. It retires the single worst known trap in the system: an alias that is load-bearing, invisible to declared-dependency reasoning, and whose removal broke `pnpm dev` while typecheck and build stayed green. It touches no published artifact (tournament already ships `src/`). It is reversible by deleting the line. And it is the cleanest possible test of the mechanism, because tournament is the *hard* case — a transitive, CJS-dist package that editor-ui does not even declare.

**C2 — deleting the tsdown dist builds for the six frontend-only packages. Recommend: not yet. Decide at Wave-1 exit, with Risk 3 closed first. Class 2.**
This is the larger half and it is bigger than briefed: it needs `exports` maps, not just deleted `build` scripts (§2 C cost 1), and it changes six artifacts that are published to npm today (§3 Risk 3). None of that makes it wrong — the payoff on turbo's critical path and on the `BaseTextKey` class is real — but there is no reason to spend it before the module template has proven itself on three pilots, and every reason to do it one package at a time behind #35642's equivalence test.

**Land #35642 as the stepping stone.** It made the two artifacts agree and its test is the safety net under every step of the per-package burn-down. Coupling a reviewed fix to a twelve-package migration helps no one — least of all the reviewer, who objected to under-designed scaffolding and would receive, in exchange, a much larger under-reviewed change.

### The strongest argument against this recommendation

**Splitting C is exactly the failure mode this project's own roadmap names as kill-risk #3: half-migration rot.** If C1 lands and C2 is deferred, the repo runs *two* resolution regimes at once — central aliases for the frontend-only six, per-package conditions for the shared six — and a contributor must know which world a package lives in before they can reason about an import. That is worse than either endpoint. And the precedent is not hypothetical: this repo has a store migration parked near 50% behind warn-level lint, and a `moduleInitializer.ts` comment reading *"Hard-coding modules list until we have a dynamic way to load modules."* `[strong: design.md kill-risk table, §2]` "Decide at Wave-1 exit" is precisely the sentence that produces those artifacts.

I do not think that defeats the recommendation, but it does set its price: **C2 must carry a named DRI and a dated decision point, recorded in an ADR, or C1 should not land either.** A one-line change that buys a permanent second regime is a bad trade; a one-line change that buys a permanent second regime *plus a dated commitment to collapse it* is a good one. That is a real condition on my recommendation, not a caveat on it.

Two smaller counter-arguments, stated fairly:

- **Option A is already the Operator's ruling** (2026-08-07, on reviewability and team acceptance). C1 is a per-package manifest line rather than central machinery, so it does not obviously reopen that decision — but whether it does is alex's read, not mine.
- **`exports` maps are machinery too.** A four-pattern `exports` block is not self-evidently simpler than a table row to a reader who has not internalized conditional exports. The honest claim is not "C is less config" — it is "C's config lives next to what it describes and cannot diverge from a second copy." If the team reads conditional exports as *more* obscure than an alias table, that is a legitimate reason to prefer A, and it is the same reason A beat the generator.

### Kill criteria — what would make us stop

1. **`vue-tsc` 2.x does not honour `customConditions`** where plain `tsc` does → C-b is dead as designed; fall back to A (Risk 1 gap, closed in the pilot).
2. **`pnpm dev` regresses in any way** on the tournament pilot → revert the line, keep the alias. The check must load the app; typecheck-green and build-green are known-insufficient here.
3. **Any of the six frontend-only packages has real external consumers** → C-a becomes "add `exports` + keep `dist`", not "delete the build". Cheaper, smaller, still fine.
4. **The condition opt-in cannot be made safe across the 15 contexts without a shared helper** → we would be reintroducing central machinery, which is the thing alex rejected. Stop and re-decide rather than ship it quietly.
5. **The per-extension pattern list exceeds ~4 entries for any package** → that package's public surface is the actual problem; fix the surface, not the resolution.

---

## 7. Open questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| 1 | Does `vue-tsc@^2.2.8` honour `customConditions` under `moduleResolution: bundler`? And does the Vite **dev server** (not just the rolldown build) resolve the condition? | palette | inside the C1 pilot |
| 2 | Do any of the six frontend-only packages have real external consumers on npm (downloads, dependents)? If yes, C-a keeps `dist`. | index | 2026-08-11 |
| 3 | Is one shared helper for the 15 `resolve.conditions` opt-ins acceptable, given the ruling against central machinery — or is 15 hand-written spreads the lesser evil? | alex | with the C2 decision |
| 4 | Do sass `@use` specifiers consult `exports` conditions under Vite 8, or must design-system's aliases survive permanently? | palette | Wave-1 exit |
| 5 | Who is C2's DRI, and what is its dated decision point? (Answering this is a precondition of my recommendation, per §6.) | alex | with the C1 decision |
| 6 | Should `docs/rfcs/` and `docs/adrs/` be the repo's archive going forward, and does the dangling `ADR-0002` reference in `design-system/vite.config.mts:140` point at a record that exists somewhere else? | alex / index | 2026-08-12 |

---

## 8. Decision log

*(empty — this RFC recommends; alex decides. The decision line gets written here either way, and an ADR captures the ruling.)*

---

## Appendix A — Verification method

Every number above is reproducible. Commands are run from the repo root at `8ac5a60616` unless noted.

### A.1 Import counts

```bash
cd packages/frontend/editor-ui/src
for pkg in stores composables rest-api-client frontend-utils frontend-constants \
           i18n design-system api-types constants utils telemetry chat-hub; do
  bare=$(grep -rhoE "from '@n8n/$pkg'"        . --include='*.ts' --include='*.vue' | wc -l)
  deep=$(grep -rhoE "from '@n8n/$pkg/[^']+'" . --include='*.ts' --include='*.vue' | wc -l)
  echo "$pkg: bare=$bare deep=$deep"
done
```
Totals: 2,039 deep specifiers, 106 distinct subpaths, 18 carrying an explicit file extension.

### A.2 The `customConditions` / `resolve.conditions` probe

A throwaway fixture package whose `src` and `dist` return *different* values, so the probe discriminates. `exports`:

```jsonc
{ ".":       { "n8n:source": "./src/index.ts", "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./*.vue": { "n8n:source": "./src/*.vue" },
  "./*":     { "n8n:source": "./src/*.ts",     "types": "./dist/*.d.ts",     "import": "./dist/*.js" } }
```

TypeScript, consumer sets `moduleResolution: "bundler"` + `customConditions: ["n8n:source"]` and asserts the source-only literal types:

```bash
npx -y -p @typescript/typescript6@6.0.2 tsc -p tsconfig.json   # → clean
npx -y -p typescript@7.0.2              tsc -p tsconfig.json   # → clean
# negative control: same fixture, customConditions removed
# → app/main.ts(4,7): error TS2322: Type '999' is not assignable to type '1'   (both compilers)
```

Vite, consumer config `resolve: { conditions: ['n8n:source', ...defaultClientConditions] }`:

```bash
npx vite build -c vite.probe.config.mjs     # vite@8.0.2 → bundle contains SRC_BARREL, SRC_DEEP
# negative control: conditions: [...defaultClientConditions] only
#                                            → bundle contains DIST_BARREL, DIST_DEEP
node -e "import('vite').then(v=>console.log(JSON.stringify(v.defaultClientConditions)))"
# → ["module","browser","development|production"]   (so conditions REPLACES, hence the spread)
```

Extension-specificity control — changing the pattern target from `./src/*.ts` to `./src/*`:
```
app/main.ts(5,7): error TS2322: Type '999' is not assignable to type '2'
```
i.e. the deep import silently fell back to `dist`. **Extensionless pattern targets do not work.**

### A.3 Resolution contexts

```bash
find packages/frontend packages/@n8n/mcp-apps packages/testing packages/cli \
     -name 'vite.config.*' -o -name 'vitest.config*' | grep -v node_modules
```

### A.4 Consumers and publish status

```bash
for pkg in "@n8n/stores" "@n8n/utils" …; do
  grep -rl "\"$pkg\": \"workspace" --include=package.json packages/ | sed 's|/package.json||'
done
node -e "const p=require('./<dir>/package.json');console.log(p.name,!!p.private,p.files)"
curl -s -o /dev/null -w '%{http_code}' https://registry.npmjs.org/@n8n%2Fstores   # → 200
```
