<script lang="ts">
import type { PopperArrowProps } from '@/Popper'

export interface SelectArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '@/Popper'
import { injectSelectContentContext, SelectContentDefaultContextValue } from './SelectContentImpl.vue'
import { injectSelectRootContext } from './SelectRoot.vue'

const props = withDefaults(defineProps<SelectArrowProps>(), {
  width: 10,
  height: 5,
  as: 'svg',
})
const rootContext = injectSelectRootContext()
const contentContext = injectSelectContentContext(SelectContentDefaultContextValue)
</script>

<template>
  <PopperArrow
    v-if="rootContext.open.value && contentContext.position === 'popper'"
    v-bind="props"
  >
    <slot />
  </PopperArrow>
</template>
