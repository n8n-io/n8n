---
name: n8n:vue-component-conventions
description: >-
  Generate or review Vue single-file components that follow design-system v2
  conventions. Use when authoring or reviewing components under
  packages/frontend/@n8n/design-system/src/v2, building on Reka UI, or when the
  user asks for Vue SFC structure, props API, a11y, test IDs, or styling that
  should match Tree.
---

# Vue component conventions

Strict conventions for Vue SFCs in design-system v2. **Tree is the canonical
reference** — mirror its patterns; do not invent alternate structures, prop
handling, or composition styles.

Canonical implementation:
`packages/frontend/@n8n/design-system/src/v2/components/Tree/`

For token/component reuse and styleguide docs, also follow
[n8n:design-system](../design-system/SKILL.md). For user-facing copy, follow
[n8n:content-design](../content-design/SKILL.md).

## When to apply

- Adding or changing components under `packages/frontend/@n8n/design-system/src/v2`
- Wrapping Reka UI (or another headless library) with n8n styling
- Reviewing Vue SFC API, markup, a11y, or styles against v2 conventions

## Rules

### General

- **Comments** — Only for complex business logic or non-obvious intent.
- **Shared utils** — Prefer helpers from `packages/@n8n/utils/src/` (via
  `@n8n/utils`) over reimplementing common logic locally.

### Props, types & API

- **Root props** — Spread root props the way Tree does (`v-bind` of forwarded /
  omitted attrs). Never attach each root prop one-by-one.
- **Third-party types** — Extend types exported by Reka UI (or the headless
  library). Never redefine or duplicate those types locally.
- **Size prop** — Default size value must be named `'default'`. Options look like
  `'small' | 'default' | 'medium'` (etc.). Never treat another size (e.g.
  `'medium'`) as the implicit default.
- **State modifiers** — SMACSS state naming (`isDisabled`, `isActive`, `isOpen`).
- **Typing** — No type assertions (`as`, non-null `!`). Use type guards.
- **Computed** — Avoid `computed` unless there is clear, non-trivial value
  (expensive derivation reused in multiple places). Prefer inline expressions or
  simple methods.

### Markup & accessibility

- **Accessibility** — Set required ARIA attributes, roles, states, and keyboard
  support. Prefer the exact patterns already present in Tree.
- **Test IDs** — Add `data-test-id` on every interactive element and key
  structural node.
- **i18n** — Every user-facing string — including `aria-label`, titles, and
  placeholders — must be internationalised and stored in a locale file.

### Styling

- **Design tokens only** — Use tokens from `_primitives.scss` and `_tokens.scss`.
  Hard-coded colours, spacing, radii, font sizes, shadows, etc. are forbidden.
- **CSS hygiene** — Do not restate rules already provided by base styles (e.g.
  `box-sizing: border-box`, `font-family: inherit`, `color: inherit`, `margin: 0`).
- **Focus styles** — Use shared focus styles from `_focus.scss`. Do not invent
  custom focus outlines or rings.
- **No transitions** — Do not use Vue `<Transition>`, `<TransitionGroup>`, or CSS
  transitions/animations.

## Review checklist

- [ ] Patterns match Tree (structure, prop forwarding, composition)
- [ ] Shared logic reused from `@n8n/utils` when available
- [ ] Root props spread; third-party types extended, not duplicated
- [ ] Size default is `'default'`; state modifiers use SMACSS `is*` names
- [ ] No `as` / `!`; `computed` only when justified
- [ ] ARIA + keyboard support verified; `data-test-id` on interactive/key nodes
- [ ] User-facing strings internationalised
- [ ] Tokens only; no redundant base CSS; shared focus styles; no transitions
