<script lang="ts">
import type { DialogOverlayProps } from '@/Dialog'
import { useForwardExpose } from '@/shared'

export interface AlertDialogOverlayProps extends DialogOverlayProps {}
</script>

<script setup lang="ts">
import { DialogOverlay } from '@/Dialog'

const props = defineProps<AlertDialogOverlayProps>()
useForwardExpose()
</script>

<template>
  <DialogOverlay v-bind="props">
    <slot />
  </DialogOverlay>
</template>
