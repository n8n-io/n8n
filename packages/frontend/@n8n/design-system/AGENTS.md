# @n8n/design-system

## Rules

- Always use `n8n:ui-design` skill when building or refactoring components
- Always add stories for new components to `packages/frontend/@n8n/design-system`.
- Always add comments to the public interfaces, with comments explaining what each one is for
- Always add a `.test.ts` file with relevant tests for each component
- Put the stories and the tests in the component folder, next to the component, for example `N8nButton/Button.stories.ts` and `N8nButton/Button.test.ts`
- Always add i18n translations for user-facing strings, including accessible labels
- Always use `n8n:content-design` skill for copy wording
- Prefer to bind fixed child component props from a fixed props object. Add comment that explain why each prop must remain fixed.
- Declare state that the parent owns as a named prop. Declare the change as `update:<name>` on the emits interface.
- Name the prop for that state. `N8nSettingsEnableRow` uses `enabled`. Callers bind `:enabled` and `@update:enabled`.
- A new component that stores a value the user can change must support controlled mode and uncontrolled mode. Follow the section below.

### Controlled and uncontrolled state

Support both modes in every new component that stores a value the user can change. `N8nPagination` is the reference for local state. `N8nInputNumber` forwards the same pair of props to a Reka UI primitive. The `n8n:ui-design` skill repeats this pattern.

- Controlled mode: the parent passes the value prop. Render that prop. Emit `update:<name>`. Keep the stored value in the parent.
- Uncontrolled mode: the parent omits the value prop. Store the value in the component. The `default*` prop sets the first value. A later change to the `default*` prop does not reset the stored value.
- Treat the value prop as omitted only when it is `undefined`. The values `0`, `false`, and `''` stay controlled.
- Do not give the value prop a default in `withDefaults`. A default makes the prop defined, so uncontrolled mode never runs. Put the fallback on the `default*` prop.
- A passed value prop replaces the `default*` prop.
- Emit the change in both modes.
- Name the value `modelValue` and the first value `defaultValue` when callers bind `v-model`.
- For other state, name the prop for that state. Name the first value with a `default` prefix. `N8nPagination` uses `page` with `defaultPage`, and `itemsPerPage` with `defaultItemsPerPage`.
- Forward `modelValue` and `defaultValue` when the underlying primitive already accepts them.
- Use `defineModel` when the first value is fixed and the caller does not pass a `default*` prop. `N8nSettingsRow` does this for its disclosure state.
- Cover both modes in the component test and in Storybook.

Copy this shape when the component owns the value:

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

### Storybook Stories

- Every story must use one of these title categories:
  - `Style Guide`: styles, tokens, and utilities
  - `Core`: components used across the app
  - `Areas/<Product area>`: patterns and components for a specific product area, for example `Areas/Settings` or `Areas/Assistant`
  - `Experimental`: beta components that require caution
- The last `title` segment is the component name and MUST be PascalCase (`Core/EmptyState`, not `Core/empty-state`). Category prefixes are unrestricted.

## References

- `README.md`, section "Contributing": Guidelines on contributing new components to the design-system
- [W3C-APG](https://www.w3.org/WAI/ARIA/apg/patterns/): Guidelines on proper ARIA implementation
