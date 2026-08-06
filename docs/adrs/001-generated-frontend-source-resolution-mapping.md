# ADR-001: Derive the frontend source-resolution mapping from the filesystem

Date: 2026-08-06 · Status: Accepted

- **Decided by:** palette, as the implementation call inside the CAT-3691 / Wave 0.7 plan
- **Challenged by:** Alex (Operator), 2026-08-06 — "might be overkill". Answered by gravity's design review; verdict **"holds, as scoped."** No further objection as of filing.
- **Reviewed by:** filter — blocking review 2026-08-05, three defects found and fixed
- **Implemented by:** [PR #35642](https://github.com/n8n-io/n8n/pull/35642) (open, draft as of filing — the decision is made, the merge is pending)
- **Supersedes:** — · **Superseded by:** —

## Context

The n8n frontend consumes its workspace packages **from source**, not from `dist`: editor-ui aliases every `@n8n/*` frontend package to its `src/`, so a dev-server edit in `@n8n/stores` hot-reloads the editor with no rebuild step. That is a load-bearing property of the daily loop, and the frontend-modularization roadmap depends on it — source-only module packages have no `dist` to fall back to.

That mapping was maintained **twice, by hand**, in two files with nothing tying them together:

- `packages/frontend/editor-ui/vite.config.mts` — a `resolve.alias` array, used by the bundler and the dev server.
- `packages/frontend/editor-ui/tsconfig.json` — a `paths` block, used by `vue-tsc`.

Three facts were established during implementation. They are the substance of this decision, and none of them is in `design.md` §13, which lists only "a generated alias helper" as a planned deviation.

### 1. The two lists had already silently diverged

editor-ui's tsconfig had pathed several packages to `src`; the Vite list never got the matching entries. So `vue-tsc` typechecked those packages from source while the bundle was built from their `dist` — a stale `dist` meant shipping code that had been checked against something else. **Seven resolution classes** were affected, spanning on the order of **1,100 import sites** in `editor-ui/src`:

| package | import sites | typechecked from | bundled from |
| --- | --- | --- | --- |
| `@n8n/api-types` | 595 | src | **dist** |
| `@n8n/rest-api-client` | 395 | src | **dist** |
| `@n8n/stores` (bare form only) | 115 | src | **dist** |
| `@n8n/frontend-constants` | 3 | src | **dist** |
| `@n8n/frontend-utils` | 2 | src | **dist** |
| `@n8n/constants` (bare form only) | 2 | src | **dist** |
| `@n8n/chat` (bare form only) | 1 | src | **dist** |

Three of the seven diverged on the **bare form only**, and that is the trap worth remembering: `^@n8n\/stores(.+)$` requires at least one character after the package name, so `import … from '@n8n/stores'` never matched and fell through to `dist`, while `@n8n/stores/*` resolved to source correctly. Same shape for `@n8n/constants` and `@n8n/chat`. The generated mapping emits slash-anchored pairs instead (`^@n8n/stores$` and `^@n8n/stores/(.+)$`), which also removes an order dependency: the open-ended `^@n8n\/chat(.+)$` matches `@n8n/chat-hub/…` too, and the old list was only correct because a more specific entry happened to sit above it.

*Counts are from the PR's table (measured at `54212bfe14`, the PR's base commit). An independent recount reproduces five of the seven rows exactly and the total to within ~1%; the residual is `vi.mock`/dynamic-import forms, which a plain `from '…'` pattern misses. Treat the magnitude as verified and the last digit as method-dependent.*

### 2. Selecting by declared dependency has a false-negative class

The generator emits an alias only for packages the consumer **declares** as a dependency. That is what keeps turbo's cache honest — turbo hashes a package by its declared deps, so aliasing an undeclared package means edits to it never invalidate the consumer. It also retires dead aliases automatically.

It cannot see a **transitive** dependency that must still resolve from source. Two known members, both verified as undeclared by editor-ui (which declares `n8n-workflow` and neither of these):

- **`@n8n/tournament`** — `packages/workflow/src/expression-sandboxing.ts` imports `astVisit` from it. Its `dist` is CJS, and linked workspace packages skip `optimizeDeps`, so the dev server served that file verbatim and the browser could not parse a named export out of it. Dropping its alias **broke `pnpm dev` outright** (three dev-server smoke specs failed on every retry; reproduced locally 1/1) **and added 397,306 bytes to the production bundle** (CJS defeats tree-shaking), while `vue-tsc` and `vite build` both stayed green. The prod build survived only because rolldown interops CJS at bundle time — which is exactly why typecheck-green and build-green missed it.
- **`@n8n/expression-runtime`** — aliased to a browser stub, because it pulls in `isolated-vm`, a Node-only native module.

Both are hand-held exceptions in `packages/frontend/editor-ui/vite/aliases.mts`. Neither is derivable from the manifest, and the drift gate cannot see them: it iterates the scan's results, and neither package is in the scan.

