import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { injectConfigProviderContext } from '@/ConfigProvider/ConfigProvider.vue'

/**
 * The `useLocale` function provides a way to access the current locale in your application.
 * @param {Ref<string | undefined>} [locale] - An optional ref containing the locale.
 * @returns A computed ref holding the resolved locale.
 */
export function useLocale(locale?: Ref<string | undefined>) {
  const context = injectConfigProviderContext({
    locale: ref('en'),
  })
  return computed(() => locale?.value || context.locale?.value || 'en')
}
