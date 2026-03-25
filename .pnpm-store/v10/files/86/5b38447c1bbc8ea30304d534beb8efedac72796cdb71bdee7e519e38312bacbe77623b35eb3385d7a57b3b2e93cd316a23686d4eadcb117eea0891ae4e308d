import type { PanelConstraints } from '../SplitterPanel.vue'
import { assert } from './assert'
import { fuzzyCompareNumbers } from './compare'
import { PRECISION } from './constants'

// Panel size must be in percentages; pixel values should be pre-converted
export function resizePanel({
  panelConstraints: panelConstraintsArray,
  panelIndex,
  size,
}: {
  panelConstraints: PanelConstraints[]
  panelIndex: number
  size: number
}) {
  const panelConstraints = panelConstraintsArray[panelIndex]
  assert(panelConstraints != null)

  const { collapsedSize = 0, collapsible, maxSize = 100, minSize = 0 } = panelConstraints

  if (fuzzyCompareNumbers(size, minSize) < 0) {
    if (collapsible) {
      // Collapsible panels should snap closed or open only once they cross the halfway point between collapsed and min size.
      const halfwayPoint = (collapsedSize + minSize) / 2
      if (fuzzyCompareNumbers(size, halfwayPoint) < 0)
        size = collapsedSize
      else
        size = minSize
    }
    else {
      size = minSize
    }
  }

  size = Math.min(maxSize, size)
  size = Number.parseFloat(size.toFixed(PRECISION))

  return size
}
