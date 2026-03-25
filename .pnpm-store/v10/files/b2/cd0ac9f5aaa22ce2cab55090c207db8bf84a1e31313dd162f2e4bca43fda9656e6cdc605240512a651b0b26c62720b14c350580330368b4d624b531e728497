<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface MenuSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<MenuSeparatorProps>()
</script>

<template>
  <Primitive
    v-bind="props"
    role="separator"
    aria-orientation="horizontal"
  >
    <slot />
  </Primitive>
</template>
