<script lang="ts">
export interface ComboboxAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import type { PopperAnchorProps } from '@/Popper'
import { PopperAnchor } from '@/Popper'
import { Primitive } from '@/Primitive'
import { useForwardExpose } from '@/shared'

defineProps<ComboboxAnchorProps>()

const { forwardRef } = useForwardExpose()
</script>

<template>
  <PopperAnchor
    as-child
    :reference="reference"
  >
    <Primitive
      :ref="forwardRef"
      :as-child="asChild"
      :as="as"
      v-bind="$attrs"
    >
      <slot />
    </Primitive>
  </PopperAnchor>
</template>
