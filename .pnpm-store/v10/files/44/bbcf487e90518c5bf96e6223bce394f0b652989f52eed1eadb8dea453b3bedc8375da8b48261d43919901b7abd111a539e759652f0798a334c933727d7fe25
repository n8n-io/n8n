<script lang="ts">
import type { PopperAnchorProps } from '@/Popper'
import { useForwardExpose } from '@/shared'

export interface PopoverAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import { onBeforeMount, onUnmounted } from 'vue'
import { PopperAnchor } from '@/Popper'
import { injectPopoverRootContext } from './PopoverRoot.vue'

const props = defineProps<PopoverAnchorProps>()

useForwardExpose()
const rootContext = injectPopoverRootContext()

onBeforeMount(() => {
  rootContext.hasCustomAnchor.value = true
})
onUnmounted(() => {
  rootContext.hasCustomAnchor.value = false
})
</script>

<template>
  <PopperAnchor v-bind="props">
    <slot />
  </PopperAnchor>
</template>