### 3. The package count is about to grow, and one consumer cannot read code

The scan covers 14 platform packages today (9 under `packages/frontend/@n8n/*` plus 5 source-consumed packages that still live outside `packages/frontend`). The roadmap plans ~25 packages plus a vitest config per module. Hand-sync loses superlinearly, and the planned alias↔declared-deps cache-safety check needs a machine-readable source to work at all.

The constraint that decides the *shape* of the fix: Vite and vitest configs are JavaScript and can share a plain exported function — that part is not codegen at all. **tsconfig is JSON. It cannot import code, only `extends` another JSON file.** So the shared module base must carry a literal copy of the mapping, and a literal copy either gets generated or gets hand-synced.

## Options considered

### A — `vite-tsconfig-paths`, the canonical plugin. Rejected.

**Steelman:** it is the standard answer, it is zero bespoke code, and it makes tsconfig the single source of truth by construction. Deriving config with a homegrown script when a maintained plugin exists is normally the wrong trade.

**Why it lost — three reasons, all checkable in the shipped code:**

1. Vite's list must carry entries a tsconfig `paths` block must *not*: the `@/` root alias, `stream` → `stream-browserify`, the `@n8n/expression-runtime` stub, the `@n8n/tournament` source redirect, the lodash rewrites, the `source-map-js` shim. The plugin can only ever supply part of Vite's list; the hand-maintained remainder stays.
2. The direction is wrong for the module base. Modules must be **in** Vite's aliases (editor-ui has to resolve them to source) and **out of** the shared tsconfig base (a module must not be handed a typechecked path into another module's `src`). The scan is deliberately split for exactly this. A tsconfig-as-source plugin cannot express "one scan, two audiences."
3. Installing it while the two lists disagreed would have flipped all seven resolution classes as an invisible side effect, with no measured table and no separable commit.

A precision note, because the distinction matters to anyone reopening this: the *sets* the two consumers need are legitimately different (points 1 and 2). The *seven classes* were not a deliberate difference — they were accidental drift. Both facts argue against the plugin, for different reasons.

### B — A shared JS list plus a hand-synced tsconfig. The strongest case against this ADR.

**Steelman, and it is genuinely good:** if frontend modularization stops at the three Wave-1 pilots (otel, insights, mcp), the alias surface barely grows. A plain exported array shared by Vite and every vitest config costs nothing, needs no `--check` gate, needs no generated file kept format-stable against the formatter, and adds no build-order dependency. A reviewer's eyes are sufficient sync at that scale. This option would have been *enough*, and it would have been cheaper.

**Why it lost:** the JSON constraint above. The module tsconfig base needs a literal copy of the mapping, so the choice is generate-and-check or hand-sync-and-hope — and hand-sync-and-hope is precisely the mechanism that produced the seven-class divergence. The cache-safety check also needs the machine-readable source. This option's premise is that the migration stalls early; if that premise turns out to be right, see the revisit triggers.

### C — Keep both lists by hand. Rejected on evidence.

It had already failed, and one of its failures was a live footgun — a broken dev server and +397 kB in production — that nobody knew existed until the list was mechanized and the difference measured.

## Decision

**We derive editor-ui's frontend source-resolution mapping from the filesystem.** One scan, three parts:

1. **One scan helper** — `@n8n/vitest-config/frontend-aliases` scans `packages/frontend/@n8n/*` and `packages/frontend/modules/*` (plus the five hand-listed source-consumed packages outside `packages/frontend`) and emits both shapes from one pass: Vite `resolve.alias` entries and a tsconfig `paths` block. Selection is **by declared dependency**.
2. **One generated tsconfig base** — `@n8n/typescript-config/tsconfig.frontend-module.json`, which module packages extend. Platform packages only.
3. **One CI drift gate** — `pnpm check:frontend-aliases`, wired into `lint:ci`. It fails when the generated base is out of date, and when any package Vite resolves from source is not pathed to the same place in editor-ui's `tsconfig.json`.

**The sanctioned machinery is exactly those three parts, and is not allowed to grow past them.** Adding *consumers* of the existing helper is not growth; a fourth moving part is.

## Consequences

**Good**

- The two lists cannot drift apart again: Vite calls the helper directly, and CI fails on any divergence in the copy that must be literal.
- The seven-class divergence is closed. `vue-tsc` and the bundle now read the same files.
- The production bundle is **4,460 bytes smaller than master** with **2 fewer assets** — `constants2-*.js` (whose entire content is a re-export of `@n8n/stores/dist/constants2.mjs`) and a 0.03 kB `security-settings-*.js`. Master shipped `@n8n/stores` from `src` *and* `dist` simultaneously; closing the divergence removed the dist-side duplicate. Independently reproduced byte-for-byte across four builds.
- Editing `packages/frontend/@n8n/rest-api-client/src` now emits a dev-server HMR event. Before, it emitted nothing — the file was not in the graph.
- turbo cache-safety becomes structural rather than a convention: an alias is only emitted for a declared dependency.
- A new frontend package is picked up by the scan automatically, and a dead alias stops being emitted instead of rotting (one dropped here: `@n8n/api-requests`, whose target directory does not exist).

