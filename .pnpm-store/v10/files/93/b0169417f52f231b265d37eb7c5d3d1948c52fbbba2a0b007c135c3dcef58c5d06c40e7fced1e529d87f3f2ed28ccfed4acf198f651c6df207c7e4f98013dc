import type { CSSProperties } from 'vue'
import type { PanelData } from '../SplitterPanel.vue'
import type { DragState } from './types'
import {
  EXCEEDED_HORIZONTAL_MAX,
  EXCEEDED_HORIZONTAL_MIN,
  EXCEEDED_VERTICAL_MAX,
  EXCEEDED_VERTICAL_MIN,
} from './registry'

type CursorState = 'horizontal' | 'intersection' | 'vertical'

let currentCursorStyle: string | null = null
let styleElement: HTMLStyleElement | null = null

export function getCursorStyle(
  state: CursorState,
  constraintFlags: number,
): string {
  if (constraintFlags) {
    const horizontalMin = (constraintFlags & EXCEEDED_HORIZONTAL_MIN) !== 0
    const horizontalMax = (constraintFlags & EXCEEDED_HORIZONTAL_MAX) !== 0
    const verticalMin = (constraintFlags & EXCEEDED_VERTICAL_MIN) !== 0
    const verticalMax = (constraintFlags & EXCEEDED_VERTICAL_MAX) !== 0

    if (horizontalMin) {
      if (verticalMin)
        return 'se-resize'
      else if (verticalMax)
        return 'ne-resize'
      else
        return 'e-resize'
    }
    else if (horizontalMax) {
      if (verticalMin)
        return 'sw-resize'
      else if (verticalMax)
        return 'nw-resize'
      else
        return 'w-resize'
    }
    else if (verticalMin) {
      return 's-resize'
    }
    else if (verticalMax) {
      return 'n-resize'
    }
  }

  switch (state) {
    case 'horizontal':
      return 'ew-resize'
    case 'intersection':
      return 'move'
    case 'vertical':
      return 'ns-resize'
  }
}

export function resetGlobalCursorStyle() {
  if (styleElement !== null) {
    document.head.removeChild(styleElement)

    currentCursorStyle = null
    styleElement = null
  }
}

export function setGlobalCursorStyle(
  state: CursorState,
  constraintFlags: number,
  nonce?: string,
) {
  const style = getCursorStyle(state, constraintFlags)

  if (currentCursorStyle === style)
    return

  currentCursorStyle = style

  if (styleElement === null) {
    styleElement = document.createElement('style')
    if (nonce)
      styleElement.nonce = nonce
    document.head.appendChild(styleElement)
  }

  styleElement.innerHTML = `*{cursor: ${style}!important;}`
}

// the % of the group's overall space this panel should occupy.
export function computePanelFlexBoxStyle({
  defaultSize,
  dragState,
  layout,
  panelData,
  panelIndex,
  precision = 3,
}: {
  defaultSize: number | undefined
  layout: number[]
  dragState: DragState | null
  panelData: PanelData[]
  panelIndex: number
  precision?: number
}): CSSProperties {
  const size = layout[panelIndex]

  let flexGrow
  if (size == null) {
    // Initial render (before panels have registered themselves)
    // In order to support server rendering, fall back to default size if provided
    flexGrow
      = defaultSize !== undefined ? defaultSize.toPrecision(precision) : '1'
  }
  else if (panelData.length === 1) {
    // Special case: Single panel group should always fill full width/height
    flexGrow = '1'
  }
  else {
    flexGrow = size.toPrecision(precision)
  }

  return {
    flexBasis: 0,
    flexGrow,
    flexShrink: 1,

    // Without this, Panel sizes may be unintentionally overridden by their content
    overflow: 'hidden',

    // Disable pointer events inside of a panel during resize
    // This avoid edge cases like nested iframes
    pointerEvents: dragState !== null ? 'none' : undefined,
  }
}
