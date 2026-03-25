<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface DialogOverlayImplProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'
import { useBodyScrollLock } from '@/shared/useBodyScrollLock'
import { injectDialogRootContext } from './DialogRoot.vue'

defineProps<DialogOverlayImplProps>()
const rootContext = injectDialogRootContext()

useBodyScrollLock(true)
useForwardExpose()
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :data-state="rootContext.open.value ? 'open' : 'closed'"
    style="pointer-events: auto"
  >
    <slot />
  </Primitive>
</template>
