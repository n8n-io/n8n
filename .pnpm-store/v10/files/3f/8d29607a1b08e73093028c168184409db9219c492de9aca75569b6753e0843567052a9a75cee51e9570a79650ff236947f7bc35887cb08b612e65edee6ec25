<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useId } from '@/shared'

export interface SelectGroupProps extends PrimitiveProps {}

interface SelectGroupContext {
  id: string
}

export const [injectSelectGroupContext, provideSelectGroupContext]
  = createContext<SelectGroupContext>('SelectGroup')
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<SelectGroupProps>()

const id = useId(undefined, 'reka-select-group')
provideSelectGroupContext({ id })
</script>

<template>
  <Primitive
    role="group"
    v-bind="props"
    :aria-labelledby="id"
  >
    <slot />
  </Primitive>
</template>