**Bad** — the accepted costs

- **The declared-dependency model has a false-negative class, and it fails silently in the direction that matters.** Two hand-held exceptions live in `vite/aliases.mts` today. The gate cannot see them, and typecheck-plus-build cannot either: both were green while `pnpm dev` was broken. The guard is a unit test plus the Dev-server smoke CI job.
- **Only one of the two exceptions has a unit-test guard.** `@n8n/tournament` is pinned by `vite/aliases.test.ts`; `@n8n/expression-runtime` is not. Its stub failing would surface as a Node-native-module error in a browser build rather than silently, which is why this is a note and not a blocker — but it is asymmetric coverage.
- **A second hand-maintained list survives inside the generator**: the five source-consumed packages outside `packages/frontend`. It is *not* the exception list and does not count against the kill criterion; it shrinks only when those packages move under `packages/frontend`.
- A **generated, committed file** now has to stay format-stable, or the formatter and `--check` undo each other. Handled today by a regex in the writer that matches biome's single-entry-array formatting — a real and fragile seam.
- A **build-order dependency**: `check:frontend-aliases` must build `@n8n/vitest-config` before it can run.
- **The gate is a ratchet with a sequencing trap.** A new module needs its `paths` entry in editor-ui's `tsconfig.json` in the *same* PR as its dependency entry, or the first module lands red. Verified 1/1 with a probe module.
- **`paths` absence is not a boundary.** The base omitting module packages stops an *accidental* cross-module import and nothing more — `paths` is additive, so once a module declares another module as a dependency, pnpm symlinks it and the import typechecks clean. Boundary enforcement is the ESLint rule, which does not exist yet. Any guide claiming typecheck catches cross-module imports is wrong.
- **105 lines of resolution logic are never typechecked**: `vite/aliases.mts` sits outside editor-ui's tsconfig `include` (`src/**` only). Tracked as N8N-199 defect 3.

**Neutral**

- **editor-ui only.** Four consumers still carry hand-maintained alias lists — `@n8n/storybook` (12 entries), `@n8n/design-system` (4), `@n8n/chat` (3), `packages/@n8n/mcp-apps` (3 files) — so the generator is not yet the single source of truth. Tracked as N8N-198. design-system's are object-form with regex-looking *string* keys (`'@n8n/composables(.*)'`), which Vite matches exact-or-prefix and never as regex, so **they never match today**; normalizing them changes resolution and needs its own commit.
- Warm editor-ui build time moved 30.1s → 28.6s (single measurement, not a benchmark).

## Revisit triggers

- **The exception list is the kill criterion.** If the hand-held exception list for the transitive false-negative class grows past a handful, the model is wrong: **delete the generator, do not patch it.** Specifically — do not grow the exception mechanism to accommodate it. **Two entries at filing.** N8N-198 ports four more consumers through the same declared-dependency model and is required to report the resulting count as an explicit outcome; that number is the first real test.
- **The machinery needs a fourth moving part.** One scan helper, one generated base, one `--check` gate is the sanctioned surface. A fourth is the signal to stop and re-decide, not to extend.
- **A false-negative appears that is not a transitive dependency.** That would mean the failure class is wider than "declared deps miss transitive ones," and the selection model itself is wrong.
- **The migration stalls at the Wave-1 pilots.** Then Option B was the right call at the price of a generated file, and the honest move is to say so and simplify.
- **The alias surface shrinks to where hand-maintenance is trivially safe again.** This is expected, not a failure: as packages go source-only the surface shrinks, and **the script is meant to retire with it.** A bounded lifespan is part of the decision, not a defect in it.

## Receipts

- **PR:** [#35642](https://github.com/n8n-io/n8n/pull/35642) — three commits, deliberately not squashed: the generator with no resolution change, the divergence fix on its own, then three review fixes. Commit 1's neutrality was verified independently — 771 assets with identical filenames *including content hashes* and identical byte totals.
- **Linear:** [CAT-3691](https://linear.app/n8n/issue/CAT-3691). **Workspace thread:** N8N-188 (implementation, review, and the Operator challenge), N8N-198 (kill-criterion test), N8N-199 defect 3, N8N-204 (this record).
- **Design context:** `design.md` §6.2 and §13 (frontend-modularization proposal, not yet committed to this repo).
- **Code:** `packages/@n8n/vitest-config/frontend-aliases.ts`, `packages/@n8n/vitest-config/bin/sync-frontend-aliases.mjs`, `packages/@n8n/typescript-config/tsconfig.frontend-module.json`, `packages/frontend/editor-ui/vite/aliases.mts`, `packages/frontend/editor-ui/vite/aliases.test.ts`.
