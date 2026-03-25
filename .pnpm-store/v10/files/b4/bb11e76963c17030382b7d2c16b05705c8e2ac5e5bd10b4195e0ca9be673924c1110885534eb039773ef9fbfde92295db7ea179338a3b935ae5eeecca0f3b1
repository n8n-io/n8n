<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useForwardExpose } from '@/shared'

export interface SwitchThumbProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { injectSwitchRootContext } from './SwitchRoot.vue'

withDefaults(defineProps<SwitchThumbProps>(), { as: 'span' })

const rootContext = injectSwitchRootContext()

useForwardExpose()
</script>

<template>
  <Primitive
    :data-state="rootContext.modelValue?.value ? 'checked' : 'unchecked'"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
  >
    <slot />
  </Primitive>
</template>
