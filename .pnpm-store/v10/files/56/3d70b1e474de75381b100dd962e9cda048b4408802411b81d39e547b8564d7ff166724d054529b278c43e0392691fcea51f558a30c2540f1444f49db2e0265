<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { injectMenuGroupContext } from './MenuGroup.vue'

export interface MenuLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = withDefaults(defineProps<MenuLabelProps>(), {
  as: 'div',
})

const groupContext = injectMenuGroupContext({ id: '' })
</script>

<template>
  <Primitive
    v-bind="props"
    :id="groupContext.id || undefined"
  >
    <slot />
  </Primitive>
</template>
