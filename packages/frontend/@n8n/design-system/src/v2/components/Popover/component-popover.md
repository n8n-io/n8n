# Component specification

Displays floating content anchored to a trigger element. Popovers are used for dropdown menus, form overlays, and contextual actions that require more space than a tooltip.

- **Component Name:** N8nPopover
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=252-3284&m=dev)
- **Element+ Component:** [ElPopover](https://element-plus.org/en-US/component/popover.html)
- **Reka UI Component:** [Popover](https://reka-ui.com/docs/components/popover)
- **Nuxt UI Component:** [Popover](https://ui.nuxt.com/docs/components/popover)

## Public API Definition

**Props**

- `visible?: boolean` - Controlled visibility state. Supports two-way binding via `v-model:visible`.
- `trigger?: 'click' | 'hover'` - How to trigger the popover. Default: `'click'`
- `placement?: Placement` - Position of popover relative to trigger. Values: `'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'`. Default: `'bottom'`
- `width?: string | number` - Popover width. Can be a number (pixels) or string (e.g., `'auto'`, `'304px'`).
- `contentClass?: string` - Custom CSS class name for the popover content element.
- `contentStyle?: CSSProperties` - Inline styles object for the popover content element.
- `teleported?: boolean` - Whether to append the popover to the body element. Default: `true`
- `showArrow?: boolean` - Whether to show the arrow pointing to the trigger. Default: `true`
- `offset?: number` - Offset of the popover from the trigger element (in pixels).

**Events**

- `update:visible` - Emitted when visibility changes. Payload: `boolean`. Used with `v-model:visible`.
- `before-enter` - Emitted before the popover enter animation starts.
- `after-leave` - Emitted after the popover leave animation completes.

**Slots**

- `reference` - The trigger element that activates the popover (required).
- `default` - The popover content. Receives `{ close: () => void }` scope for programmatic closing.

### Template usage example

**Basic click popover:**

```vue
<script setup lang="ts">
import { N8nPopover, N8nButton } from '@n8n/design-system'
</script>

<template>
  <N8nPopover trigger="click" placement="bottom" width="200">
    <template #reference>
      <N8nButton label="Open menu" />
    </template>
    <div class="menu-content">
      <p>Popover content here</p>
    </div>
  </N8nPopover>
</template>
```

**Controlled visibility with v-model:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nPopover, N8nButton } from '@n8n/design-system'

const isOpen = ref(false)
</script>

<template>
  <N8nPopover
    v-model:visible="isOpen"
    trigger="click"
    placement="top"
    :width="304"
  >
    <template #reference>
      <N8nButton label="Toggle popover" />
    </template>
    <div class="popover-content">
      <p>Controlled popover content</p>
      <N8nButton label="Close" @click="isOpen = false" />
    </div>
  </N8nPopover>
</template>
```

**With custom styling:**

```vue
<script setup lang="ts">
import { N8nPopover, N8nIconButton } from '@n8n/design-system'
</script>

<template>
  <N8nPopover
    trigger="click"
    placement="top"
    content-class="custom-popover"
    :content-style="{ padding: 'var(--spacing-xs)' }"
    :width="208"
  >
    <template #reference>
      <N8nIconButton icon="palette" />
    </template>
    <div class="color-picker">
      <!-- Color picker content -->
    </div>
  </N8nPopover>
</template>
```

**Without arrow and with offset:**

```vue
<script setup lang="ts">
import { N8nPopover } from '@n8n/design-system'
</script>

<template>
  <N8nPopover
    trigger="click"
    placement="right-start"
    :show-arrow="false"
    :offset="2"
    width="auto"
  >
    <template #reference>
      <span class="submenu-trigger">Options</span>
    </template>
    <ul class="submenu-options">
      <li>Option 1</li>
      <li>Option 2</li>
    </ul>
  </N8nPopover>
</template>
```

**Non-teleported (stays in DOM hierarchy):**

```vue
<script setup lang="ts">
import { N8nPopover } from '@n8n/design-system'
</script>

<template>
  <div class="dropdown-container">
    <N8nPopover
      trigger="click"
      placement="bottom"
      :teleported="false"
      :width="300"
    >
      <template #reference>
        <input type="text" placeholder="Search..." />
      </template>
      <div class="search-results">
        <!-- Results rendered in same DOM context -->
      </div>
    </N8nPopover>
  </div>
</template>
```

**Using close function from slot scope:**

```vue
<script setup lang="ts">
import { N8nPopover, N8nButton } from '@n8n/design-system'

const handleAction = () => {
  // Do something
}
</script>

<template>
  <N8nPopover trigger="click" placement="bottom" :width="250">
    <template #reference>
      <N8nButton label="Actions" />
    </template>
    <template #default="{ close }">
      <div class="action-menu">
        <button @click="handleAction(); close()">
          Perform action and close
        </button>
      </div>
    </template>
  </N8nPopover>
</template>
```

**With animation lifecycle events:**

```vue
<script setup lang="ts">
import { N8nPopover } from '@n8n/design-system'

const onBeforeEnter = () => {
  console.log('Popover is about to appear')
}

const onAfterLeave = () => {
  console.log('Popover has fully closed')
}
</script>

<template>
  <N8nPopover
    trigger="click"
    placement="top"
    @before-enter="onBeforeEnter"
    @after-leave="onAfterLeave"
  >
    <template #reference>
      <span>Click me</span>
    </template>
    <div>Animated popover</div>
  </N8nPopover>
</template>
```
