import type { Ref } from 'vue'
import type { PanelData } from '../../SplitterPanel.vue'
import { watchEffect } from 'vue'
import { assert } from '../assert'
import { calculateAriaValues } from '../calculate'
import { fuzzyNumbersEqual } from '../compare'
import { getPanelGroupElement, getResizeHandleElementsForGroup, getResizeHandlePanelIds } from '../dom'
import { adjustLayoutByDelta } from '../layout'
import { determinePivotIndices } from '../pivot'

// https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/

export function useWindowSplitterPanelGroupBehavior({
  eagerValuesRef,
  groupId,
  layout,
  panelDataArray,
  panelGroupElement,
  setLayout,
}: {
  eagerValuesRef: Ref<{
    panelDataArray: PanelData[]
  }>
  groupId: string
  layout: Ref<number[]>
  panelDataArray: PanelData[]
  panelGroupElement: Ref<ParentNode | null>
  setLayout: (sizes: number[]) => void
}): void {
  watchEffect((onCleanup) => {
    const _panelGroupElement = panelGroupElement.value
    if (!_panelGroupElement)
      return

    const resizeHandleElements = getResizeHandleElementsForGroup(
      groupId,
      _panelGroupElement,
    )

    for (let index = 0; index < panelDataArray.length - 1; index++) {
      const { valueMax, valueMin, valueNow } = calculateAriaValues({
        layout: layout.value,
        panelsArray: panelDataArray,
        pivotIndices: [index, index + 1],
      })

      const resizeHandleElement = resizeHandleElements[index]
      if (resizeHandleElement == null) {
        if (import.meta.env.DEV)
          console.warn(`WARNING: Missing resize handle for PanelGroup "${groupId}"`)
      }
      else {
        const panelData = panelDataArray[index]
        assert(panelData)

        resizeHandleElement.setAttribute('aria-controls', panelData.id)
        resizeHandleElement.setAttribute(
          'aria-valuemax',
          `${Math.round(valueMax)}`,
        )
        resizeHandleElement.setAttribute(
          'aria-valuemin',
          `${Math.round(valueMin)}`,
        )
        resizeHandleElement.setAttribute(
          'aria-valuenow',
          valueNow != null ? `${Math.round(valueNow)}` : '',
        )
      }
    }

    onCleanup(() => {
      resizeHandleElements.forEach((resizeHandleElement) => {
        resizeHandleElement.removeAttribute('aria-controls')
        resizeHandleElement.removeAttribute('aria-valuemax')
        resizeHandleElement.removeAttribute('aria-valuemin')
        resizeHandleElement.removeAttribute('aria-valuenow')
      })
    })
  })

  watchEffect((onCleanup) => {
    const _panelGroupElement = panelGroupElement.value
    if (!_panelGroupElement)
      return

    const eagerValues = eagerValuesRef.value
    assert(eagerValues)

    const { panelDataArray } = eagerValues
    const groupElement = getPanelGroupElement(groupId, _panelGroupElement)
    assert(groupElement != null, `No group found for id "${groupId}"`)

    const handles = getResizeHandleElementsForGroup(groupId, _panelGroupElement)
    assert(handles)

    const cleanupFunctions = handles.map((handle) => {
      const handleId = handle.getAttribute('data-panel-resize-handle-id')
      assert(handleId)

      const [idBefore, idAfter] = getResizeHandlePanelIds(
        groupId,
        handleId,
        panelDataArray,
        _panelGroupElement,
      )
      if (idBefore == null || idAfter == null)
        return () => {}

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented)
          return

        switch (event.key) {
          case 'Enter': {
            event.preventDefault()

            const index = panelDataArray.findIndex(
              panelData => panelData.id === idBefore,
            )
            if (index >= 0) {
              const panelData = panelDataArray[index]
              assert(panelData)

              const size = layout.value[index]

              const {
                collapsedSize = 0,
                collapsible,
                minSize = 0,
              } = panelData.constraints

              if (size != null && collapsible) {
                const nextLayout = adjustLayoutByDelta({
                  delta: fuzzyNumbersEqual(size, collapsedSize)
                    ? minSize - collapsedSize
                    : collapsedSize - size,
                  layout: layout.value,
                  panelConstraints: panelDataArray.map(
                    panelData => panelData.constraints,
                  ),
                  pivotIndices: determinePivotIndices(
                    groupId,
                    handleId,
                    _panelGroupElement,
                  ),
                  trigger: 'keyboard',
                })
                if (layout.value !== nextLayout)
                  setLayout(nextLayout)
              }
            }
            break
          }
        }
      }

      handle.addEventListener('keydown', onKeyDown)
      return () => {
        handle.removeEventListener('keydown', onKeyDown)
      }
    })

    onCleanup(() => {
      cleanupFunctions.forEach(cleanupFunction => cleanupFunction())
    })
  })
}
