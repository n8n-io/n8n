<script lang="ts">
import type { ListboxItemIndicatorProps } from '@/Listbox'

export interface ComboboxItemIndicatorProps extends ListboxItemIndicatorProps {}
</script>

<script setup lang="ts">
import { ListboxItemIndicator } from '@/Listbox'

const props = withDefaults(defineProps<ComboboxItemIndicatorProps>(), {
  as: 'span',
})
</script>

<template>
  <ListboxItemIndicator
    v-bind="props"
  >
    <slot />
  </ListboxItemIndicator>
</template>
