<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface RangeCalendarGridHeadProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<RangeCalendarGridHeadProps>(), { as: 'thead' })
</script>

<template>
  <Primitive
    v-bind="props"
    aria-hidden="true"
  >
    <slot />
  </Primitive>
</template>
