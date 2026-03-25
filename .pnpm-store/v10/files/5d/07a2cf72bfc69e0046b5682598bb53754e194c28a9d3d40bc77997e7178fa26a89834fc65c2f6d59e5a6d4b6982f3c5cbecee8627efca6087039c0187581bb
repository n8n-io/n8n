import type { Direction, ResizeEvent } from './types'

export function isKeyDown(event: ResizeEvent): event is KeyboardEvent {
  return event.type === 'keydown'
}

export function isMouseEvent(event: ResizeEvent): event is MouseEvent {
  return event.type.startsWith('mouse')
}

export function isTouchEvent(event: ResizeEvent): event is TouchEvent {
  return event.type.startsWith('touch')
}

export function getResizeEventCoordinates(event: ResizeEvent) {
  if (isMouseEvent(event)) {
    return {
      x: event.clientX,
      y: event.clientY,
    }
  }
  else if (isTouchEvent(event)) {
    const touch = event.touches[0]
    if (touch && touch.clientX && touch.clientY) {
      return {
        x: touch.clientX,
        y: touch.clientY,
      }
    }
  }

  return {
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
  }
}

export function getResizeEventCursorPosition(
  direction: Direction,
  event: ResizeEvent,
): number {
  const isHorizontal = direction === 'horizontal'

  const { x, y } = getResizeEventCoordinates(event)

  return isHorizontal ? x : y
}
