<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface DialogTitleProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectDialogRootContext } from './DialogRoot.vue'

const props = withDefaults(defineProps<DialogTitleProps>(), { as: 'h2' })
const rootContext = injectDialogRootContext()
useForwardExpose()
</script>

<template>
  <Primitive
    v-bind="props"
    :id="rootContext.titleId"
  >
    <slot />
  </Primitive>
</template>
