<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { isClient } from '@vueuse/shared'
import { useForwardExpose } from '@/shared'

export interface AvatarFallbackProps extends PrimitiveProps {
  /** Useful for delaying rendering so it only appears for those with slower connections. */
  delayMs?: number
}
</script>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { Primitive } from '@/Primitive'
import { injectAvatarRootContext } from './AvatarRoot.vue'

const props = withDefaults(defineProps<AvatarFallbackProps>(), {
  as: 'span',
})

const rootContext = injectAvatarRootContext()
useForwardExpose()

const canRender = ref(props.delayMs === undefined)

watchEffect((onCleanup) => {
  if (props.delayMs && isClient) {
    const timerId = window.setTimeout(() => {
      canRender.value = true
    }, props.delayMs)

    onCleanup(() => {
      window.clearTimeout(timerId)
    })
  }
})
</script>

<template>
  <Primitive
    v-if="canRender && rootContext.imageLoadingStatus.value !== 'loaded'"
    :as-child="asChild"
    :as="as"
  >
    <slot />
  </Primitive>
</template>
