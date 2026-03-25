import type { Position } from '../../types'

export interface GetSimpleBezierPathParams {
  sourceX: number
  sourceY: number
  sourcePosition?: Position
  targetX: number
  targetY: number
  targetPosition?: Position
}
/**
 * Get a simple bezier path from source to target handle (no curvature)
 * @public
 *
 * @param simpleBezierPathParams
 * @param simpleBezierPathParams.sourceX - The x position of the source handle
 * @param simpleBezierPathParams.sourceY - The y position of the source handle
 * @param simpleBezierPathParams.sourcePosition - The position of the source handle (default: Position.Bottom)
 * @param simpleBezierPathParams.targetX - The x position of the target handle
 * @param simpleBezierPathParams.targetY - The y position of the target handle
 * @param simpleBezierPathParams.targetPosition - The position of the target handle (default: Position.Top)
 * @returns A path string you can use in an SVG, the labelX and labelY position (center of path) and offsetX, offsetY between source handle and label
 */
export declare function getSimpleBezierPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: GetSimpleBezierPathParams): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number]
