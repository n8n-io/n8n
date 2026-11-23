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

## New design-system components

A new component in `@n8n/design-system` that stores a value the user can change must support controlled mode and uncontrolled mode. The same rule is in `packages/frontend/@n8n/design-system/AGENTS.md`.

- Controlled mode: the parent passes the value prop. Render that prop. Emit the change. Keep the stored value in the parent.
- Uncontrolled mode: the parent omits the value prop. Store the value in the component. The `default*` prop sets the first value. A later change to the `default*` prop does not reset the stored value.
- Treat the value prop as omitted only when it is `undefined`. The values `0`, `false`, and `''` stay controlled.
- Do not give the value prop a default in `withDefaults`. A default makes the prop defined, so uncontrolled mode never runs. Put the fallback on the `default*` prop.
- A passed value prop replaces the `default*` prop.
- Emit the change in both modes.
- Name the value `modelValue` and the first value `defaultValue` when callers bind `v-model`.
- For other state, name the prop for that state. Name the first value with a `default` prefix. `N8nPagination` uses `page` with `defaultPage`, and `itemsPerPage` with `defaultItemsPerPage`.
- Forward `modelValue` and `defaultValue` when a Reka UI primitive already accepts them. `N8nInputNumber` does this.
- Use `defineModel` when the first value is fixed and the caller does not pass a `default*` prop. `N8nSettingsRow` does this for its disclosure state.
- Cover both modes in the component test and in Storybook.

`N8nPagination` is the reference when the component owns the value. Copy this shape:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
	/** The value when the parent owns it. Omit it and the component keeps the value. */
	modelValue?: string;
	/** The first value when the parent omits `modelValue`. */
	defaultValue?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

// Read on the first render only. Later changes to `defaultValue` do not reset it.
const uncontrolledValue = ref(props.defaultValue);

// `undefined` means the parent omitted the prop.
const value = computed(() =>
	props.modelValue !== undefined ? props.modelValue : uncontrolledValue.value,
);

function setValue(next: string) {
	if (props.modelValue === undefined) {
		uncontrolledValue.value = next;
	}
	emit('update:modelValue', next);
}
</script>
```

Bind one mode at the call site:

```vue
<!-- The parent owns the value. -->
<N8nExample v-model="value" />

<!-- The component owns the value. -->
<N8nExample default-value="inbox" />
```

## Components
Use existing `design-system` components over creating custom implementations:
- "Add an enable or disable switch on a settings page" → Use `N8nSettingsEnableRow`. Place it in an `N8nSettingsRowGroup`, alone or with other rows. It does not have to sit at the top of the page. `title` and `description` are required. Bind `:enabled` and `@update:enabled`. The parent owns the value. The control is always a small switch, the same size as the other switches on settings screens. Set `showPreviewBadge` or `showEnterpriseReadinessBadge` to show those badges beside the title. Use `N8nSettingsRow` when the action is not a switch.
- "Add a modal dialog for confirming workflow deletion" → Use `N8nDialog`
- "Add a dropdown to select workflow status" → Use `N8nDropdown` or `N8nSelect`
- "Add button with + icon to add new tiem" → Wrap `N8nButton` with `iconOnly` prop with `N8nTooltip` and wrap in `N8nTooltip`. Use `N8nIcon` and proper aria-label.
- "Add a destructive action button" → use `N8nButton` with `variant="destructive"`
- "Make background color white/black" → Use `var(--background--surface)` for white on light mode and "black" on dark mode
- "Animate the title in gracefully" -> Use `fade-in-up` mixin from `motion.scss` with `var(--duration--base)`
