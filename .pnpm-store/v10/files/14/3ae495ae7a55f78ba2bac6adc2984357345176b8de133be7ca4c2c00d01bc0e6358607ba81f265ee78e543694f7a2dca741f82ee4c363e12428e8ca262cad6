<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface ToastDescriptionProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<ToastDescriptionProps>()
useForwardExpose()
</script>

<template>
  <Primitive v-bind="props">
    <slot />
  </Primitive>
</template>
