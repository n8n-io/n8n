<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'

export interface VisuallyHiddenProps extends PrimitiveProps {
  feature?: 'focusable' | 'fully-hidden'
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

withDefaults(defineProps<VisuallyHiddenProps>(), { as: 'span', feature: 'focusable' })
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :aria-hidden="feature === 'focusable' ? 'true' : undefined"
    :data-hidden="feature === 'fully-hidden' ? '' : undefined"
    :tabindex="feature === 'fully-hidden' ? '-1' : undefined"
    :style="{
      // See: https://github.com/twbs/bootstrap/blob/a360960b8dfdb4bf48f87539c2243458fa0366f7/scss/mixins/_visually-hidden.scss
      position: 'absolute',
      border: 0,
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
      wordWrap: 'normal',

      // Prevent causing unnecessary container scroll
      // @see https://github.com/unovue/reka-ui/issues/2127
      top: '-1px',
      left: '-1px',
    }"
  >
    <slot />
  </Primitive>
</template>
