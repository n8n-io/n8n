# @n8n/design-system

## Rules

- **Must** add stories and tests for components in `packages/frontend/@n8n/design-system`.
- **Must** add a comment to each public interface. The comment tells what the interface is for.
- **Must** put the stories and the tests in the component folder, next to the component, for example `N8nButton/Button.stories.ts` and `N8nButton/Button.test.ts`.
- **Must** add i18n translations for all user-facing strings. This includes accessible labels.
- **Must** load the `content-design` skill (`.agents/skills/content-design`) when you write copy.
- **Must** use `--n8n-<component>--<property>` for public CSS variables from components that can be customised by callers (e.g `--n8n-button--background-color`). Internal variables don't require the prefix.

- **Should** add `N8n*` prefix to any publicly available Core components.
- **Should** bind fixed props of a child component from a fixed props object. Add a comment that tells why each prop must stay fixed.
- **Should** declare state that the parent owns as a named prop. Declare the change as `update:<name>` on the emits interface.
- **Should** name the prop for that state. For example, `N8nSettingsEnableRow` uses `enabled`. Callers bind `:enabled` and `@update:enabled`.
- **Should** use `defineModel` only when the component must also work with no parent binding. `N8nSettingsRow` does this for its disclosure state.
- **Should** avoid boolean props where possible (e.g `variant: 'default' | 'solid' | 'outline'` instead of `isDefault, isSolid, isOutline`)
- **Should** use affirmative prop names over inverted ones (e.g `showItems` instead of `hideItems`)

## Component Architecture

### Decouple global state from UI

Keep components pure. They must not know about app logic e.g Pinia stores, APIs, Router, feature flags etc.

Use thin wrapper components that handles state (e.g read from store) and passes data downward to the design system component.

❌ Don't: read app state inside a design system component.

```vue
<script setup lang="ts">
import { useSettingsStore } from '@/app/stores/settings.store';

const settingsStore = useSettingsStore();
</script>

<template>
	<N8nSwitch
		:model-value="settingsStore.isMfaEnforced"
		@update:model-value="settingsStore.setMfaEnforced"
	/>
</template>
```

✅ Do: declare the state as a named prop and emit `update:<name>`. The feature
wrapper connects it to the store.

```vue
<script setup lang="ts">
export interface SettingsEnableRowProps {
	/** Row title. */
	title: string;
	/** Current enabled state. The parent owns this value. */
	enabled: boolean;
}

export interface SettingsEnableRowEmits {
	/** Emitted when the user toggles the switch. */
	'update:enabled': [value: boolean];
}

defineProps<SettingsEnableRowProps>();
const emit = defineEmits<SettingsEnableRowEmits>();
</script>

<template>
	<N8nSettingsRow :title="title">
		<template #action>
			<N8nSwitch :model-value="enabled" @update:model-value="emit('update:enabled', $event)" />
		</template>
	</N8nSettingsRow>
</template>
```

```vue
<!-- Caller in editor-ui -->
<script setup lang="ts">
const settingsStore = useSettingsStore();
</script>

<template>
	<N8nSettingsEnableRow
		:title="i18n.baseText('settings.security.mfa.enforce')"
		:description="i18n.baseText('settings.security.mfa.enforce.description')"
		:enabled="settingsStore.isMfaEnforced"
		@update:enabled="settingsStore.setMfaEnforced"
	/>
</template>
```

When a compound component must share state between its parts, keep that state
inside the root component and share it with `provide`/`inject`.

Keep the `InjectionKey` and its interface in a `*.context.ts` file next to the
component.

```ts
export interface AttachmentGroupContext {
	onRemoveStart: (attachment: HTMLElement) => Promise<void>;
}

export const attachmentGroupContextKey: InjectionKey<AttachmentGroupContext> =
	Symbol('N8nAttachmentGroup');
```

```vue
<script setup lang="ts">
const group = inject(attachmentGroupContextKey, null);

async function onRemove(el: HTMLElement) {
	await group?.onRemoveStart(el);
	emit('remove');
}
</script>
```

- **Do** give `inject` a default (`null` or a fallback) so the child works without the root.
- **Don't** export the context key from the package `index.ts`. It is internal to the compound component.

### Controlled/Uncontrolled

Make state ownership explicit. Support both modes only when callers need them.
Use a named prop and an `update:<name>` event for each value.

Set the controlled Boolean prop's default to `undefined` so an omitted prop
selects uncontrolled mode. Check against `undefined`, not truthiness: `false` is
a valid controlled value.

