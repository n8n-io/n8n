---
name: forms
description: >-
  Preview and restyle/theme form-trigger workflows (Form Trigger + Form nodes)
  through the forms tool. Load when the user asks how a form looks, or to
  rebrand, recolor, restyle, theme, or "make prettier / match X" a form, or
  when they just built or are editing a form workflow and appearance is
  relevant. Appearance only (colors, fonts, spacing, themes) — not field or
  logic editing.
recommended_tools:
  - forms
---

# Forms — Appearance & Theming

Use the `forms` tool to preview and restyle the appearance of form-trigger
workflows. This is **appearance only** (colors, fonts, spacing, themes). Field
and logic editing is not supported here yet — for that, point the user to the
form node in the editor.

## When to use

- The user asks how a form **looks**, or wants to preview it.
- The user wants to rebrand / recolor / restyle / theme a form, or "make it
  match our brand", "make it dark", "make it prettier".
- The user just built or is editing a form workflow — proactively offer to
  preview it and to apply a theme. Keep the offer short and only when relevant.

## Actions

- `describe` — read a form node's current theme/appearance (resolved overrides,
  matched preset, attribution) and list the workflow's form nodes. Do this
  before changing a theme.
- `list-appearance-options` — list built-in themes and the editable CSS-variable
  catalog. **Call this before composing a custom theme** so you only use valid
  variable names and values.
- `preview` — render a single form (non-interactive) so the user can see it,
  e.g. before/after a restyle. Optionally pass a `preset` or `overrides` to
  preview a proposed look.
- `apply-theme` — apply a built-in `preset` or a custom `overrides` map to one
  node (`scope: 'node'`) or every form node (`scope: 'workflow'`). Requires
  user confirmation (shows a rendered preview card).

## Apply a built-in theme

1. `forms(describe)` to see the current look and the form nodes.
2. `forms(apply-theme, { preset: 'dark', scope: 'workflow' })` — the user
   approves the preview card, then the theme is written.

## Create a theme from a vague description

For a mood/brand/style request ("calm, minimal, spa-like", "match our green
brand"):

1. `forms(list-appearance-options)` — learn the presets and the CSS-variable
   catalog (each variable has a type, group, default, and description).
2. Compose an `overrides` map from that catalog. You may start from the closest
   preset and adjust.
3. Optionally `forms(preview, { overrides, nodeName })` to check the look.
4. `forms(apply-theme, { overrides, scope })`. If the tool returns validation
   `errors` (unknown variable or wrong value type), fix those values and retry —
   never write junk to the node.
