<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface YearRangePickerGridProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from '@/Primitive'
import { injectYearRangePickerRootContext } from './YearRangePickerRoot.vue'

const props = withDefaults(defineProps<YearRangePickerGridProps>(), { as: 'table' })

const rootContext = injectYearRangePickerRootContext()
const disabled = computed(() => rootContext.disabled.value ? true : undefined)
const readonly = computed(() => rootContext.readonly.value ? true : undefined)
</script>

<template>
  <Primitive
    v-bind="props"
    tabindex="-1"
    role="application"
    :aria-labelledby="rootContext.headingId"
    :aria-readonly="readonly"
    :aria-disabled="disabled"
    :data-readonly="readonly && ''"
    :data-disabled="disabled && ''"
  >
    <slot />
  </Primitive>
</template>
