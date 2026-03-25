import type { GraphNode, SnapGrid, XYPosition } from '../types'
import type { UseDragEvent } from '../composables'

export declare function isMouseEvent(event: MouseEvent | TouchEvent): event is MouseEvent
export declare function isUseDragEvent(event: any): event is UseDragEvent
export declare function getEventPosition(
  event: MouseEvent | TouchEvent,
  bounds?: DOMRect,
): {
  x: number
  y: number
}
export declare const isMacOs: () => boolean
export declare function getNodeDimensions(node: GraphNode): {
  width: number
  height: number
}
export declare function snapPosition(position: XYPosition, snapGrid?: SnapGrid): XYPosition
