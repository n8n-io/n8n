<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose, useId } from '@/shared'

export interface DropdownMenuTriggerProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { nextTick, onMounted } from 'vue'
import { MenuAnchor } from '@/Menu'
import {
  Primitive,
} from '@/Primitive'
import { injectDropdownMenuRootContext } from './DropdownMenuRoot.vue'

const props = withDefaults(defineProps<DropdownMenuTriggerProps>(), {
  as: 'button',
})

const rootContext = injectDropdownMenuRootContext()

const { forwardRef, currentElement: triggerElement } = useForwardExpose()

onMounted(() => {
  rootContext.triggerElement = triggerElement
})

rootContext.triggerId ||= useId(undefined, 'reka-dropdown-menu-trigger')
</script>

<template>
  <MenuAnchor as-child>
    <Primitive
      :id="rootContext.triggerId"
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      :as-child="props.asChild"
      :as="as"
      aria-haspopup="menu"
      :aria-expanded="rootContext.open.value"
      :aria-controls="rootContext.open.value ? rootContext.contentId : undefined"
      :data-disabled="disabled ? '' : undefined"
      :disabled="disabled"
      :data-state="rootContext.open.value ? 'open' : 'closed'"
      @click="
        async (event) => {
          // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
          // but not when the control key is pressed (avoiding MacOS right click)
          if (!disabled && event.button === 0 && event.ctrlKey === false) {
            rootContext?.onOpenToggle();
            await nextTick()
            // prevent trigger focusing when opening
            // this allows the content to be given focus without competition
            if (rootContext.open.value) event.preventDefault();
          }
        }
      "
      @keydown.enter.space.arrow-down="
        (event) => {
          if (disabled) return;
          if (['Enter', ' '].includes(event.key)) rootContext.onOpenToggle();
          if (event.key === 'ArrowDown') rootContext.onOpenChange(true);
          // prevent keydown from scrolling window / first focused item to execute
          // that keydown (inadvertently closing the menu)
          if (['Enter', ' ', 'ArrowDown'].includes(event.key))
            event.preventDefault();
        }
      "
    >
      <slot />
    </Primitive>
  </MenuAnchor>
</template>
