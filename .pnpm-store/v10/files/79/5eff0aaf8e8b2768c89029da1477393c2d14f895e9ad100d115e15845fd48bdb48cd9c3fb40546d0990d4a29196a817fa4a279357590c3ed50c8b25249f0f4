<script lang="ts">
import type { Ref } from 'vue'
import type { Direction, ScrollBodyOption } from '@/shared/types'
import { createContext } from '@/shared'

interface ConfigProviderContextValue {
  dir?: Ref<Direction>
  locale?: Ref<string>
  scrollBody?: Ref<boolean | ScrollBodyOption>
  nonce?: Ref<string | undefined>
  useId?: () => string
}

export const [injectConfigProviderContext, provideConfigProviderContext]
  = createContext<ConfigProviderContextValue>('ConfigProvider')

export interface ConfigProviderProps {
  /**
   * The global reading direction of your application. This will be inherited by all primitives.
   * @defaultValue 'ltr'
   */
  dir?: Direction
  /**
   * The global locale of your application. This will be inherited by all primitives.
   * @defaultValue 'en'
   */
  locale?: string
  /**
   * The global scroll body behavior of your application. This will be inherited by the related primitives.
   * @type boolean | ScrollBodyOption
   */
  scrollBody?: boolean | ScrollBodyOption
  /**
   * The global `nonce` value of your application. This will be inherited by the related primitives.
   * @type string
   */
  nonce?: string
  /**
   * The global `useId` injection as a workaround for preventing hydration issue.
   */
  useId?: () => string
}
</script>

<script setup lang="ts">
import { toRefs } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ConfigProviderProps>(), {
  dir: 'ltr',
  locale: 'en',
  scrollBody: true,
  nonce: undefined,
  useId: undefined,
})

const { dir, locale, scrollBody, nonce } = toRefs(props)

provideConfigProviderContext({
  dir,
  locale,
  scrollBody,
  nonce,
  useId: props.useId,
})
</script>

<template>
  <slot />
</template>
