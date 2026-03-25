import type { Actions, CoordinateExtent, GraphNode, NodeDragItem, State, XYPosition } from '../types'

export declare function hasSelector(target: Element, selector: string, node: Element): boolean
export declare function getDragItems(
  nodes: GraphNode[],
  nodesDraggable: boolean,
  mousePos: XYPosition,
  findNode: Actions['findNode'],
  nodeId?: string,
): NodeDragItem[]
export declare function getEventHandlerParams({
  id,
  dragItems,
  findNode,
}: {
  id?: string
  dragItems: NodeDragItem[]
  findNode: Actions['findNode']
}): [GraphNode, GraphNode[]]
export declare function getExtent<T extends NodeDragItem | GraphNode>(
  item: T,
  triggerError: State['hooks']['error']['trigger'],
  extent?: State['nodeExtent'],
  parent?: GraphNode,
): CoordinateExtent
export declare function calcNextPosition(
  node: GraphNode | NodeDragItem,
  nextPosition: XYPosition,
  triggerError: State['hooks']['error']['trigger'],
  nodeExtent?: State['nodeExtent'],
  parentNode?: GraphNode,
): {
  position: {
    x: number
    y: number
  }
  computedPosition: XYPosition
}
