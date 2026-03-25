import { getActiveElement } from '@/shared'

export type Orientation = 'vertical' | 'horizontal'
export type Direction = 'ltr' | 'rtl'

export function getOpenState(open: boolean) {
  return open ? 'open' : 'closed'
}

export function makeTriggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`
}

export function makeContentId(baseId: string, value: string) {
  return `${baseId}-content-${value}`
}

export const LINK_SELECT = 'navigationMenu.linkSelect'
export const EVENT_ROOT_CONTENT_DISMISS = 'navigationMenu.rootContentDismiss'

/**
 * Returns a list of potential tabbable candidates.
 *
 * NOTE: This is only a close approximation. For example it doesn't take into account cases like when
 * elements are not visible. This cannot be worked out easily by just reading a property, but rather
 * necessitate runtime knowledge (computed styles, etc). We deal with these cases separately.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
 * Credit: https://github.com/discord/focus-layers/blob/master/src/util/wrapFocus.tsx#L1
 */
export function getTabbableCandidates(container: HTMLElement) {
  const nodes: HTMLElement[] = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: any) => {
      const isHiddenInput = node.tagName === 'INPUT' && node.type === 'hidden'
      if (node.disabled || node.hidden || isHiddenInput)
        return NodeFilter.FILTER_SKIP
      // `.tabIndex` is not the same as the `tabindex` attribute. It works on the
      // runtime's understanding of tabbability, so this automatically accounts
      // for any kind of element that could be tabbed to.
      return node.tabIndex >= 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP
    },
  })
  while (walker.nextNode()) nodes.push(walker.currentNode as HTMLElement)
  // we do not take into account the order of nodes with positive `tabIndex` as it
  // hinders accessibility to have tab order different from visual order.
  return nodes
}

export function focusFirst(candidates: HTMLElement[]) {
  const previouslyFocusedElement = getActiveElement()
  return candidates.some((candidate) => {
    // if focus is already where we want to go, we don't want to keep going through the candidates
    if (candidate === previouslyFocusedElement)
      return true
    candidate.focus()
    return getActiveElement() !== previouslyFocusedElement
  })
}

export function removeFromTabOrder(candidates: HTMLElement[]) {
  candidates.forEach((candidate) => {
    candidate.dataset.tabindex = candidate.getAttribute('tabindex') || ''
    candidate.setAttribute('tabindex', '-1')
  })
  return () => {
    candidates.forEach((candidate) => {
      const prevTabIndex = candidate.dataset.tabindex as string
      candidate.setAttribute('tabindex', prevTabIndex)
    })
  }
}

export function whenMouse<E extends PointerEvent>(handler: (event?: E) => void) {
  return (event: E) => (event.pointerType === 'mouse' ? handler(event) : undefined)
}
