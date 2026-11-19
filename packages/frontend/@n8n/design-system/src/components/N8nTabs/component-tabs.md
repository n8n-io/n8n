# Component specification

A tab bar for switching between views. Use it to select one view from a set of related views. The component can render the panel content, or the caller can show and hide the content.

Built on Reka UI `Tabs`. `TabsRoot` holds the selected value, orientation, roving focus, and ids. `TabsContent` is optional. Callers that control their own content do not need it.

- **Component Name:** N8nTabs
- **Reka UI Component:** [Tabs](https://reka-ui.com/docs/components/tabs)


## Public API Definition

**Props**

- `modelValue?: Value` - The selected tab value. Bind with `v-model`
- `options?: Array<TabOptions<Value>>` - Tabs to render. See `TabOptions` below | `default: []`
- `size?: 'small' | 'medium' | 'large'` - Tab size | `default: 'medium'`
- `justified?: boolean` - Spreads the tabs over the full width in equal slots. Every tab stays in place when a label changes width. Long labels are truncated | `default: false`
- `orientation?: 'horizontal' | 'vertical'` - Layout of the tab list. Also sets the arrow keys for keyboard navigation | `default: 'horizontal'`


**Events**

- `update:modelValue(value: Value)` - Fired when the user selects a tab
- `tooltipClick(value: Value, e: MouseEvent)` - Fired when the user clicks inside the tooltip of a tab


**Slots**

- `default` - Rendered inside `TabsRoot`, after the tab list, with no wrapper. Use it to keep caller-controlled show and hide logic. It can also contain `N8nTabsContent` panels
- `content`: `{ value: Value }` - Rendered inside a `TabsContent` for the selected tab. Use it to get full panel accessibility wiring with no extra markup


**Types**

```typescript
/** packages/frontend/@n8n/design-system/src/types/tabs.ts */
interface TabOptions<Value extends string | number> {
  value: Value;
  label: string;
  icon?: IconName | (string & {});
  iconPosition?: 'left' | 'right';
  /** Colors only the icon, for example `danger` to flag a problem. */
  iconColor?: IconColor;
  disabled?: boolean;
  tooltip?: string;
  align?: 'left' | 'right';
  to?: RouteLocationRaw;
  notification?: boolean;
  tag?: string;
  preview?: boolean;
}

interface TabsProps<Value extends string | number = string | number> {
  modelValue?: Value;
  /** Base generic. Callers can narrow `Value` outside the component. */
  options?: Array<TabOptions<Value>>;
  /** These sizes should align with UI sizes in Select/Input etc */
  size?: 'small' | 'medium' | 'large';  
  /**
   * Spread the tabs over the full width in equal slots. Keeps every tab in
   * place when a label changes width, at the cost of truncating long ones.
   */
  justified?: boolean;
  /** Determines the layout. Default horizontal. */
  orientation?: 'horizontal' | 'vertical';
}
```

`N8nTabs` is generic over `Value extends string | number`. Vue infers `Value` from `modelValue` and `options`. `update:modelValue` and the `content` slot use the narrowed type.


## Structure

```vue
<!-- N8nTabs.vue -->
<TabsRoot
  :model-value="modelValue"
  :orientation="orientation"  
  @update:model-value="emit('update:modelValue', $event)"
>
  <div :class="['n8n-tabs', $style.tabsContainer]">
    <!-- scroll buttons + TabsList + TabsTriggers -->
  </div>

  <TabsContent v-if="$slots.content && modelValue !== undefined" :value="modelValue">
    <slot name="content" :value="modelValue" />
  </TabsContent>

  <slot />
</TabsRoot>
```

- `TabsRoot` has no styles. The tab bar styles stay on `tabsContainer`.
- The scroll buttons stay outside `TabsList`, so arrow-key navigation does not stop on them.
- The order of the slots is: tab bar, `content` slot, default slot.


## Notes

- **Model name.** The prop is `modelValue`, so `v-model` works with no argument. Bind `TabsRoot` with `:model-value` and `@update:model-value`. Do not use `:v-model` or a different event name.
- **Backward compatibility.** With no slots, `N8nTabs` works the same as before. Existing callers do not need changes.
- **Dangling `aria-controls`.** Each `TabsTrigger` sets `aria-controls` to the id of its panel. Content in the default slot that has no `N8nTabsContent` wrapper leaves this id without a target. To fix this, wrap panels in `N8nTabsContent` or use the `content` slot.
- **Route options (`to`).** These options render in `TabsList` as `TabsTrigger` with `as` set to `RouterLink`. They keep their order, style, and arrow-key focus like other tabs. A click goes to the route, and the component does not emit `update:modelValue`. The consumer sets `modelValue` from the current route. A disabled route option renders as a disabled button.
- **Disabled tabs.** Pass `disabled` to `TabsTrigger`. Disabled `to` options render as inert tabs and do not navigate.
- **External links.** Tabs do not support external links. Put them in the `suffix` slot. The call site owns the link markup and its click handling.
- **Tooltips.** `N8nTooltip` wraps the trigger through `as-child`, so focus and hover reach the trigger.
- **Active state styles.** Use `[data-state='active']` and `[data-disabled]` from Reka. Do not use custom active classes.
- **Overflow scroll.** `TabsList` is a component ref. Use `$el` for the `ResizeObserver` and scroll logic. When roving focus moves to a tab outside the visible area, scroll that tab into view.
- **Layout change for migrated callers.** Callers that move content into a slot get `TabsRoot` as the new parent. Some callers need CSS changes for flex or grid layouts.
- **Test ids.** Each tab keeps `id="${value}"` and `data-test-id="tab-${value}"`.
- **Primitives.** `N8nTabsRoot`, `N8nTabsList`, `N8nTabsTrigger`, and `N8nTabsContent` stay exported for layouts that `N8nTabs` cannot express.


### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('general')
</script>

<template>
  <!-- Tab bar only. The caller shows and hides content outside the component. -->
  <N8nTabs
    v-model="tab"
    :options="[
      { label: 'General', value: 'general' },
      { label: 'Advanced', value: 'advanced' },
    ]"
  />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('general')
</script>

<template>
  <!-- Existing call site, moved into the default slot -->
  <N8nTabs v-model="tab" :options="options">
    <GeneralPanel v-if="tab === 'general'" />
    <AdvancedPanel v-else />
  </N8nTabs>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('general')
</script>

<template>
  <!-- Opt in to panel wiring. The default slot is inside TabsRoot. -->
  <N8nTabs v-model="tab" :options="options">
    <N8nTabsContent value="general"><GeneralPanel /></N8nTabsContent>
    <N8nTabsContent value="advanced"><AdvancedPanel /></N8nTabsContent>
  </N8nTabs>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { TabOptions } from '@n8n/design-system'

type SettingsTab = 'general' | 'advanced'

const tab = ref<SettingsTab>('general')
const options: Array<TabOptions<SettingsTab>> = [
  { label: 'General', value: 'general' },
  { label: 'Advanced', value: 'advanced' },
]
</script>

<template>
  <!-- Content slot. `value` has the type SettingsTab. -->
  <N8nTabs v-model="tab" :options="options" orientation="vertical">
    <template #content="{ value }">
      <GeneralPanel v-if="value === 'general'" />
      <AdvancedPanel v-else />
    </template>
  </N8nTabs>
</template>
```
