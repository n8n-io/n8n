import type { Ref } from 'vue'
import type { Direction, ResizeEvent } from './types'
import { getResizeEventCoordinates } from './events'
import { intersects } from './rects'
import { compare } from './stackingOrder'
import { resetGlobalCursorStyle, setGlobalCursorStyle } from './style'

export type ResizeHandlerAction = 'down' | 'move' | 'up'
export type SetResizeHandlerState = (
  action: ResizeHandlerAction,
  isActive: boolean,
  event: ResizeEvent
) => void

export type PointerHitAreaMargins = {
  coarse: number
  fine: number
}

export type ResizeHandlerData = {
  direction: Ref<Direction>
  element: HTMLElement
  hitAreaMargins: PointerHitAreaMargins
  nonce: Ref<string | undefined>
  setResizeHandlerState: SetResizeHandlerState
}

export const EXCEEDED_HORIZONTAL_MIN = 0b0001
export const EXCEEDED_HORIZONTAL_MAX = 0b0010
export const EXCEEDED_VERTICAL_MIN = 0b0100
export const EXCEEDED_VERTICAL_MAX = 0b1000

function getInputType(): 'coarse' | 'fine' | undefined {
  if (typeof matchMedia === 'function')
    return matchMedia('(pointer:coarse)').matches ? 'coarse' : 'fine'
}

const isCoarsePointer = getInputType() === 'coarse'

const intersectingHandles: ResizeHandlerData[] = []
let isPointerDown = false
const ownerDocumentCounts: Map<Document, number> = new Map()
const panelConstraintFlags: Map<string, number> = new Map()

const registeredResizeHandlers = new Set<ResizeHandlerData>()

export function registerResizeHandle(
  resizeHandleId: string,
  element: HTMLElement,
  direction: Ref<Direction>,
  hitAreaMargins: PointerHitAreaMargins,
  nonce: Ref<string | undefined>,
  setResizeHandlerState: SetResizeHandlerState,
) {
  const { ownerDocument } = element

  const data: ResizeHandlerData = {
    direction,
    element,
    hitAreaMargins,
    nonce,
    setResizeHandlerState,
  }

  const count = ownerDocumentCounts.get(ownerDocument) ?? 0
  ownerDocumentCounts.set(ownerDocument, count + 1)

  registeredResizeHandlers.add(data)

  updateListeners()

  return function unregisterResizeHandle() {
    panelConstraintFlags.delete(resizeHandleId)
    registeredResizeHandlers.delete(data)

    const count = ownerDocumentCounts.get(ownerDocument) ?? 1
    ownerDocumentCounts.set(ownerDocument, count - 1)

    updateListeners()
    resetGlobalCursorStyle()

    if (count === 1)
      ownerDocumentCounts.delete(ownerDocument)
  }
}

function handlePointerDown(event: ResizeEvent) {
  const { target } = event
  const { x, y } = getResizeEventCoordinates(event)

  isPointerDown = true

  recalculateIntersectingHandles({ target, x, y })
  updateListeners()

  if (intersectingHandles.length > 0) {
    updateResizeHandlerStates('down', event)

    event.preventDefault()
  }
}

function handlePointerMove(event: ResizeEvent) {
  const { x, y } = getResizeEventCoordinates(event)

  if (!isPointerDown) {
    const { target } = event

    // Recalculate intersecting handles whenever the pointer moves, except if it has already been pressed
    // at that point, the handles may not move with the pointer (depending on constraints)
    // but the same set of active handles should be locked until the pointer is released
    recalculateIntersectingHandles({ target, x, y })
  }

  updateResizeHandlerStates('move', event)

  // Update cursor based on return value(s) from active handles
  updateCursor()

  if (intersectingHandles.length > 0)
    event.preventDefault()
}

function handlePointerUp(event: ResizeEvent) {
  const { target } = event
  const { x, y } = getResizeEventCoordinates(event)

  panelConstraintFlags.clear()
  isPointerDown = false

  if (intersectingHandles.length > 0)
    event.preventDefault()

  updateResizeHandlerStates('up', event)
  recalculateIntersectingHandles({ target, x, y })
  updateCursor()

  updateListeners()
}

