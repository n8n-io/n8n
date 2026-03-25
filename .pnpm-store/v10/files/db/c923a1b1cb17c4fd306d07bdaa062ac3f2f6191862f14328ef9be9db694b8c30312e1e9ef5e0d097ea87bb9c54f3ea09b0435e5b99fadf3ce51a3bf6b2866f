<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface NavigationMenuListProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import {
  Primitive,
} from '@/Primitive'
import { injectNavigationMenuContext } from './NavigationMenuRoot.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<NavigationMenuListProps>(), {
  as: 'ul',
})

const menuContext = injectNavigationMenuContext()
const { forwardRef, currentElement } = useForwardExpose()

onMounted(() => {
  menuContext.onIndicatorTrackChange(currentElement.value)
})
</script>

<template>
  <Primitive
    :ref="forwardRef"
    style="position: relative"
  >
    <Primitive
      v-bind="$attrs"
      :as-child="props.asChild"
      :as="as"
      :data-orientation="menuContext.orientation"
    >
      <slot />
    </Primitive>
  </Primitive>
</template>
