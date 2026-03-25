import type { Position } from '../../../types'
import type { EdgePathParams } from './general'

export interface GetBezierPathParams {
  sourceX: number
  sourceY: number
  sourcePosition?: Position
  targetX: number
  targetY: number
  targetPosition?: Position
  curvature?: number
}
/**
 * Get a bezier path from source to target handle
 * @public
 *
 * @param bezierPathParams
 * @param bezierPathParams.sourceX - The x position of the source handle
 * @param bezierPathParams.sourceY - The y position of the source handle
 * @param bezierPathParams.sourcePosition - The position of the source handle (default: Position.Bottom)
 * @param bezierPathParams.targetX - The x position of the target handle
 * @param bezierPathParams.targetY - The y position of the target handle
 * @param bezierPathParams.targetPosition - The position of the target handle (default: Position.Top)
 * @param bezierPathParams.curvature - The curvature of the edge (default: 0.25)
 * @returns A path string you can use in an SVG, the labelX and labelY position (center of path) and offsetX, offsetY between source handle and label
 */
export declare function getBezierPath(bezierPathParams: GetBezierPathParams): EdgePathParams
