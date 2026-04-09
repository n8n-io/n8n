<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface YearRangePickerGridRowProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<YearRangePickerGridRowProps>(), { as: 'tr' })
</script>

<template>
  <Primitive
    v-bind="props"
    role="row"
  >
    <slot />
  </Primitive>
</template>
