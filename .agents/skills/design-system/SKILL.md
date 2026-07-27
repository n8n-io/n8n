---
name: n8n:design-system
description: Guidelines on using Design System styles and components. Use when working on .vue files in packages/frontend. Triggers for tasks that include component architecture, styling, UI changes, or feature work.
---

# Design System

Comprehensive guide for building, styling, and using components in the frontend.

## When to Apply
Reference these guidelines when:
- Working on `.{vue|css|scss}` files in `packages/frontend`
- Adding new components to `packages/frontend/@n8n/design-system`
- Refactoring styles for Vue components
- Implementing new UI components or features
- Reviewing changes to UI

## Rules
- Follow guidelines in `packages/frontend/@n8n/design-system/src/styleguide/*.mdx`
- ALWAYS use CSS variables for styles from `packages/frontend/@n8n/design-system/src/css/_tokens.scss` or `packages/frontend/@n8n/design-system/src/css/_primtivies.scss`. Use hard-coded values only when no suitable tokens.
- ALWAYS prefer using existing components from `packages/frontend/@n8n/design-system/src/components`. Prefer components that aren't marked `@deprecated`.
- Use `light-dark()` when alternating colors for ligh/dark mode
- When working with animations or transitions, ALWAYS prefer using mixins from `packages/frontend/@n8n/design-system/src/css/mixins/motion.scss`
- When reviewing animations, follow the guides in `rules/web-animation-guidelines.md`
- When reviewing UI changes or adding new components, follow `rules/web-interface-guidelines.md`

## Examples
- "Add a modal dialog for confirming workflow deletion" → Use `N8nDialog`
- "Add a dropdown to select workflow status" → Use `N8nDropdown` or `N8nSelect`
- "Add button with + icon to add new tiem" → Wrap `N8nButton` with `iconOnly` prop with `N8nTooltip` and wrap in `N8nTooltip`. Use `N8nIcon` and proper aria-label.
- "Add a destructive action button" → use `N8nButton` with `variant="destructive"`
- "Make background color white/black" → Use `var(--background--surface)` for white on light mode and "black" on dark mode
- "Animate the title in gracefully" -> Use `fade-in-up` mixin from `motion.scss` with `var(--duration--base)`