function recalculateIntersectingHandles({
  target,
  x,
  y,
}: {
  target: EventTarget | null
  x: number
  y: number
}) {
  intersectingHandles.splice(0)

  let targetElement: HTMLElement | null = null
  if (target instanceof HTMLElement)
    targetElement = target

  registeredResizeHandlers.forEach((data) => {
    const { element: dragHandleElement, hitAreaMargins } = data

    const dragHandleRect = dragHandleElement.getBoundingClientRect()
    const { bottom, left, right, top } = dragHandleRect

    const margin = isCoarsePointer
      ? hitAreaMargins.coarse
      : hitAreaMargins.fine

    const eventIntersects
      = x >= left - margin
        && x <= right + margin
        && y >= top - margin
        && y <= bottom + margin

    if (eventIntersects) {
      // TRICKY
      // We listen for pointers events at the root in order to support hit area margins
      // (determining when the pointer is close enough to an element to be considered a "hit")
      // Clicking on an element "above" a handle (e.g. a modal) should prevent a hit though
      // so at this point we need to compare stacking order of a potentially intersecting drag handle,
      // and the element that was actually clicked/touched
      if (
        targetElement !== null
        && dragHandleElement !== targetElement
        && !dragHandleElement.contains(targetElement)
        && !targetElement.contains(dragHandleElement)
        // Calculating stacking order has a cost, so we should avoid it if possible
        // That is why we only check potentially intersecting handles,
        // and why we skip if the event target is within the handle's DOM
        && compare(targetElement, dragHandleElement) > 0
      ) {
        // If the target is above the drag handle, then we also need to confirm they overlap
        // If they are beside each other (e.g. a panel and its drag handle) then the handle is still interactive
        //
        // It's not enough to compare only the target
        // The target might be a small element inside of a larger container
        // (For example, a SPAN or a DIV inside of a larger modal dialog)
        let currentElement: HTMLElement | null = targetElement
        let didIntersect = false
        while (currentElement) {
          if (currentElement.contains(dragHandleElement)) {
            break
          }
          else if (
            intersects(
              currentElement.getBoundingClientRect(),
              dragHandleRect,
              true,
            )
          ) {
            didIntersect = true
            break
          }

          currentElement = currentElement.parentElement
        }

        if (didIntersect)
          return
      }

      intersectingHandles.push(data)
    }
  })
}

export function reportConstraintsViolation(
  resizeHandleId: string,
  flag: number,
) {
  panelConstraintFlags.set(resizeHandleId, flag)
}

function updateCursor() {
  let intersectsHorizontal = false
  let intersectsVertical = false
  let nonce: string | undefined

  intersectingHandles.forEach((data) => {
    const { direction, nonce: _nonce } = data

    if (direction.value === 'horizontal')
      intersectsHorizontal = true
    else
      intersectsVertical = true

    nonce = _nonce.value
  })

  let constraintFlags = 0
  panelConstraintFlags.forEach((flag) => {
    constraintFlags |= flag
  })

  if (intersectsHorizontal && intersectsVertical)
    setGlobalCursorStyle('intersection', constraintFlags, nonce)
  else if (intersectsHorizontal)
    setGlobalCursorStyle('horizontal', constraintFlags, nonce)
  else if (intersectsVertical)
    setGlobalCursorStyle('vertical', constraintFlags, nonce)
  else
    resetGlobalCursorStyle()
}

function updateListeners() {
  ownerDocumentCounts.forEach((_, ownerDocument) => {
    const { body } = ownerDocument

    body.removeEventListener('contextmenu', handlePointerUp)
    body.removeEventListener('mousedown', handlePointerDown)
    body.removeEventListener('mouseleave', handlePointerMove)
    body.removeEventListener('mousemove', handlePointerMove)
    body.removeEventListener('touchmove', handlePointerMove)
    body.removeEventListener('touchstart', handlePointerDown)
  })

  window.removeEventListener('mouseup', handlePointerUp)
  window.removeEventListener('touchcancel', handlePointerUp)
  window.removeEventListener('touchend', handlePointerUp)

  if (registeredResizeHandlers.size > 0) {
    if (isPointerDown) {
      if (intersectingHandles.length > 0) {
        ownerDocumentCounts.forEach((count, ownerDocument) => {
          const { body } = ownerDocument

          if (count > 0) {
            body.addEventListener('contextmenu', handlePointerUp)
            body.addEventListener('mouseleave', handlePointerMove)
            body.addEventListener('mousemove', handlePointerMove)
            body.addEventListener('touchmove', handlePointerMove, {
              passive: false,
            })
          }
        })
      }

      window.addEventListener('mouseup', handlePointerUp)
      window.addEventListener('touchcancel', handlePointerUp)
      window.addEventListener('touchend', handlePointerUp)
    }
    else {
      ownerDocumentCounts.forEach((count, ownerDocument) => {
        const { body } = ownerDocument

        if (count > 0) {
          body.addEventListener('mousedown', handlePointerDown)
          body.addEventListener('mousemove', handlePointerMove)
          body.addEventListener('touchmove', handlePointerMove, {
            passive: false,
          })
          body.addEventListener('touchstart', handlePointerDown)
        }
      })
    }
  }
}

function updateResizeHandlerStates(
  action: ResizeHandlerAction,
  event: ResizeEvent,
) {
  registeredResizeHandlers.forEach((data) => {
    const { setResizeHandlerState } = data

    const isActive = intersectingHandles.includes(data)

    setResizeHandlerState(action, isActive, event)
  })
}
