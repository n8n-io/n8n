<script lang="ts">
import type { DialogCloseProps } from '@/Dialog'
import { useForwardExpose } from '@/shared'

export interface AlertDialogActionProps extends DialogCloseProps {}
</script>

<script setup lang="ts">
import { DialogClose } from '@/Dialog'

const props = withDefaults(defineProps<AlertDialogActionProps>(), { as: 'button' })
useForwardExpose()
</script>

<template>
  <DialogClose v-bind="props">
    <slot />
  </DialogClose>
</template>
