<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface SliderThumbProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useCollection } from '@/Collection'
import SliderThumbImpl from './SliderThumbImpl.vue'

const props = withDefaults(defineProps<SliderThumbProps>(), {
  as: 'span',
})
const { getItems } = useCollection()

const { forwardRef, currentElement: thumbElement } = useForwardExpose()

const index = computed(() => thumbElement.value ? getItems(true).findIndex(i => i.ref === thumbElement.value) : -1)
</script>

<template>
  <SliderThumbImpl
    :ref="forwardRef"
    v-bind="props"
    :index="index"
  >
    <slot />
  </SliderThumbImpl>
</template>
