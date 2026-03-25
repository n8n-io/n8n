<script lang="ts">
import type { DialogTriggerProps } from '@/Dialog'
import { useForwardExpose } from '@/shared'

export interface AlertDialogTriggerProps extends DialogTriggerProps {}
</script>

<script setup lang="ts">
import { DialogTrigger } from '@/Dialog'

const props = withDefaults(defineProps<AlertDialogTriggerProps>(), { as: 'button' })
useForwardExpose()
</script>

<template>
  <DialogTrigger v-bind="props">
    <slot />
  </DialogTrigger>
</template>
