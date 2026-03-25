<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface CalendarGridRowProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<CalendarGridRowProps>(), { as: 'tr' })
</script>

<template>
  <Primitive v-bind="props">
    <slot />
  </Primitive>
</template>
