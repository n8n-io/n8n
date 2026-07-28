# Per-file declarations for @n8n/design-system, driven by vite-plugin-dts

Date: 2026-07-28 · Status: accepted
Implemented by: [#35108](https://github.com/n8n-io/n8n/pull/35108) (open at filing)
Supersedes: — · Superseded by: —
Depends on: [ADR-0001](0001-design-system-ships-as-a-compiled-package.md)

## Context

[ADR-0001](0001-design-system-ships-as-a-compiled-package.md) commits us to
shipping a compiled package, which means shipping `.d.ts` files. The package had
no declaration pipeline at all (`noEmit: true`, no emit step anywhere), so this
had to be built from zero.

**Read this part first, it is the expensive lesson.** A bare `vue-tsc` run
emitted declarations for **104 of 158** components and **exited 0 with no
diagnostic** for the other 54. Declaration emit fails *silently*: the exit code
is 0, the log is clean, and the files are simply absent. This cost two full
passes on this issue before anyone thought to count the output instead of
trusting the exit code. If you are debugging a `.d.ts` pipeline for a `.vue`
library: **count emitted declarations against source components. The exit code
does not tell you anything.**

The skips share one root cause: the inferred template context of a component
pulls in a type the compiler cannot *name* portably through pnpm's hashed
`node_modules` paths, and rather than error it drops the file. Two offenders
accounted for the bulk — `vue-router`'s global `ComponentCustomProperties`
augmentation (`Router`, `RouteLocationNormalizedLoadedGeneric`) and
`LooseRequired` from `@vue/shared`, both surfacing as `TS2883`.

This was not cosmetic. editor-ui resolves the component barrel through `dist`
for types, so missing declarations regressed the monorepo: 5 implicit-`any`
errors against a baseline of 0 on `master`. The gate for this work was therefore
not "declarations exist" but **editor-ui typecheck back to 0 errors**.

## Decision

We emit **per-file declarations**, with **`vite-plugin-dts` driving the emit**
(`rollupTypes: false`, `entryRoot: src`, against a dedicated
`tsconfig.build.json`), and we fix residual silent skips **at the source** by
declaring slots explicitly and avoiding template constructs that materialise
foreign instance types.

Declaration flattening — the option we set out to implement — is **rejected**.

### The finding: who drives the emit matters more than what it emits

Switching from a bare `vue-tsc` invocation to `vite-plugin-dts` — same
TypeScript, same tsconfig, same components — collapsed the error count from
**110 → 3**. The entire `vue-router` `TS2883` class, 54 missing components and
the bulk of the problem, evaporated. No source change caused that; the driver
did.

This inverts the intuitive diagnosis. The instinct was to make `vue-tsc` name
the foreign types, and three attempts down that road all failed (below). The
productive question was not *how do we name these types* but *what is invoking
the compiler, and with what module resolution*.

### The three residual silent skips, and their mechanisms

These are the durable part of this record. Each is a distinct way a `.vue`
component can silently lose its declaration.

1. **`TS7056` via `__VLS_TemplateRefs` — `N8nSelect`.** A *string* ref
   (`ref="innerSelect"`) on `<ElSelect>` registers in vue-tsc's
   `__VLS_TemplateRefs` map, which materialises element-plus' entire `ElSelect`
   instance type — larger than the compiler will serialize. Fix: a **function
   ref**, which never enters that map and is runtime-identical.
   `src/components/N8nSelect/Select.vue:68,154`
2. **`TS7056` again, via `defineExpose` — same component, second face.**
   Exposing the ref itself (`defineExpose({ innerSelect })`) makes vue-tsc unwrap
   it through `ShallowUnwrapRef`, which loses the `InnerSelectRef` name and
   re-expands the instance type. Fix: expose a **getter** returning
   `innerSelect.value`. `src/components/N8nSelect/Select.vue:135`
3. **`TS2883` via `LooseRequired` — `SelectItem`.** Inferred slot props are
   wrapped in `LooseRequired` from `@vue/shared`, a transitive dependency the
   compiler cannot name. Fix: `defineSlots<…>()` instead of inference.
   `src/v2/components/Select/SelectItem.vue:15`
4. **`TS7022` via circular `useSlots()` — `SettingsRow`.** `useSlots()` was read
   by a computed that the template renders, so inference is circular, falls back
   to `any`, and blocks emit. Fix: `defineSlots<…>()`.
   `src/components/N8nSettingsRow/SettingsRow.vue:93`

The pattern across all four: **when inference reaches a type the compiler cannot
name, declare it.** Declaring slots is not a workaround with a cost — those
slots are now typed for consumers too, which is a net gain.

Fixing `N8nSelect` by mechanism 1 also let us **delete the `ElSelect.props`
widening entirely**, so element-plus' prop and emit precision survives across
~940 internal call sites. That cost had previously been refused, correctly.

## Considered options

- **Bare `vue-tsc -p tsconfig.build.json`.** Rejected: 54 silent skips.
- **`skipTemplateCodegen: true`.** All 158 components emit — genuinely tempting,
  and the fastest green. Rejected because slot types collapse to `slots: {}` on
  140 components, and since editor-ui resolves the barrel through `dist` that
  breaks the monorepo with 33 errors. A green build that lies about slots is
  worse than a red one.
- **`"types": ["vue-router"]`.** Rejected *as the fix*: it does not make the
  augmented types nameable and the skips remain. Note for future readers — this
  entry is still present in `tsconfig.build.json`; **do not read its presence as
  evidence that it solved anything.**
- **Widening `ElSelect.props`.** Gets `N8nSelect` past `TS7056`, at the cost of
  prop/emit precision across ~940 internal call sites. Rejected, and later
  deleted outright once the function-ref fix landed.
- **Flattening / rollup (`rollupTypes: true`, api-extractor)** — this was the
  directed approach, built first, and rejected on measurement. It worked: a
  320 KB bundle with 344 exports. Then it showed its ceiling — **api-extractor
  cannot follow `.vue` module specifiers**, leaving 38 dangling relative imports
  including `import { default as N8nSelect } from './Select.vue'`. `N8nSelect`
  degraded to `any`, which turned out to be the actual upstream cause of the 5
  editor-ui errors all along, not the missing declaration it was blamed on.
  Flattening was strictly worse here.
  **Its strongest case, preserved:** flattening is the *only* route that can
  satisfy `node16`, because it removes the `.vue` and extensionless specifiers
  Node's ESM resolver rejects. It also collapses the deep-path surface area to
  one file. If api-extractor learns `.vue`, or a `vue-tsc`-native flattener
  appears, this option deserves a fresh measurement rather than a citation of
  this ADR. The diff is one boolean.
- **Chosen: `vite-plugin-dts`, per-file.** 157 components emit with slot types
  intact, deep paths keep their types, no api-extractor quirks.

## Consequences

**Good**

- editor-ui typecheck back to **0 errors** — baseline parity with `master`.
  `@n8n/storybook` also 0. design-system typecheck, lint and format clean;
  1380 tests across 117 files pass.
- Deep import paths keep real types instead of resolving to a single flat
  bundle.
- The props widening is gone: no prop/emit precision loss across ~940 internal
  call sites.
- Three components gained explicitly typed slots, which consumers can now use.
- `node10` came green for free — a side effect of collapsing to a single entry
  point, not of anything type-related.
- From a packed tarball outside the monorepo: 387 declaration files, consumer
  typecheck and build clean, with a typed `#prepend` slot rendering a lucide icon
  from a pre-built chunk.

**Bad**

- **`attw` `node16` stays red, by construction.** Per-file declarations keep
  `./Button.vue` and extensionless specifiers, which Node's ESM resolver
  rejects. The fix for this is precisely the flattening we removed. `bundler` is
  the supported target; `@n8n/chat` has the same property.
- **The emit is silently fragile.** Any new component whose template inference
  reaches an unnameable type loses its declaration with a clean exit code. There
  is currently no check that would catch this — the anti-rot job (N8N-117)
  should assert emitted-declaration count, not merely that the tarball packs.
- Four components carry hand-declared slots that the compiler will not keep in
  sync with their templates. Add a slot to the template and forget the
  `defineSlots` entry, and consumers silently do not see it.
- `N8nSelect` no longer exposes `innerSelect` as a ref but as a getter. Reads
  through the exposed proxy are equivalent; anything that treated it as a
  `Ref` object is not.
- The declaration pipeline now depends on a plugin's choice of module
  resolution, which is the thing that fixed it and therefore the thing that can
  silently break it on upgrade. `vite-plugin-dts` is load-bearing infrastructure
  here, not a convenience.

**Neutral**

- New `tsconfig.build.json` (`emitDeclarationOnly`, `moduleResolution: bundler`)
  separate from the typecheck config.
- `@vue/shared`, `vue` and `vue-router` added as devDependencies for nameability.
- Props types were extracted from 7 generic SFCs and exported from 6 message
  components as prerequisite work, clearing the `TS4082` "private name" class of
  declaration errors.

## Revisit triggers

- **Any consumer needs `node16`/`nodenext` type resolution** → re-measure
  flattening, and check whether api-extractor can follow `.vue` specifiers yet.
- **Emitted `.d.ts` count diverges from component count** → a new silent skip has
  landed. This should be a CI assertion (N8N-117), not a discovery.
- **A fifth silent-skip mechanism appears** → hand-declared slots are not
  scaling; consider a lint rule requiring `defineSlots` over `useSlots`
  inference in this package.
- **`vite-plugin-dts` major upgrade** → re-count declarations before believing
  the build.

## Two notes for whoever reads this next

**The comment in `vite.config.mts` contradicts the code.** The block above
`rollupTypes: false` still describes the *flattened* approach ("One flattened
.d.ts per entry… Rolling up hoists those types into the bundle instead"). It is
a leftover from the rejected attempt. Reported on #35108 at filing time; correct
it there rather than editing this record. It is noted here because a stale
comment sitting next to a correct flag is exactly how the next reader rebuilds
the wrong mental model.

**Where the numbers come from.** The emit counts, error counts and gate results
in this record are the implementer's measurements on
`agent/palette/bfb92cbd`, with the external-consumer gate evidenced by
screenshot on N8N-110. The file and line citations were read directly from that
branch. One discrepancy survives in the source reports: the component
denominator is given as 158 early on and the final result as "157/157", so treat
the exact total as ±1 and the mechanisms as the load-bearing content.
