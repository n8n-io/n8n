import type { D3DragEvent, SubjectPosition } from 'd3-drag'
import type { MaybeRefOrGetter, Ref } from 'vue'
import type { MouseTouchEvent, NodeDragEvent } from '../types'

export type UseDragEvent = D3DragEvent<HTMLDivElement, null, SubjectPosition>
interface UseDragParams {
  onStart: (event: NodeDragEvent) => void
  onDrag: (event: NodeDragEvent) => void
  onStop: (event: NodeDragEvent) => void
  onClick?: (event: MouseTouchEvent) => void
  el: Ref<Element | null>
  disabled?: MaybeRefOrGetter<boolean>
  selectable?: MaybeRefOrGetter<boolean>
  dragHandle?: MaybeRefOrGetter<string | undefined>
  id?: string
}
/**
 * Composable that provides drag behavior for nodes
 *
 * @internal
 * @param params
 */
export declare function useDrag(params: UseDragParams): Ref<boolean>
export {}
