<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { createContext, useId } from '@/shared'

export interface MenuGroupProps extends PrimitiveProps {}

interface MenuGroupContext {
  id: string
}

export const [injectMenuGroupContext, provideMenuGroupContext]
  = createContext<MenuGroupContext>('MenuGroup')
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'

const props = defineProps<MenuGroupProps>()

const id = useId(undefined, 'reka-menu-group')
provideMenuGroupContext({ id })
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
