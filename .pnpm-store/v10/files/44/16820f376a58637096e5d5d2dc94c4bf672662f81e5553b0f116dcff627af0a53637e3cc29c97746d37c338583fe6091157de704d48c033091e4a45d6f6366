import { getActiveElement } from '@/shared'

export type CheckedState = boolean | 'indeterminate'
export type Direction = 'ltr' | 'rtl'

export const ITEM_NAME = 'MenuItem'
export const ITEM_SELECT = 'menu.itemSelect'
export const SELECTION_KEYS = ['Enter', ' ']
export const FIRST_KEYS = ['ArrowDown', 'PageUp', 'Home']
export const LAST_KEYS = ['ArrowUp', 'PageDown', 'End']
export const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS]
export const SUB_OPEN_KEYS: Record<Direction, string[]> = {
  ltr: [...SELECTION_KEYS, 'ArrowRight'],
  rtl: [...SELECTION_KEYS, 'ArrowLeft'],
}
export const SUB_CLOSE_KEYS: Record<Direction, string[]> = {
  ltr: ['ArrowLeft'],
  rtl: ['ArrowRight'],
}

export function getOpenState(open: boolean) {
  return open ? 'open' : 'closed'
}

export function isIndeterminate(
  checked?: CheckedState,
): checked is 'indeterminate' {
  return checked === 'indeterminate'
}

export function getCheckedState(checked: CheckedState) {
  return isIndeterminate(checked)
    ? 'indeterminate'
    : checked
      ? 'checked'
      : 'unchecked'
}

export function focusFirst(candidates: HTMLElement[]) {
  const PREVIOUSLY_FOCUSED_ELEMENT = getActiveElement()
  for (const candidate of candidates) {
    // if focus is already where we want to go, we don't want to keep going through the candidates
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT)
      return
    candidate.focus()
    if (getActiveElement() !== PREVIOUSLY_FOCUSED_ELEMENT)
      return
  }
}

export interface Point {
  x: number
  y: number
}
export type Polygon = Point[]
export type Side = 'left' | 'right'
export interface GraceIntent {
  area: Polygon
  side: Side
}

// Determine if a point is inside of a polygon.
// Based on https://github.com/substack/point-in-polygon
export function isPointInPolygon(point: Point, polygon: Polygon) {
  const { x, y } = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect)
      inside = !inside
  }

  return inside
}

export function isPointerInGraceArea(event: PointerEvent, area?: Polygon) {
  if (!area)
    return false
  const cursorPos = { x: event.clientX, y: event.clientY }
  return isPointInPolygon(cursorPos, area)
}

export function isMouseEvent(event: PointerEvent) {
  return event.pointerType === 'mouse'
}
