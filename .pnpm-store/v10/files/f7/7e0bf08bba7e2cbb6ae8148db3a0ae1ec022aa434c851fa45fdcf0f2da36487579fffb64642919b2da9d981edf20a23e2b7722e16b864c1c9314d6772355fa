import type { CustomEvent, ElementData } from '../types'

/**
 * Composable that provides access to an edge object and it's dom element
 *
 * If no edge id is provided, the edge id is injected from context
 *
 * If you do not provide an id, this composable has to be called in a child of your custom edge component, or it will throw
 *
 * @public
 * @param id - The id of the edge to access
 * @returns the edge id, the edge and the edge dom element
 */
export declare function useEdge<Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id?: string,
): {
  id: string
  edge: import('../types').GraphEdge<Data, CustomEvents>
  edgeEl: import('vue').Ref<SVGElement | null>
}
