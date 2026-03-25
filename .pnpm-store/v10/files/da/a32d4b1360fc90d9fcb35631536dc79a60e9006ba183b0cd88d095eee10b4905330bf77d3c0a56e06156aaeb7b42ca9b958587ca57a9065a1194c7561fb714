<script lang="ts">
import type { TeleportProps } from '@/Teleport'

export interface ToastPortalProps extends TeleportProps {}
</script>

<script setup lang="ts">
import { TeleportPrimitive } from '@/Teleport'

const props = defineProps<ToastPortalProps>()
</script>

<template>
  <TeleportPrimitive v-bind="props">
    <slot />
  </TeleportPrimitive>
</template>
