import type { Actions, GraphEdge, GraphNode, HandleElement, ViewportTransform, XYPosition } from '../types'
import type { Position } from '../types'

export declare function getHandlePosition(
  node: GraphNode,
  handle: HandleElement | null,
  fallbackPosition?: Position,
  center?: boolean,
): XYPosition
export declare function getEdgeHandle(bounds: HandleElement[] | null, handleId?: string | null): HandleElement | null
interface IsEdgeVisibleParams {
  sourcePos: XYPosition
  targetPos: XYPosition
  sourceWidth: number
  sourceHeight: number
  targetWidth: number
  targetHeight: number
  width: number
  height: number
  viewport: ViewportTransform
}
export declare function isEdgeVisible({
  sourcePos,
  targetPos,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  width,
  height,
  viewport,
}: IsEdgeVisibleParams): boolean
export declare function getEdgeZIndex(edge: GraphEdge, findNode: Actions['findNode'], elevateEdgesOnSelect?: boolean): number
export {}
