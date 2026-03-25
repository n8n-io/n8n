<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface ToastAnnounceExcludeProps extends PrimitiveProps {
  altText?: string
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

defineProps<ToastAnnounceExcludeProps>()
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    data-reka-toast-announce-exclude=""
    :data-reka-toast-announce-alt="altText || undefined"
  >
    <slot />
  </Primitive>
</template>
