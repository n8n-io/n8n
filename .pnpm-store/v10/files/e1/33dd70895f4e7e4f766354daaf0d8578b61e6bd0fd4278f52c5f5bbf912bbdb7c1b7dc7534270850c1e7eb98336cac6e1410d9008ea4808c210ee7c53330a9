<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface YearPickerGridRowProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<YearPickerGridRowProps>(), { as: 'tr' })
</script>

<template>
  <Primitive
    v-bind="props"
    role="row"
  >
    <slot />
  </Primitive>
</template>
