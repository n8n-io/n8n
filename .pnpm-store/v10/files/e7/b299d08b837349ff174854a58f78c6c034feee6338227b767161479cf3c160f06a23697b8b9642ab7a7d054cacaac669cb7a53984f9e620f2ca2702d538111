<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface MonthPickerGridRowProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<MonthPickerGridRowProps>(), { as: 'tr' })
</script>

<template>
  <Primitive
    v-bind="props"
    role="row"
  >
    <slot />
  </Primitive>
</template>
