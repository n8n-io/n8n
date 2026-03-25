import type { Direction, Sizes } from './types'
import { clamp } from '@/shared'

// https://github.com/tmcw-up-for-adoption/simple-linear-scale/blob/master/index.js
function linearScale(
  input: readonly [number, number],
  output: readonly [number, number],
) {
  return (value: number) => {
    if (input[0] === input[1] || output[0] === output[1])
      return output[0]
    const ratio = (output[1] - output[0]) / (input[1] - input[0])
    return output[0] + ratio * (value - input[0])
  }
}

export function getThumbSize(sizes: Sizes) {
  const ratio = getThumbRatio(sizes.viewport, sizes.content)
  const scrollbarPadding
    = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd
  const thumbSize = (sizes.scrollbar.size - scrollbarPadding) * ratio
  // minimum of 18 matches macOS minimum
  return Math.max(thumbSize, 18)
}

export function getThumbRatio(viewportSize: number, contentSize: number) {
  const ratio = viewportSize / contentSize
  return Number.isNaN(ratio) ? 0 : ratio
}

// Custom scroll handler to avoid scroll-linked effects
// https://developer.mozilla.org/en-US/docs/Mozilla/Performance/Scroll-linked_effects
export function addUnlinkedScrollListener(
  node: HTMLElement,
  handler = () => {},
) {
  let prevPosition = { left: node.scrollLeft, top: node.scrollTop }
  let rAF = 0;
  (function loop() {
    const position = { left: node.scrollLeft, top: node.scrollTop }
    const isHorizontalScroll = prevPosition.left !== position.left
    const isVerticalScroll = prevPosition.top !== position.top
    if (isHorizontalScroll || isVerticalScroll)
      handler()
    prevPosition = position
    rAF = window.requestAnimationFrame(loop)
  })()
  return () => window.cancelAnimationFrame(rAF)
}

export function getThumbOffsetFromScroll(
  scrollPos: number,
  sizes: Sizes,
  dir: Direction = 'ltr',
) {
  const thumbSizePx = getThumbSize(sizes)
  const scrollbarPadding
    = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd
  const scrollbar = sizes.scrollbar.size - scrollbarPadding
  const maxScrollPos = sizes.content - sizes.viewport
  const maxThumbPos = scrollbar - thumbSizePx
  const scrollClampRange
    = dir === 'ltr' ? [0, maxScrollPos] : [maxScrollPos * -1, 0]
  const scrollWithoutMomentum = clamp(
    scrollPos,
    scrollClampRange[0],
    scrollClampRange[1],
  )
  const interpolate = linearScale([0, maxScrollPos], [0, maxThumbPos])
  return interpolate(scrollWithoutMomentum)
}

export function toInt(value?: string) {
  return value ? Number.parseInt(value, 10) : 0
}

export function getScrollPositionFromPointer(
  pointerPos: number,
  pointerOffset: number,
  sizes: Sizes,
  dir: Direction = 'ltr',
) {
  const thumbSizePx = getThumbSize(sizes)
  const thumbCenter = thumbSizePx / 2
  const offset = pointerOffset || thumbCenter
  const thumbOffsetFromEnd = thumbSizePx - offset
  const minPointerPos = sizes.scrollbar.paddingStart + offset
  const maxPointerPos
    = sizes.scrollbar.size - sizes.scrollbar.paddingEnd - thumbOffsetFromEnd
  const maxScrollPos = sizes.content - sizes.viewport
  const scrollRange
    = dir === 'ltr' ? [0, maxScrollPos] : [maxScrollPos * -1, 0]
  const interpolate = linearScale(
    [minPointerPos, maxPointerPos],
    scrollRange as [number, number],
  )
  return interpolate(pointerPos)
}

export function isScrollingWithinScrollbarBounds(
  scrollPos: number,
  maxScrollPos: number,
) {
  return scrollPos > 0 && scrollPos < maxScrollPos
}
