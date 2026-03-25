<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface CalendarHeadCellProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<CalendarHeadCellProps>(), { as: 'th' })
</script>

<template>
  <Primitive v-bind="props">
    <slot />
  </Primitive>
</template>
