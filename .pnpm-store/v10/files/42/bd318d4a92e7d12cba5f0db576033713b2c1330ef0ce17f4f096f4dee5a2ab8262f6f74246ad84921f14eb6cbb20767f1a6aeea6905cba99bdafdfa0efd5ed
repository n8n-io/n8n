import type { Position } from '../../../types'
import type { EdgePathParams } from './general'

export interface GetSmoothStepPathParams {
  sourceX: number
  sourceY: number
  sourcePosition?: Position
  targetX: number
  targetY: number
  targetPosition?: Position
  borderRadius?: number
  centerX?: number
  centerY?: number
  offset?: number
}
/**
 * Get a smooth step path from source to target handle
 * @public
 *
 * @param smoothStepPathParams
 * @param smoothStepPathParams.sourceX - The x position of the source handle
 * @param smoothStepPathParams.sourceY - The y position of the source handle
 * @param smoothStepPathParams.sourcePosition - The position of the source handle (default: Position.Bottom)
 * @param smoothStepPathParams.targetX - The x position of the target handle
 * @param smoothStepPathParams.targetY - The y position of the target handle
 * @param smoothStepPathParams.targetPosition - The position of the target handle (default: Position.Top)
 * @param smoothStepPathParams.borderRadius - The border radius of the edge (default: 5)
 * @returns A path string you can use in an SVG, the labelX and labelY position (center of path) and offsetX, offsetY between source handle and label
 */
export declare function getSmoothStepPath(smoothStepPathParams: GetSmoothStepPathParams): EdgePathParams
