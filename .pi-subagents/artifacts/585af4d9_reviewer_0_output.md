## Review

Branch `ds-289-component-combobox` vs `master` — new v2 Combobox component + TagsInput `embedded`
mode + input/popover/floating-item mixin extraction.

**Verification performed:** `pnpm typecheck` (design-system) — **fails**; `pnpm vitest run
Combobox.test.ts` — 41/41 pass; empirical DOM probes for the `openOnFocus` and `data-disabled`
behaviors (scratch test, removed after run; working tree left clean). `pnpm lint` could not run in
this checkout — `@n8n/eslint-plugin-design-system` is missing from
`packages/@n8n/eslint-config/node_modules` (broken workspace link, pre-existing environment issue,
not caused by this diff).

- **Correct (verified):** the arrow-key-loop disabled filter (`useComboboxArrowKeyLoop.ts:11`)
  works — disabled options empirically render `data-disabled=""`, matching the reka convention.
Wrap-around tests exist and pass. Sizes extracted into `_input.scss` mixins are value-identical to
the old inline CSS in `Input.vue`. TagsInput `embedded` mode is wired coherently. Test coverage for
the Combobox itself is broad (41 tests: rendering, item types, filtering, clearable, v-model
single/multiple, events, slots).

### Critical (90–100)

**1. Typecheck fails — unused `attrs` and `instance` (confidence 100)**
`packages/frontend/@n8n/design-system/src/v2/components/Combobox/Combobox.vue:59-60`
```
error TS6133: 'attrs' is declared but its value is never read.
error TS6133: 'instance' is declared but its value is never read.
```
Explicit AGENTS.md violation ("Typecheck is critical before committing") and it breaks CI.
**Fix:** delete both lines and the now-unused `useAttrs` / `getCurrentInstance` imports (template
uses `$attrs` directly, which doesn't need `useAttrs`).

**2. `openOnFocus` prop is dead API guarded by a false-positive test (confidence 92)**
- `Combobox.vue:230` hardcodes `:open-on-focus="true"`; `props.openOnFocus` is never read (not in
  the `reactivePick` list at line 65).
- `Combobox.types.ts:12-14` deliberately `Omit`s reka's `openOnFocus` and then re-adds
  `openOnFocus?: boolean` as a public prop.
- `component-combobox.md:54` documents it: "Open dropdown when input receives focus | default:
  `true`".
- `Combobox.test.ts:477` ("should stay closed on focus when openOnFocus is false") passes only
  because `waitFor`'s first synchronous check runs before Vue flushes the open state. **Empirically
confirmed:** with `openOnFocus: false`, the popover *does* open after flush.

The HEAD commit ("make openOnFocus always true") suggests hardcoding is intentional, but the prop,
doc line, and test were left behind — the public API and docs now lie, and the test asserts
behavior that doesn't exist.
**Fix (pick one, per the intent):** (a) remove `openOnFocus` from `ComboboxProps`, the md doc line,
and the false-positive test; or (b) forward it: `:open-on-focus="props.openOnFocus ?? true"` and
rewrite the test to assert after a flush (e.g. `await nextTick()`/timeout before the closed
assertion).

### Important (80–89)

**3. Silent visual regression in N8nDropdownMenu items (confidence 85)**
`packages/frontend/@n8n/design-system/src/components/N8nDropdownMenu/DropdownMenuItem.vue:395` +
`src/css/mixins/_floating-item.scss:8-9`
`.item` previously had `font-size: var(--font-size--2xs)` (12px) and `line-height: 1`; the shared
`floating-item` mixin now applies `--font-size--sm` (14px) and `--line-height--sm` (1.25).
`.item-label` inherits, so every dropdown menu item across the app grows two size steps. The commit
("Removed sizes from combobox items") only mentions combobox — nothing indicates this
cross-component change was intended, and it's outside the branch's stated scope (DS-289 combobox).
**Fix:** parameterize the mixin (`@mixin floating-item($font-size: var(--font-size--sm),
$line-height: var(--line-height--sm))`) and pass `--font-size--2xs`/`1` from
`DropdownMenuItem.vue`, or re-declare `font-size`/`line-height` after the `@include`. If the size
unification *is* intended, it should be stated in the PR and visually reviewed.

**4. Duplicate `@forward 'input';` (confidence 85)**
`packages/frontend/@n8n/design-system/src/css/mixins/index.scss:6` and `:8` — the diff adds a
second `@forward 'input';` (alphabetical insert) without removing the pre-existing one two lines
below. Harmless in Dart Sass but clear diff noise/slop.
**Fix:** delete line 8.

### Notes (below threshold, no action required)

- `Combobox.vue:62` — `const slots = defineSlots<...>()` return value is also unused (template uses
  `$slots`); vue-tsc doesn't flag it, but drop the assignment while fixing issue 1.
- `ComboboxItem.vue:23` — `:data-disabled="props.disabled || undefined"` is redundant (reka's
  `ListboxItem` already emits `data-disabled=""`); empirically harmless today, but if it ever won
the merge it would break reka's disabled-skip navigation (which filters on `dataset.disabled !==
''`). Safer to remove.
- `Combobox.vue:122` — `value: get(item, props.valueKey) ?? ''` maps a missing value to `''`, which
  reka's `ComboboxItem` rejects with a thrown Error; only reachable through untyped/misconfigured
items.
- The `ComboboxTrigger` icon button inherits reka's untranslated default `aria-label="Show popup"`.
- Lint must be verified once the workspace link for `@n8n/eslint-plugin-design-system` is repaired
  — I could not rule out lint findings.

Regarding "pass review to sub-agent": I'm a delegated review subagent and don't launch further
subagents; the parent session owns that fanout. This report is the completed second-pass review.