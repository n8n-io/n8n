import type { Ref } from 'vue'
import type { Direction } from './types'
import { computed, ref } from 'vue'
import { injectConfigProviderContext } from '@/ConfigProvider/ConfigProvider.vue'

/**
 * The `useDirection` function provides a way to access the current direction in your application.
 * @param {Ref<Direction | undefined>} [dir] - An optional ref containing the direction (ltr or rtl).
 * @returns  computed value that combines with the resolved direction.
 */
export function useDirection(dir?: Ref<Direction | undefined>) {
  const context = injectConfigProviderContext({
    dir: ref('ltr'),
  })
  return computed(() => dir?.value || context.dir?.value || 'ltr')
}