❌ Don't: leave the optional Boolean prop without an explicit `undefined`
default. Vue casts an omitted `enabled` prop to `false`, so this example never
uses the local value.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
	enabled?: boolean;
	defaultEnabled?: boolean;
}>();

const localEnabled = ref(props.defaultEnabled ?? false);
const enabled = computed(() => props.enabled ?? localEnabled.value);
</script>
```

✅ Do: forward the value and initial value to `N8nSwitch`. It already handles
both modes. This example is a component named `N8nToggleField.vue`.

```vue
<script setup lang="ts">
import N8nSwitch from '../N8nSwitch/Switch.vue';

/** Props for a toggle with optional parent state ownership. */
interface ToggleFieldProps {
	/** Translated label for the switch. */
	label: string;
	/** Parent-owned value. Undefined selects uncontrolled mode. */
	enabled?: boolean;
	/** Initial value in uncontrolled mode. Ignored in controlled mode. */
	defaultEnabled?: boolean;
}

/** Events for requested or local toggle changes. */
interface ToggleFieldEmits {
	/** Emitted when the user requests a value change in either mode. */
	'update:enabled': [value: boolean];
}

const props = withDefaults(defineProps<ToggleFieldProps>(), {
	enabled: undefined,
	defaultEnabled: false,
});
const emit = defineEmits<ToggleFieldEmits>();
</script>

<template>
	<N8nSwitch
		:label="label"
		:model-value="props.enabled"
		:default-value="defaultEnabled"
		@update:model-value="emit('update:enabled', $event)"
	/>
</template>
```

The caller can use either mode. The `label` prop below comes from the caller's
translations. `v-model:enabled` binds `:enabled` and `@update:enabled` together.

```vue
<script setup lang="ts">
import { ref } from 'vue';

import N8nToggleField from './N8nToggleField.vue';

defineProps<{ label: string }>();
const enabled = ref(false);
</script>

<template>
	<!-- Controlled, including when enabled is false. -->
	<N8nToggleField v-model:enabled="enabled" :label="label" />
	<!-- Uncontrolled. The component starts enabled and owns later changes. -->
	<N8nToggleField default-enabled :label="label" />
</template>
```

- **Do** keep the same mode for the lifetime of a component instance. Remount it
  with a new `key` when the caller needs to reset uncontrolled state.
- **Do** test an explicit `false`, parent updates, a parent that does not apply
  an emitted update, uncontrolled changes, and changes to `default*` after mount.
- **Don't** copy the controlled prop into a `ref` and render that copy. It can
  drift from the parent's value.
- **Don't** watch `default*` to keep local state in sync. It is an initial value,
  not a controlled prop.
- **Do** use a Reka primitive's controlled/uncontrolled API when it already
  provides this behavior. Forward that API through wrappers instead of adding
  local state.

### Prefer explicit components with slots over many-mode components

A component with many boolean props for modes is hard to read and hard to
change.

Split the component into small parts and let callers compose them with slots. If a
prop only switches which markup renders, it should probably be a slot or a separate component.

❌ Don't: one component with a flag for each layout part.

```vue
<N8nDialog
	title="Edit profile"
	description="Make changes to your profile."
	show-footer
	show-cancel-button
	confirm-label="Save"
	:confirm-loading="isSaving"
	hide-close-button
	@confirm="save"
/>
```

✅ Do: export the parts and let the caller compose them.

```vue
<N8nDialog v-model:open="isOpen" header="Edit profile">
	<N8nDialogBody>
		<N8nDialogDescription>Make changes to your profile.</N8nDialogDescription>
		<ProfileForm v-model="profile" />
	</N8nDialogBody>
	<N8nDialogFooter>
		<N8nDialogClose as-child>
			<N8nButton variant="outline" :label="i18n.baseText('generic.cancel')" />
		</N8nDialogClose>
		<N8nButton :label="i18n.baseText('generic.save')" :loading="isSaving" @click="save" />
	</N8nDialogFooter>
