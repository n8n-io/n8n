<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import type { StringOrNumber } from '@/shared/types'
import { useForwardExpose } from '@/shared'

export interface TabsContentProps extends PrimitiveProps {
  /** A unique value that associates the content with a trigger. */
  value: StringOrNumber
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Presence } from '@/Presence'
import { Primitive } from '@/Primitive'
import { injectTabsRootContext } from './TabsRoot.vue'
import { makeContentId, makeTriggerId } from './utils'

const props = defineProps<TabsContentProps>()

const { forwardRef } = useForwardExpose()
const rootContext = injectTabsRootContext()
const triggerId = computed(() => makeTriggerId(rootContext.baseId, props.value))
const contentId = computed(() => makeContentId(rootContext.baseId, props.value))

const isSelected = computed(() => props.value === rootContext.modelValue.value)

const isMountAnimationPreventedRef = ref(isSelected.value)

onMounted(() => {
  requestAnimationFrame(() => {
    isMountAnimationPreventedRef.value = false
  })
})
</script>

<template>
  <Presence
    v-slot="{ present }"
    :present="forceMount || isSelected"
    force-mount
  >
    <Primitive
      :id="contentId"
      :ref="forwardRef"
      :as-child="asChild"
      :as="as"
      role="tabpanel"
      :data-state="isSelected ? 'active' : 'inactive'"
      :data-orientation="rootContext.orientation.value"
      :aria-labelledby="triggerId"
      :hidden="!present"
      tabindex="0"
      :style="{
        animationDuration: isMountAnimationPreventedRef ? '0s' : undefined,
      }"
    >
      <slot v-if="rootContext.unmountOnHide.value ? present : true" />
    </Primitive>
  </Presence>
</template>
