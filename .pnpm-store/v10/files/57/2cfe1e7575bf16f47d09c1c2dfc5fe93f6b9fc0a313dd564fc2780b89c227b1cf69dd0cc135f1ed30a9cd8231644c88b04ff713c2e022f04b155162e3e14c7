import type { PanelData } from '../SplitterPanel.vue'
import { assert } from './assert'
import { fuzzyNumbersEqual } from './compare'

// Layout should be pre-converted into percentages
export function callPanelCallbacks(
  panelsArray: PanelData[],
  layout: number[],
  panelIdToLastNotifiedSizeMap: Record<string, number>,
  groupSizeInPixels?: number | null,
) {
  layout.forEach((size, index) => {
    const panelData = panelsArray[index]
    assert(panelData)

    const { callbacks, constraints, id: panelId } = panelData
    const { collapsedSize = 0, collapsible, sizeUnit } = constraints

    // Convert size to native units for px panels
    let displaySize = size
    if (sizeUnit === 'px' && groupSizeInPixels != null) {
      displaySize = (size / 100) * groupSizeInPixels
    }

    const lastNotifiedSize = panelIdToLastNotifiedSizeMap[panelId]
    if (lastNotifiedSize == null || !fuzzyNumbersEqual(displaySize, lastNotifiedSize)) {
      panelIdToLastNotifiedSizeMap[panelId] = displaySize

      const { onCollapse, onExpand, onResize } = callbacks

      if (onResize)
        onResize(displaySize, lastNotifiedSize)

      if (collapsible && (onCollapse || onExpand)) {
        if (
          onExpand
          && (lastNotifiedSize == null || fuzzyNumbersEqual(lastNotifiedSize, collapsedSize))
          && !fuzzyNumbersEqual(displaySize, collapsedSize)
        ) {
          onExpand()
        }

        if (
          onCollapse
          && (lastNotifiedSize == null || !fuzzyNumbersEqual(lastNotifiedSize, collapsedSize))
          && fuzzyNumbersEqual(displaySize, collapsedSize)
        ) {
          onCollapse()
        }
      }
    }
  })
}
