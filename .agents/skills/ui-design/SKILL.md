---
name: n8n:ui-design
description: Guidelines on designing and building UI. Use when working in editor-ui or design-system packages. Triggers for tasks that include refactoring components, styling changes, or feature work.
---

# UI Design

Comprehensive guide for building, styling, and using components in the frontend.

## References
- When styling components, use `packages/frontend/@n8n/design-system/src/styleguide/*.mdx`
- For animations, use `rules/web-animation-guidelines.md`
- When reviewing UI changes, use `rules/web-interface-guidelines.md`

## Best practices
- ALWAYS use CSS variables from `_tokens.scss` or `_primitives.scss` in
  `packages/frontend/@n8n/design-system/src/css/`. Look up every length, color,
  font-size and duration before you write it as a literal. Each spacing token
  carries its px value in a comment: `--spacing--5xs: 0.125rem; /** 2px **/`.
  Grep that comment to find the token for a px value. The grep gives one hit for
  each token family, so pick the family that matches the property: `--spacing--*`
  for margin and padding, `--radius--*` for border-radius, `--height--*` for
  height. The styleguide
  `packages/frontend/@n8n/design-system/src/styleguide/spacing-size.mdx` lists the
  same scale as a table. The spacing scale starts at 2px, so a small value is not
  a reason to hardcode. Hardcode only if the lookup finds no token. Give the
  reason in a comment.
- ALWAYS prefer using existing components from `packages/frontend/@n8n/design-system/src/components`. Prefer components that aren't marked `@deprecated`.
- If you need to add hover/active alpha behavior to solid components, prefer `color-mix()` with explicit percentages.
- When working with animations or transitions, ALWAYS prefer using mixins from `packages/frontend/@n8n/design-system/src/css/mixins/motion.scss`

## Components
Use existing `design-system` components over creating custom implementations:
- "Add a modal dialog for confirming workflow deletion" → Use `N8nDialog`
- "Add a dropdown to select workflow status" → Use `N8nDropdown` or `N8nSelect`
- "Add button with + icon to add new tiem" → Wrap `N8nButton` with `iconOnly` prop with `N8nTooltip` and wrap in `N8nTooltip`. Use `N8nIcon` and proper aria-label.
- "Add a destructive action button" → use `N8nButton` with `variant="destructive"`
- "Make background color white/black" → Use `var(--background--surface)` for white on light mode and "black" on dark mode
- "Animate the title in gracefully" -> Use `fade-in-up` mixin from `motion.scss` with `var(--duration--base)`
