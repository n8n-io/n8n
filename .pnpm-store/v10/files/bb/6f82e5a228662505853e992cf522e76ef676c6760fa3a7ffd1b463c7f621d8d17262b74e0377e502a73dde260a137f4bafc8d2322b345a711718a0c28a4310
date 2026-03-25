import type { Dimensions, GraphNode, NodeMouseEvent, PanelPosition, PanelPositionType, XYPosition } from '@vue-flow/core'
import type { CSSProperties, InjectionKey } from 'vue'

/** expects a node and returns a color value */
export type MiniMapNodeFunc = (node: GraphNode) => string
export type ShapeRendering = CSSProperties['shapeRendering']
export interface MiniMapProps {
  /** Node color, can be either a string or a string func that receives the current node */
  nodeColor?: string | MiniMapNodeFunc
  /** Node stroke color, can be either a string or a string func that receives the current node */
  nodeStrokeColor?: string | MiniMapNodeFunc
  /** Additional node class name, can be either a string or a string func that receives the current node */
  nodeClassName?: string | MiniMapNodeFunc
  /** Node border radius */
  nodeBorderRadius?: number
  /** Node stroke width */
  nodeStrokeWidth?: number
  /** Background color of minimap mask */
  maskColor?: string
  /** Border color of minimap mask */
  maskStrokeColor?: string
  /** Border width of minimap mask */
  maskStrokeWidth?: number
  /** Position of the minimap {@link PanelPosition} */
  position?: PanelPositionType | PanelPosition
  /** Enable drag minimap to drag viewport */
  pannable?: boolean
  /** Enable zoom minimap to zoom viewport */
  zoomable?: boolean
  width?: number
  height?: number
  ariaLabel?: string | null
  /** Enable inverse panning, i.e. drag minimap to move viewport in opposite direction */
  inversePan?: boolean
  /** Specify zoom step */
  zoomStep?: number
  /** Specify minimap scale */
  offsetScale?: number
  /** Mask border radius */
  maskBorderRadius?: number
}
/** these props are passed to mini map node slots */
export interface MiniMapNodeProps {
  id: string
  type: string
  selected?: boolean
  dragging?: boolean
  position: XYPosition
  dimensions: Dimensions
  borderRadius?: number
  color?: string
  shapeRendering?: ShapeRendering
  strokeColor?: string
  strokeWidth?: number
  hidden?: boolean
}
export interface MiniMapEmits {
  (
    event: 'click',
    params: {
      event: MouseEvent
      position: {
        x: number
        y: number
      }
    },
  ): void
  (event: 'nodeClick', params: NodeMouseEvent): void
  (event: 'nodeDblclick', params: NodeMouseEvent): void
  (event: 'nodeMouseenter', params: NodeMouseEvent): void
  (event: 'nodeMousemove', params: NodeMouseEvent): void
  (event: 'nodeMouseleave', params: NodeMouseEvent): void
}
export interface MiniMapNodeEmits {
  (event: 'click', params: MouseEvent): void
  (event: 'dblclick', params: MouseEvent): void
  (event: 'mouseenter', params: MouseEvent): void
  (event: 'mousemove', params: MouseEvent): void
  (event: 'mouseleave', params: MouseEvent): void
}
export interface MiniMapSlots extends Record<`node-${string}`, (nodeProps: MiniMapNodeProps) => any> {}
export declare const Slots: InjectionKey<MiniMapSlots>
