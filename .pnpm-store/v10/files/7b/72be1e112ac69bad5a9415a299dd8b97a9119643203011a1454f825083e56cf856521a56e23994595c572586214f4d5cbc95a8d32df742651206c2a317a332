import type { PanelData } from '../SplitterPanel.vue'
import { isBrowser } from '@/shared'

export function getPanelElement(
  id: string,
  scope: ParentNode | HTMLElement = document,
): HTMLElement | null {
  if (!isBrowser)
    return null
  const element = scope.querySelector(`[data-panel-id="${id}"]`)
  if (element)
    return element as HTMLElement

  return null
}

export function getPanelElementsForGroup(
  groupId: string,
  scope: ParentNode | HTMLElement = document,
): HTMLElement[] {
  if (!isBrowser)
    return []
  return Array.from(
    scope.querySelectorAll(`[data-panel][data-panel-group-id="${groupId}"]`),
  )
}

export function getPanelGroupElement(
  id: string,
  rootElement: ParentNode | HTMLElement = document,
): HTMLElement | null {
  if (!isBrowser)
    return null
  // If the root element is the PanelGroup
  if (
    rootElement instanceof HTMLElement
    && (rootElement as HTMLElement)?.dataset?.panelGroupId === id
  ) {
    return rootElement as HTMLElement
  }

  // Else query children
  const element = rootElement.querySelector(
    `[data-panel-group][data-panel-group-id="${id}"]`,
  )
  if (element)
    return element as HTMLElement

  return null
}

export function getResizeHandleElement(
  id: string,
  scope: ParentNode | HTMLElement = document,
): HTMLElement | null {
  if (!isBrowser)
    return null
  const element = scope.querySelector(`[data-panel-resize-handle-id="${id}"]`)
  if (element)
    return element as HTMLElement

  return null
}

export function getResizeHandleElementIndex(
  groupId: string,
  id: string,
  scope: ParentNode | HTMLElement = document,
): number | null {
  if (!isBrowser)
    return null
  const handles = getResizeHandleElementsForGroup(groupId, scope)
  const index = handles.findIndex(
    handle => handle.getAttribute('data-panel-resize-handle-id') === id,
  )
  return index ?? null
}

export function getResizeHandleElementsForGroup(
  groupId: string,
  scope: ParentNode | HTMLElement = document,
): HTMLElement[] {
  if (!isBrowser)
    return []
  return Array.from(
    scope.querySelectorAll(
      `[data-panel-resize-handle-id][data-panel-group-id="${groupId}"]`,
    ),
  )
}

export function getResizeHandlePanelIds(
  groupId: string,
  handleId: string,
  panelsArray: PanelData[],
  scope: ParentNode | HTMLElement = document,
): [idBefore: string | null, idAfter: string | null] {
  const handle = getResizeHandleElement(handleId, scope)
  const handles = getResizeHandleElementsForGroup(groupId, scope)
  const index = handle ? handles.indexOf(handle) : -1

  const idBefore: string | null = panelsArray[index]?.id ?? null
  const idAfter: string | null = panelsArray[index + 1]?.id ?? null

  return [idBefore, idAfter]
}
