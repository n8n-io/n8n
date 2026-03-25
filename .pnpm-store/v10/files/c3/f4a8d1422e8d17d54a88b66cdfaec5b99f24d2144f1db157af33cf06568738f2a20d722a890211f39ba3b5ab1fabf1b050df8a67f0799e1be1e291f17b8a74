import type { Fn } from '@vueuse/shared'
import {
  createSharedComposable,
  useEventListener,
} from '@vueuse/core'
import { isClient, isIOS, tryOnBeforeUnmount } from '@vueuse/shared'
import { defu } from 'defu'
import { computed, nextTick, ref, watch } from 'vue'
import { injectConfigProviderContext } from '@/ConfigProvider/ConfigProvider.vue'

const useBodyLockStackCount = createSharedComposable(() => {
  const map = ref<Map<string, boolean>>(new Map())
  const initialOverflow = ref<string | undefined>()

  const locked = computed(() => {
    for (const value of map.value.values()) {
      if (value)
        return true
    }
    return false
  })

  const context = injectConfigProviderContext({
    scrollBody: ref(true),
  })

  let stopTouchMoveListener: Fn | null = null

  const resetBodyStyle = () => {
    document.body.style.paddingRight = ''
    document.body.style.marginRight = ''
    document.body.style.pointerEvents = ''
    document.documentElement.style.removeProperty('--scrollbar-width')
    document.body.style.overflow = initialOverflow.value ?? ''
    isIOS && stopTouchMoveListener?.()

    initialOverflow.value = undefined
  }

  watch(locked, (val, oldVal) => {
    if (!isClient)
      return

    if (!val) {
      if (oldVal)
        resetBodyStyle()
      return
    }

    if (initialOverflow.value === undefined)
      initialOverflow.value = document.body.style.overflow

    const verticalScrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const defaultConfig = { padding: verticalScrollbarWidth, margin: 0 }

    const config = context.scrollBody?.value
      ? typeof context.scrollBody.value === 'object'
        ? defu({
            padding: context.scrollBody.value.padding === true ? verticalScrollbarWidth : context.scrollBody.value.padding,
            margin: context.scrollBody.value.margin === true ? verticalScrollbarWidth : context.scrollBody.value.margin,
          }, defaultConfig)
        : defaultConfig
      : ({ padding: 0, margin: 0 })

    if (verticalScrollbarWidth > 0) {
      document.body.style.paddingRight = typeof config.padding === 'number' ? `${config.padding}px` : String(config.padding)
      document.body.style.marginRight = typeof config.margin === 'number' ? `${config.margin}px` : String(config.margin)
      document.documentElement.style.setProperty('--scrollbar-width', `${verticalScrollbarWidth}px`)
      document.body.style.overflow = 'hidden'
    }

    if (isIOS) {
      stopTouchMoveListener = useEventListener(
        document,
        'touchmove',
        (e: TouchEvent) => preventDefault(e),
        { passive: false },
      )
    }

    // let dismissibleLayer set previous pointerEvent first
    nextTick(() => {
      document.body.style.pointerEvents = 'none'
      document.body.style.overflow = 'hidden'
    })
  }, { immediate: true, flush: 'sync' })

  return map
})

export function useBodyScrollLock(initialState?: boolean | undefined) {
  const id = Math.random().toString(36).substring(2, 7) // just simple random id, need not to be cryptographically secure
  const map = useBodyLockStackCount()

  map.value.set(id, initialState ?? false)

  const locked = computed({
    get: () => map.value.get(id) ?? false,
    set: value => map.value.set(id, value),
  })

  tryOnBeforeUnmount(() => {
    map.value.delete(id)
  })

  return locked
}

// Adapt from https://github.com/vueuse/vueuse/blob/main/packages/core/useScrollLock/index.ts#L28C10-L28C24
function checkOverflowScroll(ele: Element): boolean {
  const style = window.getComputedStyle(ele)
  if (
    style.overflowX === 'scroll'
    || style.overflowY === 'scroll'
    || (style.overflowX === 'auto' && ele.clientWidth < ele.scrollWidth)
    || (style.overflowY === 'auto' && ele.clientHeight < ele.scrollHeight)
  ) {
    return true
  }
  else {
    const parent = ele.parentNode

    if (!(parent instanceof Element) || parent.tagName === 'BODY')
      return false

    return checkOverflowScroll(parent)
  }
}

function preventDefault(rawEvent: TouchEvent): boolean {
  const e = rawEvent || window.event

  const _target = e.target

  // Do not prevent if element or parentNodes have overflow: scroll set.
  if (_target instanceof Element && checkOverflowScroll(_target))
    return false

  // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1)
    return true

  if (e.preventDefault && e.cancelable)
    e.preventDefault()

  return false
}
