---
name: n8n:design-system
description: >-
  Guidelines on using Design System styles and components. Use when working on
  .vue files in packages/frontend, authoring or reviewing design-system v2 /
  Reka UI components, or for component architecture, styling, UI changes, or
  feature work.
---

# Design System

Comprehensive guide for building, styling, and using components in the frontend.

## When to Apply

Reference these guidelines when:
- Working on `.{vue|css|scss}` files in `packages/frontend`
- Adding new components to `packages/frontend/@n8n/design-system`
- Authoring or reviewing **v2** components under `src/v2` (wrapping Reka UI)
- Refactoring styles for Vue components
- Implementing new UI components or features
- Reviewing changes to UI

## Rules

High-churn reminders (agents often skip these when they only live in AGENTS.md):

- **No type assertions** — Never use `as` or non-null `!`. Use type guards / predicates
  instead (tests may use `as`).
- **Test IDs** — Add `data-test-id` (not `data-testid`) on every interactive element and
  key structural node. Single value only; no spaces.
- **i18n** — Every user-facing string — including `aria-label`, titles, and placeholders —
  must go through i18n / locale files. For copy wording, follow
  [n8n:content-design](../content-design/SKILL.md).

General:

- Follow guidelines in `packages/frontend/@n8n/design-system/src/styleguide/*.mdx`
- ALWAYS use CSS variables for styles from `packages/frontend/@n8n/design-system/src/css/_tokens.scss` or `packages/frontend/@n8n/design-system/src/css/_primitives.scss`. Use hard-coded values only when no suitable tokens.
- ALWAYS prefer using existing components from `packages/frontend/@n8n/design-system/src/components`. Prefer components that aren't marked `@deprecated`.
- Use `light-dark()` when alternating colors for light/dark mode
- When working with animations or transitions **outside v2**, ALWAYS prefer using mixins from `packages/frontend/@n8n/design-system/src/css/mixins/motion.scss`
- When reviewing animations, follow the guides in `rules/web-animation-guidelines.md`
- When reviewing UI changes or adding new components, follow `rules/web-interface-guidelines.md`

## v2 component conventions

Strict conventions for Vue SFCs under
`packages/frontend/@n8n/design-system/src/v2`. **Tree is the canonical
reference** — mirror its patterns; do not invent alternate structures, prop
handling, or composition styles.

Canonical implementation:
`packages/frontend/@n8n/design-system/src/v2/components/Tree/`

### Props, types & API

- **Root props** — Spread root props the way Tree does (`v-bind` of forwarded /
  omitted attrs). Never attach each root prop one-by-one.
- **Third-party types** — Extend types exported by Reka UI (or the headless
  library). Never redefine or duplicate those types locally.
- **Controlled / uncontrolled** — Stateful values must support both modes:
  controlled via `modelValue` + `update:modelValue` (`v-model`), uncontrolled
  via `defaultValue` (and matching pairs like `expanded` /
  `defaultExpanded` when needed). Prefer Reka’s built-in dual API when wrapping
  Reka; otherwise mirror Tree / RadioGroup. Document both props in the
  component spec.
- **Size prop** — Default size value must be named `'default'`. Options look like
  `'small' | 'default' | 'medium'` (etc.). Never treat another size (e.g.
  `'medium'`) as the implicit default.
- **State modifiers** — SMACSS state naming (`isDisabled`, `isActive`, `isOpen`).
- **Computed** — Avoid `computed` unless there is clear, non-trivial value
  (expensive derivation reused in multiple places). Prefer inline expressions or
  simple methods.
- **Shared utils** — Prefer helpers from `@n8n/utils` over reimplementing
  common logic locally.

### Composition & slots

- **Prefer slots for customization** — Expose visual/content areas as named
  slots (with typed scope props via `defineSlots`) rather than prop-driven
  render options or hardcoded layouts. Follow Tree: a `#default` slot for a
  fully custom row/item, plus focused named slots (`#icon`, `#label`,
  `#toggle`, etc.) that forward through the component hierarchy into the
  default renderer. Provide a sensible default slot fallback so the component
  works out of the box without consumers supplying slot content. See
  `Tree.vue` → `TreeNode.vue` → `TreeNodeDefault.vue`.

### Stories

- **Controlled / uncontrolled stories** — Add a Storybook story that demos both
  modes side-by-side (see `RadioGroup.stories.ts` → `ControlledUncontrolled`).
  Controlled: parent `v-model` plus a way to set the value externally.
  Uncontrolled: `defaultValue` only, parent does not track changes.

### Markup & accessibility

- Prefer the exact ARIA / keyboard patterns already present in Tree.
- Apply the high-churn reminders above (`data-test-id`, no `as` / `!`, i18n).

### Styling (v2-specific)

- **No `:global`** — Do not use `:global(...)` in component CSS. Keep styles
  scoped to the component (CSS modules / scoped selectors). Style child parts
  via component classes, slots, or props — not by piercing into other
  components’ markup.
- **CSS hygiene** — Do not restate rules already provided by base styles (e.g.
  `box-sizing: border-box`, `font-family: inherit`, `color: inherit`, `margin: 0`).
- **Focus styles** — Use shared focus styles from `_focus.scss`. Do not invent
  custom focus outlines or rings.
- **No transitions** — Do not use Vue `<Transition>`, `<TransitionGroup>`, or CSS
  transitions/animations in v2 components.

### Review checklist (v2)

- [ ] Patterns match Tree (structure, prop forwarding, composition, a11y)
- [ ] Customization via slots (typed `defineSlots`, default fallback, forwarding
      like Tree) rather than prop-only render APIs
- [ ] Shared logic reused from `@n8n/utils` when available
- [ ] Root props spread; third-party types extended, not duplicated
- [ ] Stateful values support controlled (`modelValue`) and uncontrolled
      (`defaultValue`); Storybook has a Controlled/Uncontrolled story
- [ ] Size default is `'default'`; state modifiers use SMACSS `is*` names
- [ ] No `as` / `!`; `computed` only when justified
- [ ] `data-test-id` on interactive/key nodes; user-facing strings internationalised
- [ ] No `:global`; no redundant base CSS; shared focus styles; no transitions

## Examples

- "Add a modal dialog for confirming workflow deletion" → Use `N8nDialog`
- "Add a dropdown to select workflow status" → Use `N8nDropdown` or `N8nSelect`
- "Add button with + icon to add new item" → Wrap `N8nButton` with `iconOnly` prop with `N8nTooltip` and wrap in `N8nTooltip`. Use `N8nIcon` and proper aria-label.
- "Add a destructive action button" → use `N8nButton` with `variant="destructive"`
- "Make background color white/black" → Use `var(--background--surface)` for white on light mode and "black" on dark mode
- "Animate the title in gracefully" → Use `fade-in-up` mixin from `motion.scss` with `var(--duration--base)`
