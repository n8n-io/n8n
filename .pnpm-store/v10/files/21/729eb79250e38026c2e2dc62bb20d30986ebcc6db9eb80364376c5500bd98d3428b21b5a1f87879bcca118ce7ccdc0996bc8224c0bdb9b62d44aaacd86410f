<script setup lang="ts">
import { useRafFn } from '@vueuse/core'
import { useTimeout } from '@vueuse/shared'
import { ref } from 'vue'
import { VisuallyHidden } from '@/VisuallyHidden'
import { injectToastProviderContext } from './ToastProvider.vue'

const providerContext = injectToastProviderContext()

const isAnnounced = useTimeout(1000)
const renderAnnounceText = ref(false)

useRafFn(() => {
  renderAnnounceText.value = true
})
</script>

<template>
  <VisuallyHidden v-if="isAnnounced || renderAnnounceText">
    {{ providerContext.label.value }}
    <slot />
  </VisuallyHidden>
</template>
