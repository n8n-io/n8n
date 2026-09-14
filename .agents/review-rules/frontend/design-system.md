# Design system

Applies to: `packages/frontend`.

Stylelint checks the *grammar* of a custom-property name, at warning severity.
Nothing checks that a token exists or is the right one, and `var(--gone)`
resolves to nothing rather than failing. Wrong tokens are the most common
shipped frontend regression in this repo.

Three layers, narrowest first; reaching past the narrowest that fits is the
defect:

1. component-scoped: `--button--*`, `--callout--*`, `--input--*`, `--tag--*`,
   `--node--*`, `--canvas-node--*`, `--sticky--*`
2. semantic: `--background--*`, `--text-color--*`, `--border-color`
3. primitives, in px: `--spacing--` 5xs 2, 4xs 4, 3xs 6, 2xs 8, xs 12, sm 16,
   md 20, lg 24, xl 32, 2xl 48, 3xl 64, 4xl 128, 5xl 256; `--radius--` 4xs 2,
   3xs 4, 2xs 6, xs 8, sm 12, md 16, lg 20, xl 24, 2xl 32, `--radius--full`

Flag, strongest first:

- A `var()` naming a token that no longer exists, e.g. a legacy `--color--*`
  kept through a refactor. It renders as nothing, silently.
- A hard-coded px, rem, hex, `rgb()`, ms or `z-index` literal where a token
  covers it. Name the token.
- A generic token where a component-scoped one exists, e.g. a `--color--*`
  background on an input that has `--input--color--background`.
- A px target stated in the diff or a comment that the chosen token misses.
  The scales share suffixes at different values: `--radius--xs` is 8px,
  `--spacing--xs` is 12px. "Design calls for 8px" beside `--radius--lg` (20px)
  is a real defect.

Soft warning on a plain token swap: ask the intent, since a deliberate change
and a mistake look identical.

Flag a hand-rolled control duplicating an `N8n*` component (icon button,
tooltip, dialog, select), which arrives missing hover, focus and disabled
states, and a NEW direct `element-plus` or `reka-ui` import in `editor-ui`.
No lint rule covers those and many files predate the convention, so judge
only the import being added.

Do NOT comment on Storybook story titles, args, or doc cross-references.
