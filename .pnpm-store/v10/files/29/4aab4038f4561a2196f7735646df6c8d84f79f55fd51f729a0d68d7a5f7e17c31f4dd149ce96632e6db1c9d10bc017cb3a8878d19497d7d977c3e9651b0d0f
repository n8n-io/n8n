<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useCollection } from '@/Collection'
import { useForwardExpose } from '@/shared'

export interface MenubarTriggerProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MenuAnchor } from '@/Menu'
import {
  Primitive,
} from '@/Primitive'
import { RovingFocusItem } from '@/RovingFocus'
import { injectMenubarMenuContext } from './MenubarMenu.vue'
import { injectMenubarRootContext } from './MenubarRoot.vue'

withDefaults(defineProps<MenubarTriggerProps>(), {
  as: 'button',
})
const rootContext = injectMenubarRootContext()
const menuContext = injectMenubarMenuContext()

const { forwardRef, currentElement: triggerElement } = useForwardExpose()
const { CollectionItem } = useCollection({ key: 'Menubar' })

const isFocused = ref(false)

const open = computed(() => rootContext.modelValue.value === menuContext.value)

onMounted(() => {
  menuContext.triggerElement = triggerElement
})
</script>

<template>
  <RovingFocusItem
    as-child
    :focusable="!disabled"
    :tab-stop-id="menuContext.value"
  >
    <CollectionItem>
      <MenuAnchor as-child>
        <Primitive
          :id="menuContext.triggerId"
          :ref="forwardRef"
          :as="as"
          :as-child="asChild"
          :type="as === 'button' ? 'button' : undefined"
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="open"
          :aria-controls="open ? menuContext.contentId : undefined"
          :data-highlighted="isFocused ? '' : undefined"
          :data-state="open ? 'open' : 'closed'"
          :data-disabled="disabled ? '' : undefined"
          :disabled="disabled"
          :data-value="menuContext.value"
          @pointerdown="(event) => {
            // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
            // but not when the control key is pressed (avoiding MacOS right click)
            if (!disabled && event.button === 0 && event.ctrlKey === false) {
              rootContext.onMenuOpen(menuContext.value);
              // prevent trigger focusing when opening
              // this allows the content to be given focus without competition
              if (!open) event.preventDefault();
            }
          }"
          @pointerenter="() => {
            const menubarOpen = Boolean(rootContext.modelValue.value);
            if (menubarOpen && !open) {
              rootContext.onMenuOpen(menuContext.value);
              triggerElement?.focus()
            }
          }"
          @keydown.enter.space.arrow-down="(event) => {
            if (disabled) return;
            if (['Enter', ' '].includes(event.key)) rootContext.onMenuToggle(menuContext.value);
            if (event.key === 'ArrowDown') rootContext.onMenuOpen(menuContext.value);
            // prevent keydown from scrolling window / first focused item to execute
            // that keydown (inadvertently closing the menu)
            if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
              menuContext.wasKeyboardTriggerOpenRef.value = true;
              event.preventDefault();
            }
          }"
          @focus="isFocused = true"
          @blur="isFocused = false"
        >
          <slot />
        </Primitive>
      </MenuAnchor>
    </CollectionItem>
  </RovingFocusItem>
</template>
