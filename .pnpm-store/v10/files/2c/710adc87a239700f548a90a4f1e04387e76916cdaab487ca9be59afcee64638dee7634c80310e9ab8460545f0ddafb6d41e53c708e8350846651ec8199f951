import type { MaybeRefOrGetter } from 'vue'
import type { HandleType, NodeConnection } from '../types'

export interface UseNodeConnectionsParams {
  handleType?: MaybeRefOrGetter<HandleType | null | undefined>
  handleId?: MaybeRefOrGetter<string | null | undefined>
  nodeId?: MaybeRefOrGetter<string | null | undefined>
  onConnect?: (connections: NodeConnection[]) => void
  onDisconnect?: (connections: NodeConnection[]) => void
}
/**
 * Hook to retrieve all edges connected to a node. Can be filtered by handle type and id.
 *
 * @public
 * @param params
 * @param params.handleType - handle type `source` or `target`
 * @param params.nodeId - node id - if not provided, the node id from the `useNodeId` (meaning, the context-based injection) is used
 * @param params.handleId - the handle id (this is required if the node has multiple handles of the same type)
 * @param params.onConnect - gets called when a connection is created
 * @param params.onDisconnect - gets called when a connection is removed
 *
 * @returns An array of connections
 */
export declare function useNodeConnections(params?: UseNodeConnectionsParams): import('vue').ComputedRef<NodeConnection[]>
