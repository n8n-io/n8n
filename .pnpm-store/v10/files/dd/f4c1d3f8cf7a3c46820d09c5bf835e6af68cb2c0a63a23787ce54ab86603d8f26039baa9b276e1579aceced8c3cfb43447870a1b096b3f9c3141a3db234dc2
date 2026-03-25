import type { Dimensions, ElementData, XYPosition } from './flow'
import type { GraphNode, Node, NodeHandleBounds } from './node'
import type { GraphEdge } from './edge'

export interface NodeDragItem {
  id: string
  position: XYPosition
  distance: XYPosition
  dimensions: Dimensions
  from: XYPosition
  extent?: Node['extent']
  parentNode?: string
  expandParent?: boolean
}
export interface NodeDimensionChange {
  id: string
  type: 'dimensions'
  dimensions?: Dimensions
  handleBounds?: NodeHandleBounds
  updateStyle?: boolean
  resizing?: boolean
}
export interface NodePositionChange {
  id: string
  type: 'position'
  position: XYPosition
  from: XYPosition
  dragging?: boolean
}
export interface NodeSelectionChange {
  id: string
  type: 'select'
  selected: boolean
}
export interface NodeRemoveChange {
  id: string
  type: 'remove'
}
export interface NodeAddChange<Data = ElementData> {
  item: GraphNode<Data>
  type: 'add'
}
export type NodeChange = NodeDimensionChange | NodePositionChange | NodeSelectionChange | NodeRemoveChange | NodeAddChange
export type EdgeSelectionChange = NodeSelectionChange
export interface EdgeRemoveChange extends NodeRemoveChange {
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
}
export interface EdgeAddChange<Data = ElementData> {
  item: GraphEdge<Data>
  type: 'add'
}
export type EdgeChange = EdgeSelectionChange | EdgeRemoveChange | EdgeAddChange
export type ElementChange = NodeChange | EdgeChange
