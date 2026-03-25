<script lang="ts">
import type { Ref } from 'vue'
import type { ImageLoadingStatus } from './utils'
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useForwardExpose } from '@/shared'

export interface AvatarRootProps extends PrimitiveProps {}

export type AvatarRootContext = {
  imageLoadingStatus: Ref<ImageLoadingStatus>
}

export const [injectAvatarRootContext, provideAvatarRootContext]
  = createContext<AvatarRootContext>('AvatarRoot')
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { Primitive } from '@/Primitive'

withDefaults(defineProps<AvatarRootProps>(), {
  as: 'span',
})

useForwardExpose()

provideAvatarRootContext({
  imageLoadingStatus: ref<ImageLoadingStatus>('idle'),
})
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
  >
    <slot />
  </Primitive>
</template>
