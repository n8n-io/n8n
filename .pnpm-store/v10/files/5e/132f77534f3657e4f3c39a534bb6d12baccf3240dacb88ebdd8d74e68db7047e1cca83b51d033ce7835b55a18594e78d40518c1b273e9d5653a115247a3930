<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface MenuLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<MenuLabelProps>(), {
  as: 'div',
})
</script>

<template>
  <Primitive v-bind="props">
    <slot />
  </Primitive>
</template>
