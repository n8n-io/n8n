<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useId } from '@/shared'

export interface ListboxGroupProps extends PrimitiveProps {}

interface ListboxGroupContext {
  id: string
}

export const [injectListboxGroupContext, provideListboxGroupContext]
  = createContext<ListboxGroupContext>('ListboxGroup')
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<ListboxGroupProps>()

const id = useId(undefined, 'reka-listbox-group')
provideListboxGroupContext({ id })
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
