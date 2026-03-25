import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  observeWindowOffset,
  observeWindowRect,
  windowScroll,
} from '@tanstack/virtual-core'
import {
  computed,
  onScopeDispose,
  shallowRef,
  triggerRef,
  unref,
  watch,
} from 'vue'
import type { PartialKeys, VirtualizerOptions } from '@tanstack/virtual-core'
import type { Ref } from 'vue'

export * from '@tanstack/virtual-core'

type MaybeRef<T> = T | Ref<T>

function useVirtualizerBase<
  TScrollElement extends Element | Window,
  TItemElement extends Element,
>(
  options: MaybeRef<VirtualizerOptions<TScrollElement, TItemElement>>,
): Ref<Virtualizer<TScrollElement, TItemElement>> {
  const virtualizer = new Virtualizer(unref(options))
  const state = shallowRef(virtualizer)

  const cleanup = virtualizer._didMount()

  watch(
    () => unref(options).getScrollElement(),
    (el) => {
      if (el) {
        virtualizer._willUpdate()
      }
    },
    {
      immediate: true,
    },
  )

  watch(
    () => unref(options),
    (options) => {
      virtualizer.setOptions({
        ...options,
        onChange: (instance, sync) => {
          triggerRef(state)
          options.onChange?.(instance, sync)
        },
      })

      virtualizer._willUpdate()
      triggerRef(state)
    },
    {
      immediate: true,
    },
  )

  onScopeDispose(cleanup)

  return state
}

export function useVirtualizer<
  TScrollElement extends Element,
  TItemElement extends Element,
>(
  options: MaybeRef<
    PartialKeys<
      VirtualizerOptions<TScrollElement, TItemElement>,
      'observeElementRect' | 'observeElementOffset' | 'scrollToFn'
    >
  >,
): Ref<Virtualizer<TScrollElement, TItemElement>> {
  return useVirtualizerBase<TScrollElement, TItemElement>(
    computed(() => ({
      observeElementRect: observeElementRect,
      observeElementOffset: observeElementOffset,
      scrollToFn: elementScroll,
      ...unref(options),
    })),
  )
}

export function useWindowVirtualizer<TItemElement extends Element>(
  options: MaybeRef<
    PartialKeys<
      VirtualizerOptions<Window, TItemElement>,
      | 'observeElementRect'
      | 'observeElementOffset'
      | 'scrollToFn'
      | 'getScrollElement'
    >
  >,
): Ref<Virtualizer<Window, TItemElement>> {
  return useVirtualizerBase<Window, TItemElement>(
    computed(() => ({
      getScrollElement: () => (typeof document !== 'undefined' ? window : null),
      observeElementRect: observeWindowRect,
      observeElementOffset: observeWindowOffset,
      scrollToFn: windowScroll,
      initialOffset: () =>
        typeof document !== 'undefined' ? window.scrollY : 0,
      ...unref(options),
    })),
  )
}
