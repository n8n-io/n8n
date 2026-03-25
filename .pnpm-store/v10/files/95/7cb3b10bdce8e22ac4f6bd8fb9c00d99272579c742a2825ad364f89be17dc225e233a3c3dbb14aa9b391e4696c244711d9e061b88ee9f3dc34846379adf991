<script lang="ts">
import type { ReferenceElement } from '@floating-ui/vue'
import type { Ref } from 'vue'
import { createContext } from '@/shared'

export interface Measurable {
  getBoundingClientRect: () => DOMRect
}

interface PopperRootContext {
  anchor: Ref<ReferenceElement | undefined>
  onAnchorChange: (element: ReferenceElement | undefined) => void
}

export const [injectPopperRootContext, providePopperRootContext]
  = createContext<PopperRootContext>('PopperRoot')
</script>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const anchor = ref<ReferenceElement>()

providePopperRootContext({
  anchor,
  onAnchorChange: element => anchor.value = element,
})
</script>

<template>
  <slot />
</template>
