<script lang="ts">
import type { TeleportProps } from '@/Teleport'

export interface HoverCardPortalProps extends TeleportProps {}
</script>

<script setup lang="ts">
import { TeleportPrimitive } from '@/Teleport'

const props = defineProps<HoverCardPortalProps>()
</script>

<template>
  <TeleportPrimitive v-bind="props">
    <slot />
  </TeleportPrimitive>
</template>
