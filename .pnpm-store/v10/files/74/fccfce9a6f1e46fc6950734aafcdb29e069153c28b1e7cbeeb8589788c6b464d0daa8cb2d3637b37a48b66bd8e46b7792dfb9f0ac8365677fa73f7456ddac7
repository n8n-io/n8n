import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { injectConfigProviderContext } from '@/ConfigProvider/ConfigProvider.vue'

export function useLocale(locale?: Ref<string | undefined>) {
  const context = injectConfigProviderContext({
    locale: ref('en'),
  })
  return computed(() => locale?.value || context.locale?.value || 'en')
}
