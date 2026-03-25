<script lang="ts">
import type { DialogDescriptionProps } from '@/Dialog'
import { useForwardExpose } from '@/shared'

export interface AlertDialogDescriptionProps extends DialogDescriptionProps {}
</script>

<script setup lang="ts">
import { DialogDescription } from '@/Dialog'

const props = withDefaults(defineProps<AlertDialogDescriptionProps>(), { as: 'p' })
useForwardExpose()
</script>

<template>
  <DialogDescription v-bind="props">
    <slot />
  </DialogDescription>
</template>
