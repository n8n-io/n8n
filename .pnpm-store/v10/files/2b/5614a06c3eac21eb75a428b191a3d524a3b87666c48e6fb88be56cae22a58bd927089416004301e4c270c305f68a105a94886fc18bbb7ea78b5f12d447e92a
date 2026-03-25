import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { Edge, GraphEdge } from '../types'

interface EdgeData<EdgeType extends Edge = GraphEdge> {
  id: string
  type: EdgeType['type']
  data: NonNullable<EdgeType['data']> | null
}
/**
 * Composable for receiving data of one or multiple nodes
 *
 * @public
 * @param edgeId - The id (or ids) of the node to get the data from
 * @param guard - Optional guard function to narrow down the node type
 * @returns An array of data objects
 */
export declare function useEdgesData<EdgeType extends Edge = GraphEdge>(
  edgeId: MaybeRefOrGetter<string>,
): ComputedRef<EdgeData<EdgeType> | null>
export declare function useEdgesData<EdgeType extends Edge = GraphEdge>(
  edgeIds: MaybeRefOrGetter<string[]>,
): ComputedRef<EdgeData<EdgeType>[]>
export declare function useEdgesData<EdgeType extends Edge = GraphEdge>(
  edgeIds: MaybeRefOrGetter<string[]>,
  guard: (node: Edge) => node is EdgeType,
): ComputedRef<EdgeData<EdgeType>[]>
export {}
