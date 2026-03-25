import type { MaybeRefOrGetter } from 'vue'
import type { Connection, HandleType, MouseTouchEvent, ValidConnectionFunc } from '../types'

export interface UseHandleProps {
  handleId: MaybeRefOrGetter<string | null>
  nodeId: MaybeRefOrGetter<string>
  type: MaybeRefOrGetter<HandleType>
  isValidConnection?: MaybeRefOrGetter<ValidConnectionFunc | null>
  edgeUpdaterType?: MaybeRefOrGetter<HandleType>
  onEdgeUpdate?: (event: MouseTouchEvent, connection: Connection) => void
  onEdgeUpdateEnd?: (event: MouseTouchEvent) => void
}
/**
 * This composable provides listeners for handle events
 *
 * Generally it's recommended to use the `<Handle />` component instead of this composable.
 *
 * @public
 */
export declare function useHandle({
  handleId,
  nodeId,
  type,
  isValidConnection,
  edgeUpdaterType,
  onEdgeUpdate,
  onEdgeUpdateEnd,
}: UseHandleProps): {
  handlePointerDown: (event: MouseTouchEvent) => void
  handleClick: (event: MouseEvent) => void
}
