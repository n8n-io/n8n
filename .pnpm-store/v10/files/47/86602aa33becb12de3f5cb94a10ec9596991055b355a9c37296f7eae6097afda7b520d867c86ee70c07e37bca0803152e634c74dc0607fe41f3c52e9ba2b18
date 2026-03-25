import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { GraphNode, Node } from '../types'

interface NodeData<NodeType extends Node = GraphNode> {
  id: string
  type: NodeType['type']
  data: NonNullable<NodeType['data']>
}
/**
 * Composable for receiving data of one or multiple nodes
 *
 * @public
 * @param nodeId - The id (or ids) of the node to get the data from
 * @param guard - Optional guard function to narrow down the node type
 * @returns An array of data objects
 */
export declare function useNodesData<NodeType extends Node = GraphNode>(
  nodeId: MaybeRefOrGetter<string>,
): ComputedRef<NodeData<NodeType> | null>
export declare function useNodesData<NodeType extends Node = GraphNode>(
  nodeIds: MaybeRefOrGetter<string[]>,
): ComputedRef<NodeData<NodeType>[]>
export declare function useNodesData<NodeType extends Node = GraphNode>(
  nodeIds: MaybeRefOrGetter<string[]>,
  guard: (node: Node) => node is NodeType,
): ComputedRef<NodeData<NodeType>[]>
export {}
