<script lang="ts">
import type { NavigationMenuContentImplEmits, NavigationMenuContentImplProps } from './NavigationMenuContentImpl.vue'

export type NavigationMenuContentEmits = NavigationMenuContentImplEmits

export interface NavigationMenuContentProps extends NavigationMenuContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { isClient, reactiveOmit } from '@vueuse/shared'
import { computed } from 'vue'
import { Presence } from '@/Presence'
import { useForwardExpose, useForwardPropsEmits } from '@/shared'
import NavigationMenuContentImpl from './NavigationMenuContentImpl.vue'
import { injectNavigationMenuItemContext } from './NavigationMenuItem.vue'
import { injectNavigationMenuContext } from './NavigationMenuRoot.vue'
import { getOpenState, whenMouse } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<NavigationMenuContentProps>()
const emits = defineEmits<NavigationMenuContentEmits>()

const forwarded = useForwardPropsEmits(reactiveOmit(props, 'forceMount'), emits)
const { forwardRef } = useForwardExpose()

const menuContext = injectNavigationMenuContext()
const itemContext = injectNavigationMenuItemContext()

const open = computed(() => itemContext.value === menuContext.modelValue.value)

// We persist the last active content value as the viewport may be animating out
// and we want the content to remain mounted for the lifecycle of the viewport.
const isLastActiveValue = computed(() => {
  if (menuContext.viewport.value) {
    if (!menuContext.modelValue.value && menuContext.previousValue.value)
      return (menuContext.previousValue.value === itemContext.value)
  }
  return false
})
</script>

<template>
  <Teleport
    :to="isClient && menuContext.viewport.value ? menuContext.viewport.value : 'body'"
    :disabled="isClient && menuContext.viewport.value ? !menuContext.viewport.value : true"
  >
    <Presence
      v-slot="{ present }"
      :present="forceMount || open || isLastActiveValue"
      :force-mount="!menuContext.unmountOnHide.value"
    >
      <NavigationMenuContentImpl
        :ref="forwardRef"
        :data-state="getOpenState(open)"
        :style="{
          pointerEvents: !open && menuContext.isRootMenu ? 'none' : undefined,
        }"
        v-bind="{ ...$attrs, ...forwarded }"
        :hidden="!present"
        @pointerenter="menuContext.onContentEnter(itemContext.value)"
        @pointerleave="whenMouse(() => menuContext.onContentLeave())($event)"
        @pointer-down-outside="emits('pointerDownOutside', $event)"
        @focus-outside="emits('focusOutside', $event)"
        @interact-outside="emits('interactOutside', $event)"
      >
        <slot />
      </NavigationMenuContentImpl>
    </Presence>
  </Teleport>
</template>
