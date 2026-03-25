<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface PaginationEllipsisProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<PaginationEllipsisProps>()
useForwardExpose()
</script>

<template>
  <Primitive
    v-bind="props"
    data-type="ellipsis"
  >
    <slot>&#8230;</slot>
  </Primitive>
</template>
