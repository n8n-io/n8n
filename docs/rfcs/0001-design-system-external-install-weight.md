# RFC-0001: Cut the external install weight of `@n8n/design-system`

Status: **Draft — awaiting decision**
Author: index · Reviewers: Alex Grozav (decider), sigma (implementer) · Class: **2** (expensive to reverse) · Comment window closes: **2026-08-28**

Source issue: N8N-303. Evidence base: N8N-296, [PR #37011](https://github.com/n8n-io/n8n/pull/37011), commit `8e65884`.

## Problem

A project outside this monorepo that installs `@n8n/design-system` to use its Vue components gets a
**351 MB, 312-package** `node_modules`. The tree includes `isolated-vm` (a native addon),
`@sentry/node`, 14 `@sentry/*` + `@opentelemetry/*` packages, `ssh2`, `axios` and `recast`.

None of that is reachable from any code path a browser consumer executes. Verified against the
published `2.35.3` artifacts: `n8n-workflow` and `@n8n/api-types` appear in **zero** runtime
(`.mjs`/`.cjs`) files of `@n8n/composables` and `@n8n/i18n` — only in `.d.mts`/`.d.cts`
declarations and source maps.

Why now: N8N-296 established that an external install works. This is the next barrier, and it is a
number, not a taste call.

### Why the 4 subpaths pull the whole chain

The published `dist` of `@n8n/design-system` externalises everything the manifest declares
(`vite.config.mts`, `isExternal`), so exactly four bare specifiers survive into the bundle:

| Subpath in `dist` | Owning package | That package's dependency cost |
|---|---|---|
| `@n8n/composables/useDeviceSupport` | `@n8n/composables` | **the whole chain** |
| `@n8n/frontend-utils/htmlUtils` | `@n8n/frontend-utils` | `vue`, `xss` |
| `@n8n/utils/event-bus` | `@n8n/utils` | `@n8n/constants`, `nanoid` |
| `@n8n/utils/string/truncate` | `@n8n/utils` | ditto |

**npm resolves dependencies per package, not per subpath.** `dist/useDeviceSupport.mjs` imports only
`vue` — but importing that one subpath installs all nine of `@n8n/composables`' declared
dependencies, transitively. `exports: { "./*": … }` gives you subpath *resolution*; it gives you no
subpath *dependency scoping*. No bundler, tree-shaker or `sideEffects` flag changes what the
installer puts on disk.

The chain, then:

```
@n8n/design-system
└── @n8n/composables            ← 1 import site, 1 component, 46 lines
    ├── n8n-workflow            ← type-only, 0 runtime references
    │   └── @n8n/expression-runtime → isolated-vm  (+ @sentry/node, ssh2, axios, recast, @codemirror/autocomplete)
    ├── @n8n/api-types          ← type-only, 0 runtime references
    │   └── n8n-workflow
    └── @n8n/i18n               ← real runtime import, in useToast only
        └── n8n-workflow        ← type-only, 0 runtime references
```

### Measured cost of each edge

Method: scratch `npm install` per tree, npm 11.x, macOS arm64, `--ignore-scripts` on the per-edge
probes. Size = `du -sm node_modules`. Count = `package-lock.json` `packages` keys minus the root.
Verified, 2026-08-25.

| Tree | Disk | Packages |
|---|---|---|
| `@n8n/design-system@2.35.3` — what a consumer gets today | **351 MB** | **312** |
| …with the `@n8n/composables` dependency removed | 207 MB | 157 |
| **Delta — the `@n8n/composables` edge** | **144 MB** | **155** |
| `@n8n/composables@1.26.3` alone | 162 MB | 192 |
| …its browser-only deps only (`@vueuse/core`, `lodash`, `vue`, `vue-router`, `@n8n/frontend-utils`, `@n8n/frontend-constants`) | 26 MB | 35 |
| **Delta — the type-only backend chain inside composables** | **136 MB** | **157** |
| `@n8n/i18n@2.36.3` alone | 153 MB | 178 |
| `@n8n/api-types@1.36.3` alone | 136 MB | 157 |
| `n8n-workflow@2.36.3` alone | 129 MB | 151 |
| `@n8n/expression-runtime@0.27.1` alone | 52 MB | 78 |
| `@sentry/node` alone | 57 MB | 33 |
| `isolated-vm@7.0.1` alone | 21 MB | 2 |
| `@n8n/tournament` alone | 7 MB | 45 |
| `@n8n/frontend-utils@0.4.0` alone | 19 MB | 27 |
| `@n8n/utils@1.44.0` alone | 2 MB | 3 |

Heaviest single packages in today's 351 MB tree: `element-plus` 110 MB, `@sentry/*` 30 MB,
`isolated-vm` 21 MB, `@opentelemetry/*` 21 MB, `reka-ui` 16 MB, `@tiptap/*` 15 MB,
`highlight.js` 10 MB.

Three corrections to the premises in N8N-303, all verified:

1. **The measurement differs.** 351 MB / 312 packages here, against the ~400 MB / ~236 packages
   recorded in N8N-296. Disk figures vary with npm version and platform; the two package counts
   cannot both be right for the same resolver. Treat this table as the baseline, and re-run the
   commands above before accepting a fix.
2. **`isolated-vm` does not require a C++ toolchain on the common platforms.** `7.0.1` ships
   prebuilt binaries via `node-gyp-build` for `darwin-arm64`, `linux-x64`, `linux-arm64`
   (glibc and musl) and `win32-x64`; the install used them and compiled nothing. A toolchain is the
   *fallback* — it fires on `darwin-x64` (absent from the prebuild set) and on any unlisted
   ABI. The prebuilds are also why the package costs 21 MB: 15 MB of it is binaries for platforms
   the consumer does not run.
3. **`isolated-vm` is not the expensive part.** It is 21 MB of the 144 MB the composables edge adds.
   Removing it alone fixes 15% of the problem.

The cost driver is not size, and not the native addon. It is **three type-only import statements
declared as runtime dependencies**:

- `packages/frontend/@n8n/composables/src/registries/telemetryRegistry.ts:1,3` — `import type` from
  `@n8n/api-types` (`ITelemetrySettings`) and `n8n-workflow` (`IDataObject`,
  `ITelemetryTrackProperties`, `NodeParameterValueType`).
- `packages/frontend/@n8n/i18n/src/index.ts:2` — `import type` from `n8n-workflow`
  (`INodeProperties`, `INodePropertyCollection`, `INodePropertyOptions`).

Two of 16 non-test source files in `@n8n/composables` touch the heavy packages. One of 5 in
`@n8n/i18n`. Seven type identifiers, total.

## Options considered

### Option A — Fix the declarations: sink the 7 types, drop the runtime edges (recommended)

Move the seven type identifiers into a package with no heavy dependencies —
`@n8n/frontend-constants` (zero dependencies today) is the natural host — and demote `n8n-workflow`
and `@n8n/api-types` from `dependencies` to `devDependencies` in `@n8n/composables` and `@n8n/i18n`.

The case for it: **this pattern already ships in the same package.** `@n8n/composables` declares
`@n8n/telemetry` in `devDependencies`, its types are referenced by the published
`dist/telemetryRegistry.d.mts`, and the package is absent from the installed tree — three external
installs in N8N-296 built, typechecked and rendered anyway. The mechanism is proven here, not
borrowed.

It fixes the problem for **every** consumer of `@n8n/composables` and `@n8n/i18n`, not only for
design-system: `@n8n/stores`, `packages/modules/instance-registry/frontend`, `@n8n/storybook` and any
future published frontend package inherit the fix. It is a manifest and import change; no component
behaviour moves, no public component API changes.

Measured, not projected: a tree with `@n8n/composables` and `@n8n/i18n` present and only the
type-only edges removed installs at **210 MB / 163 packages**, with no `isolated-vm`, no
`n8n-workflow`, no `@sentry/*` and no `@opentelemetry/*`.

Costs and risks:

- **`skipLibCheck: false` consumers regress.** A demoted `devDependency` leaves the shipped `.d.ts`
  referencing a package that is not installed. Sinking the seven types is what keeps this from
  happening — the demotion alone would not. N8N-296 already records 61 errors in 11 shipped `.d.ts`
  files under `skipLibCheck: false`; this option must not add to that count, and the acceptance test
  is the existing `typecheck:libcheck` probe.
- Type identity changes. `@n8n/i18n`'s exported types stop being `n8n-workflow`'s
  `INodeProperties` and become a structurally identical copy. Structural typing means callers
  compile; anything relying on nominal identity or on declaration merging does not. In-repo
  consumers are behind the workspace, so this is caught at typecheck, not at runtime.
- The seven types now have two homes and can drift. Mitigation: a type-level assertion test in
  `n8n-workflow` that the sunk copies still match, or generate one from the other.
- Does not touch `element-plus` (110 MB), so the tree stays large in absolute terms.

Reversibility: **Class 2.** No new public package name, no data migration. Unwinding is re-promoting
two dependency entries and moving seven types back — days, not weeks, and semver-visible.

### Option B — Sink `useDeviceSupport` out of `@n8n/composables`

Move the 46-line `useDeviceSupport` composable into `@n8n/frontend-utils` (`vue` + `xss`) or into
design-system itself, and delete `@n8n/composables` from design-system's dependencies.

The case for it: it is the smallest possible change that hits the headline number, and it fixes a
real layering violation. `@n8n/design-system` is L1 in the frontend-modularization layering; pulling
an L2 composable package inverts the layers. `useDeviceSupport` has no dependency beyond `vue` —
`dist/useDeviceSupport.mjs` imports `computed` and `ref` and nothing else — so it does not belong in
a package that reaches for `n8n-workflow`. 19 files across the repo import it, so a re-export keeps
the move mechanical.

Measured result: **207 MB / 157 packages** — 3 MB and 6 packages better than Option A.

Costs and risks:

- It fixes design-system only. `@n8n/stores` and the instance-registry frontend keep the 144 MB
  chain. The next published frontend package hits the same wall.
- Design-system regains a dependency on `@n8n/composables` the first time a component wants any
  other composable from it, and the problem returns silently. Enforcement is needed either way, and
  Option A makes the enforcement unnecessary.
- If the target is design-system itself, the honest comparison is 207 vs 210 MB. That is not a
  reason to choose it.

Reversibility: **Class 1.** Move a file back.

### Option C — Invert `useDeviceSupport` behind a consumer-supplied interface

`N8nKeyboardShortcut` takes platform information through `provide`/`inject` or a prop, with a
default. Design-system declares no dependency for it.

The case for it: it is the correct shape for a design system in general. Platform detection is host
knowledge, and a component library that reads `navigator.userAgent` directly is untestable in the
host's own way and wrong inside an iframe or an SSR pass. Reka-ui and design-system both already use
injection keys, so the pattern is in the codebase.

Costs and risks: it is a public API change to a shipped component for a 46-line internal helper, and
the default implementation still has to live somewhere — so it does not remove the code, only adds a
seam. It buys nothing that Option A or B does not, at higher consumer cost. Correct in principle,
disproportionate here.

Reversibility: Class 2 — a shipped component contract.

### Option D — Make the heavy edge optional

Declare `isolated-vm` an `optionalDependency` of `@n8n/expression-runtime`, and/or `n8n-workflow` an
optional `peerDependency` of `@n8n/composables`.

The case for it: it is a one-line manifest change per edge, needs no code move, and `optionalDependencies`
exists for exactly this — a dependency the package can run without.

Costs and risks: it does not work here. `isolated-vm` is 21 MB of the 144 MB; the remaining 123 MB
is `@sentry/*`, `@opentelemetry/*`, `axios`, `ssh2`, `recast` and `@codemirror/autocomplete`, all
reached through `n8n-workflow`. And `@n8n/expression-runtime` genuinely cannot run without
`isolated-vm` — declaring it optional makes the manifest state something false, and moves a hard
install failure to a soft runtime failure inside the backend, where it matters most. An optional
`peerDependency` on `n8n-workflow` is closer to honest but still lies about a package whose
`.d.ts` needs those types; Option A is the same idea done correctly, with the types sunk instead of
left dangling.

Reversibility: Class 1, but the failure it creates is Class 3 in blast radius.

### Option E — Split `@n8n/composables` into browser-only and n8n-aware halves

`@n8n/composables` (browser-only: 14 of 16 source files) and `@n8n/composables-n8n` (`useToast`,
`telemetryRegistry`).

The case for it: it is the structurally durable answer, it publishes an explicit layer boundary
rather than relying on discipline, and it makes the layering rule enforceable by the package graph
instead of by review.

Costs and risks: a new published package name is a **Class 3** commitment, and it prices at weeks
against Option A's days. It also solves a problem that only two files have. Worth revisiting if the
count of n8n-aware composables grows past a handful; not worth it for two.

Reversibility: **Class 3.** A published name is not withdrawn cleanly.

### Option F — Status quo

Document the install cost in the design-system README and move on.

The case for it: nobody outside the monorepo consumes this package today, so the cost is theoretical.
The team's frontend-modularization roadmap has 4–6 person-weeks of Wave 0 ahead of it, and this is
not on that critical path.

Costs and risks: the cost is theoretical only until the first external consumer, at which point it
is a first-impression failure — a UI component library that installs a native addon and an OTel
distribution reads as unmaintained. Option A is days of work. The asymmetry is the argument against
waiting.

## Trade-off summary

| | A: fix declarations | B: sink the composable | C: invert | D: optional edge | E: split package | F: status quo |
|---|---|---|---|---|---|---|
| Result (disk / packages) | 210 MB / 163 ᵐ | 207 MB / 157 ᵐ | 207 MB / 157 ᵐ | 330 MB / 310 ᵖ | 210 MB / 163 ᵐ | 351 MB / 312 ᵐ |
| Native addon gone | yes | yes | yes | on disk yes, correctness no | yes | no |
| Delivery cost | 2–3 days | 0.5–1 day | 3–4 days | 1 hour | 2–3 weeks | 0 |
| Fixes it for other consumers | **yes** | no | no | partly | yes | no |
| Operational cost (the 2 a.m. cost) | type drift between two homes | design-system re-acquires the edge unnoticed | consumers must wire a provider | backend fails at runtime, not at install | one more package to version | first external consumer bounces |
| Reversibility | Class 2 | Class 1 | Class 2 | Class 1 (bad failure mode) | **Class 3** | — |
| Risk & blast radius | `skipLibCheck: false` consumers | low | shipped component API | **backend correctness** | publishing surface | reputational |

ᵐ measured · ᵖ projected (today's tree minus `isolated-vm`; not installed)

## Recommendation

**Option A**, with **Option B** taken alongside it as cheap layering hygiene.

Option A is the only candidate that removes the cause rather than one of its symptoms. The 144 MB is
installed because two packages declare a compile-time need as a runtime dependency; the fix is to
stop declaring it. It fixes every consumer of those two packages at once, the pattern already ships
in the same package (`@n8n/telemetry` in `devDependencies`), and it stays a two-way door. Option B
costs half a day on top, closes the layering inversion that let design-system reach into L2 in the
first place, and takes the number to 207 MB.

**The strongest argument against it:** Option A buys 141 of the 144 MB that Option B buys alone, for
four times the effort — and Option B is a Class 1 change while Option A is Class 2 and touches
`@n8n/i18n`, a package with 178 packages of its own transitive weight and consumers throughout the
frontend. If the goal is only "make design-system installable", B is the disciplined minimum and A
is scope creep. The recommendation rests on a claim that is not measured: that a second published
frontend package will hit this same edge. That claim is the thing to argue with.

### Target

| Metric | Today | Target | Stretch |
|---|---|---|---|
| Disk | 351 MB | **≤ 215 MB** | ≤ 110 MB |
| Packages | 312 | **≤ 165** | ≤ 90 |
| Native addons | 1 (`isolated-vm`) | **0** | 0 |
| `@sentry/*` + `@opentelemetry/*` packages | 14 | **0** | 0 |
| Server-only packages (`ssh2`, `axios`, `recast`, `@codemirror/*`) | present | **absent** | absent |

The target is the measured Option A tree plus headroom, not a projection. The zero-count rows are
the real gate: they are binary, they do not drift with npm versions, and they are the part a consumer
notices. The stretch column needs `element-plus` (110 MB, 31% of today's tree and 52% of the target
tree) addressed — a direct design-system dependency, unrelated to this chain, and out of scope here.
File it separately.

## Open questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| 1 | Where do the 7 sunk types live — `@n8n/frontend-constants`, `@n8n/utils`, or a new types-only package (which makes this Class 3)? | Alex Grozav | at decision |
| 2 | Is `skipLibCheck: false` a contract we support for external consumers? If yes, Option A must sink the types and cannot merely demote; if no, the demotion alone suffices and this drops to ~1 day. N8N-296 records 61 pre-existing errors, which suggests the answer is already "no". | Alex Grozav | at decision |
| 3 | Why did N8N-296 measure 236 packages against 312 here? Two resolvers cannot both be right. | sigma | before implementation |
| 4 | Does any external consumer target `darwin-x64`? It is the one common platform with no `isolated-vm` prebuild, and the only place today's tree needs a compiler. | sigma | before implementation |
| 5 | Should design-system's dependency on `@n8n/composables` be barred by lint after Option B, so it cannot return unnoticed? | Alex Grozav | after decision |

## Decision log

*Awaiting the Operator's ruling. Per the ADR contract an ADR records a decision already made, so
none is filed yet. On a ruling for Option A or B the class is 2 or 1 and an ADR follows within a day;
a ruling for Option E is Class 3 (a new published package name) and its ADR needs explicit Operator
sign-off in the same record.*

## Reproducing the measurements

```sh
# baseline
mkdir base && cd base && npm init -y
npm install @n8n/design-system@2.35.3 --no-audit --no-fund
du -sm node_modules
node -e "console.log(Object.keys(require('./package-lock.json').packages).length-1)"

# which specifiers actually survive into the shipped bundle
grep -rhoE '@n8n/[a-z-]+(/[a-zA-Z0-9/_-]+)?' node_modules/@n8n/design-system/dist --include='*.js' | sort -u

# proof the heavy packages are referenced only by declarations
grep -rln 'n8n-workflow' node_modules/@n8n/composables/dist node_modules/@n8n/i18n/dist

# per-edge cost: install each package alone into its own scratch tree, then subtract
```
