<script lang="ts">
import type { Ref } from 'vue'
import type { ListboxItemEmits, ListboxItemProps } from '@/Listbox'
import { createContext, useForwardPropsEmits } from '@/shared'

export interface ColorSwatchPickerItemProps extends ListboxItemProps {
/**
 * The color to display in the swatch as a hex string.
 * Example: `#16a372` or `#ff5733`.
 */
  value: string
}

export type ColorSwatchPickerItemEmits = ListboxItemEmits

export interface ColorSwatchPickerItemContext {
  color: Ref<string>
}

export const [injectColorSwatchPickerItemContext, provideColorSwatchPickerItemContext]
  = createContext<ColorSwatchPickerItemContext>('ColorSwatchPickerItem', 'ColorSwatchPickerItemContext')
</script>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { ListboxItem } from '@/Listbox'
import { getColorName } from '@/shared/color'

const props = defineProps<ColorSwatchPickerItemProps>()

const emits = defineEmits<ColorSwatchPickerItemEmits>()

const { value } = toRefs(props)

const forwarded = useForwardPropsEmits(props, emits)

const colorLabel = computed(() => {
  try {
    return getColorName(value.value)
  }
  catch {
    return value.value
  }
})

provideColorSwatchPickerItemContext({
  color: value,
})
</script>

<template>
  <ListboxItem
    v-bind="forwarded"
    :aria-label="colorLabel"
    :data-color="value"
    :style="{ '--reka-color-swatch-picker-item-color': value }"
  >
    <slot />
  </ListboxItem>
</template>
