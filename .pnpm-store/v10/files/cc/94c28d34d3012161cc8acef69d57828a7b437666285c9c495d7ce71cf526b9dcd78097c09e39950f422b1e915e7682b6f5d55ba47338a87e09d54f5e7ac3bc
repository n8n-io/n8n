<script lang="ts">
import type { ColorSwatchProps } from '@/ColorSwatch/ColorSwatch.vue'

export interface ColorSwatchPickerItemSwatchProps extends Omit<ColorSwatchProps, 'color'> { }
</script>

<script setup lang="ts">
import { ColorSwatch } from '@/ColorSwatch'
import { injectColorSwatchPickerItemContext } from './ColorSwatchPickerItem.vue'

const props = defineProps<ColorSwatchPickerItemSwatchProps>()

const colorSwatchPickerItemContext = injectColorSwatchPickerItemContext()
</script>

<template>
  <ColorSwatch
    v-bind="props"
    :color="colorSwatchPickerItemContext.color.value"
  />
</template>
