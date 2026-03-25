import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { HandleConnection, HandleType } from '../types'

export interface UseHandleConnectionsParams {
  type: MaybeRefOrGetter<HandleType>
  id?: MaybeRefOrGetter<string | null>
  nodeId?: MaybeRefOrGetter<string | null>
  onConnect?: (connections: HandleConnection[]) => void
  onDisconnect?: (connections: HandleConnection[]) => void
}
/**
 * Composable that returns existing connections of a `<Handle />`.
 *
 * @deprecated use `useNodeConnections` instead
 * @public
 * @param params
 * @param params.type - handle type `source` or `target`
 * @param params.nodeId - node id - if not provided, the node id from the `useNodeId` (meaning, the context-based injection) is used
 * @param params.id - the handle id (this is required if the node has multiple handles of the same type)
 * @param params.onConnect - gets called when a connection is created
 * @param params.onDisconnect - gets called when a connection is removed
 *
 * @returns An array of connections
 */
export declare function useHandleConnections(params: UseHandleConnectionsParams): ComputedRef<HandleConnection[]>
