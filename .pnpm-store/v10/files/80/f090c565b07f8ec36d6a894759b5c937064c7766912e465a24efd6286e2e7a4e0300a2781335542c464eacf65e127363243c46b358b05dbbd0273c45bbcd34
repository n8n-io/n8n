<script lang="ts">
import type {
  MenuContentImplEmits,
  MenuRootContentTypeProps,
} from './MenuContentImpl.vue'

export type MenuContentEmits = Omit<MenuContentImplEmits, 'entryFocus' | 'openAutoFocus'>

export interface MenuContentProps extends MenuRootContentTypeProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { Presence } from '@/Presence'
import { useForwardPropsEmits } from '@/shared'
import { injectMenuContext, injectMenuRootContext } from './MenuRoot.vue'
import MenuRootContentModal from './MenuRootContentModal.vue'
import MenuRootContentNonModal from './MenuRootContentNonModal.vue'

const props = defineProps<MenuContentProps>()
const emits = defineEmits<MenuContentImplEmits>()
const forwarded = useForwardPropsEmits(props, emits)

const menuContext = injectMenuContext()
const rootContext = injectMenuRootContext()
</script>

<template>
  <Presence :present="forceMount || menuContext.open.value">
    <MenuRootContentModal
      v-if="rootContext.modal.value"
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />
    </MenuRootContentModal>
    <MenuRootContentNonModal
      v-else
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />
    </MenuRootContentNonModal>
  </Presence>
</template>
