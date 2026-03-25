import type { CustomEvent, ElementData } from '../types'

/**
 * Composable that provides access to a node object, parent node object, connected edges and it's dom element
 *
 * If no node id is provided, the node id is injected from context
 *
 * If you do not provide an id, this composable has to be called in a child of your custom node component, or it will throw
 *
 * @public
 * @param id - The id of the node to access
 * @returns the node id, the node, the node dom element, it's parent and connected edges
 */
export declare function useNode<Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id?: string,
): {
  id: string
  nodeEl: import('vue').Ref<HTMLDivElement | null>
  node: import('../types').GraphNode<Data, CustomEvents, string>
  parentNode: import('vue').ComputedRef<import('../types').GraphNode<any, any, string> | undefined>
  connectedEdges: import('vue').ComputedRef<import('../types').GraphEdge[]>
}
