# Component specification

Displays contextual information when users hover over or focus on an element. Tooltips help users understand the purpose or state of UI elements without cluttering the interface.

- **Component Name:** N8nTooltip
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?node-id=252-3284&m=dev)
- **Reka UI Component:** [Tooltip](https://reka-ui.com/docs/components/tooltip)
- **Nuxt UI Component:** [Tooltip](https://ui.nuxt.com/docs/components/tooltip)


## Public API Definition

**Props**

- `content?: string` - Text content for the tooltip. Supports HTML (sanitized for security).
- `placement?: Placement` - Position of tooltip relative to trigger. Values: `'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'`. Default: `'top'`
- `disabled?: boolean` - When `true`, prevents the tooltip from showing.
- `showAfter?: number` - Delay in milliseconds before showing tooltip after trigger is hovered. Default: `0`
- `visible?: boolean` - Manual control of tooltip visibility (programmatic show/hide).
- `enterable?: boolean` - Whether the mouse can enter the tooltip content area. Default: `true`
- `teleported?: boolean` - Whether to append the tooltip to the body. Default: `true`
- `offset?: number` - Offset of the tooltip from the trigger element (in pixels). Default: `6`
- `buttons?: IN8nButton[]` - Array of action buttons to render below tooltip content.
- `justifyButtons?: Justify` - Flex justify-content for buttons container. Default: `'flex-end'`
- `avoidCollisions?: boolean` - Whether to avoid collisions with viewport boundaries (flip/shift). Default: `true`
- `contentClass?: string` - Additional CSS class for the tooltip content.

**Slots**

- `default` - The trigger element that activates the tooltip (required).
- `content` - Custom content for the tooltip body. When not provided, renders `content` prop with HTML sanitization.

### Template usage example

**Simple text tooltip:**
```typescript
<script setup lang="ts">
import { N8nTooltip, N8nIcon } from '@n8n/design-system'
</script>

<template>
  <N8nTooltip content="This is helpful information" placement="top">
    <N8nIcon icon="info" />
  </N8nTooltip>
</template>
```

**Custom content slot:**
```typescript
<script setup lang="ts">
import { N8nTooltip, N8nButton } from '@n8n/design-system'
</script>

<template>
  <N8nTooltip placement="right">
    <template #content>
      <div class="custom-tooltip-content">
        <strong>Advanced Feature</strong>
        <p>This feature requires a pro plan.</p>
      </div>
    </template>
    <N8nButton label="Hover for details" />
  </N8nTooltip>
</template>
```

### Explain an unavailable button

Use `N8nButton` with `disabled` and `focusableWhenDisabled` inside `N8nTooltip as-child`.
The button stays in the tab order and exposes `aria-disabled="true"`.
It blocks click, Enter, and Space activation, including form submission.
The tooltip opens on hover or keyboard focus. Press Escape to dismiss it.

Keep the explanation visible next to the button for touch users.
Tooltips do not reliably open on touch.
Link the visible text with `aria-describedby` to expose the explanation even when the tooltip is closed.
Keep the action label separate from the explanation.
Pass localized text from the consuming feature.

```vue
<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useId } from 'vue';

defineProps<{
  disabled: boolean;
  label: string;
  reason: string;
}>();

const reasonId = useId();
</script>

<template>
  <N8nTooltip as-child :content="reason" :disabled="!disabled">
    <N8nButton
      :disabled="disabled"
      focusable-when-disabled
      :aria-describedby="disabled ? reasonId : undefined"
    >
      {{ label }}
    </N8nButton>
  </N8nTooltip>
  <p v-if="disabled" :id="reasonId">{{ reason }}</p>
</template>
```

This opt-in applies to buttons without `href`.
Loading buttons keep native disabled behavior.
Without this opt-in, disabled buttons keep their current behavior.

### Other tooltip examples

**Delayed tooltip:**
```typescript
<script setup lang="ts">
import { N8nTooltip } from '@n8n/design-system'
</script>

<template>
  <N8nTooltip
    content="Appears after 500ms"
    :show-after="500"
    placement="top"
  >
    <span>Hover and wait...</span>
  </N8nTooltip>
</template>
```

**Programmatically controlled visibility:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nTooltip } from '@n8n/design-system'

const isVisible = ref(false)

const showTooltip = () => {
  isVisible.value = true
  setTimeout(() => {
    isVisible.value = false
  }, 2000)
}
</script>

<template>
  <N8nTooltip
    :visible="isVisible"
    content="This tooltip is programmatically controlled"
    placement="top"
  >
    <button @click="showTooltip">
      Click to show tooltip for 2 seconds
    </button>
  </N8nTooltip>
</template>
```

**Disabled tooltip:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nTooltip } from '@n8n/design-system'

const showTooltip = ref(false)
</script>

<template>
  <N8nTooltip
    :disabled="!showTooltip"
    content="Conditionally shown"
    placement="top"
  >
    <span>{{ showTooltip ? 'Tooltip enabled' : 'Tooltip disabled' }}</span>
  </N8nTooltip>
</template>
```

**Tooltip with buttons:**
```typescript
<script setup lang="ts">
import { N8nTooltip } from '@n8n/design-system'

const handleAction = () => {
  console.log('Action clicked!')
}

const buttons = [
  {
    attrs: { label: 'Learn more', type: 'secondary', size: 'mini' },
    listeners: { onClick: handleAction },
  },
]
</script>

<template>
  <N8nTooltip
    content="This feature requires additional setup"
    :buttons="buttons"
    placement="top"
  >
    <span>Hover for more info</span>
  </N8nTooltip>
</template>
```

**Tooltip with custom class:**
```typescript
<script setup lang="ts">
import { N8nTooltip } from '@n8n/design-system'
</script>

<template>
  <N8nTooltip
    content="This tooltip has custom styling"
    content-class="my-custom-tooltip"
    placement="top"
  >
    <span>Hover me</span>
  </N8nTooltip>
</template>

<style>
.my-custom-tooltip {
  max-width: 300px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
```

**Tooltip without collision avoidance:**
```typescript
<script setup lang="ts">
import { N8nTooltip } from '@n8n/design-system'
</script>

<template>
  <N8nTooltip
    content="This tooltip won't flip or shift"
    :avoid-collisions="false"
    placement="top"
  >
    <span>Hover me</span>
  </N8nTooltip>
</template>
```