</N8nDialog>
```

- **Do** export every part from the component `index.ts` (`N8nDialog`, `N8nDialogBody`, `N8nDialogFooter`, ...).
- **Do** type slots with `defineSlots` and add a JSDoc comment to each slot.
- **Do** keep a prop for content that is always plain text (`title`, `description`). Add a slot with the same name when callers need custom markup. `N8nSettingsRow` has a `title` prop and an `info` slot.
- **Don't** add a boolean to hide each optional part. If the caller does not fill the slot, do not render it. Use `$slots.<name>` to check.
- **Don't** let a prop and a slot do the same thing without a documented priority.

### Keep interfaces generic for dependency injection

Props and emits describe what the component needs, not where the data comes from.

Use plain types and callbacks. Do not use feature types such as `IWorkflowDb`, `INodeUi`, or store instances. This lets each caller inject its own data source, and it makes stories and tests easy to write.

❌ Don't: accept a feature model or a service.

```ts
export interface WorkflowPickerProps {
	/** Workflows from the workflows store. */
	workflows: IWorkflowDb[];
	/** API client used to load more. */
	api: WorkflowsApi;
}
```

✅ Do: accept the minimum shape and a generic item type.

```vue
<script setup lang="ts" generic="T extends { id: string; label: string }">
export interface PickerProps<T> {
	/** Items to show. The caller maps its own data to this shape. */
	items: T[];
	/** True while the caller loads more items. */
	loading?: boolean;
}

export interface PickerEmits<T> {
	/** Emitted when the user selects an item. */
	select: [item: T];
	/** Emitted when the list scrolls to the end. The caller loads more items. */
	loadMore: [];
}

export interface PickerSlots<T> {
	/** Custom content for one item. The default shows `item.label`. */
	item(props: { item: T }): unknown;
}

defineProps<PickerProps<T>>();
defineEmits<PickerEmits<T>>();
defineSlots<PickerSlots<T>>();
</script>
```

- **Do** use `generic="T"` when the component passes caller data back through emits or scoped slots. See `N8nContextMenu` and `N8nDropdownMenu`.
- **Do** emit an intent (`loadMore`, `select`) and let the caller do the work. Do not accept an async callback that fetches data.
- **Do** put shared prop, emit, and slot interfaces in `<Component>.types.ts` when other files need them.
- **Don't** import from `editor-ui`, `@n8n/stores`, `@n8n/rest-api-client`, or `n8n-workflow` in the design system.

### Use a base library such as Reka UI where possible

Accessible menus, dialogs, popovers, selects, and radio groups are hard to
build correctly.

Use [Reka UI](https://reka-ui.com) primitives for behavior, focus management, and ARIA. Add n8n styles and a small n8n API on top.

Write your own behavior only when Reka has no primitive. In that case, follow the [W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern.

❌ Don't: rebuild keyboard and focus handling.

```vue
<template>
	<div v-if="open" class="overlay" @click="open = false">
		<div class="dialog" @keydown.esc="open = false">
			<slot />
		</div>
	</div>
</template>
```

✅ Do: wrap the Reka primitive and forward its props.

```vue
<script setup lang="ts">
import { reactivePick } from '@vueuse/core';

import type { RadioGroupProps } from './RadioGroup.types';
import { RadioGroupRoot, useForwardProps } from './reka-ui';

const props = withDefaults(defineProps<Omit<RadioGroupProps, 'modelValue'>>(), {
	orientation: 'vertical',
});
const modelValue = defineModel<RadioGroupProps['modelValue']>();

/** Forward only the Reka props that n8n supports in its public API. */
const rootProps = useForwardProps(reactivePick(props, 'disabled', 'orientation', 'name'));
</script>

<template>
	<RadioGroupRoot v-bind="rootProps" v-model="modelValue" :class="$style.root">
		<slot />
	</RadioGroupRoot>
</template>
```

- **Do** pick the Reka props that you expose. Do not forward the full Reka API. A smaller public API is easier to change later.
- **Do** keep Reka names for shared concepts (`open`, `defaultOpen`, `modelValue`, `asChild`) so callers can use the Reka docs.
- **Do** add a comment when you work around Reka behavior. `N8nRadioGroup` explains why it tracks arrow keys in the capture phase.
- **Don't** expose Reka types in public props when a small n8n type is enough.

## Storybook

- Every story must use one of these title categories:
  - `Style Guide`: styles, tokens, and utilities
  - `Core`: components used across the app
  - `Areas/<Product area>`: patterns and components for a specific product area, for example `Areas/Settings` or `Areas/Assistant`
  - `Experimental`: beta components that require caution
- The last `title` segment is the component name and MUST be PascalCase (`Core/EmptyState`, not `Core/empty-state`). Category prefixes are unrestricted.

## References

- `README.md`, section "Contributing": Guidelines on contributing new components to the design-system
- [W3C-APG](https://www.w3.org/WAI/ARIA/apg/patterns/): Guidelines on proper ARIA implementation
