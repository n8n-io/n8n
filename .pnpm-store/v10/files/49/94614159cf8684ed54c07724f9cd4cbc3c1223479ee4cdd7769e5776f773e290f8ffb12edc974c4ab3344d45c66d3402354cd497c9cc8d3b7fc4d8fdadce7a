import type {
  EdgeAddChange,
  EdgeChange,
  EdgeRemoveChange,
  EdgeSelectionChange,
  ElementChange,
  FlowElement,
  GraphEdge,
  GraphNode,
  NodeAddChange,
  NodeChange,
  NodeRemoveChange,
  NodeSelectionChange,
} from '../types'

export declare function applyChanges<
  T extends FlowElement = FlowElement,
  C extends ElementChange = T extends GraphNode ? NodeChange : EdgeChange,
>(changes: C[], elements: T[]): T[]
/** @deprecated Use store instance and call `applyChanges` with template-ref or the one received by `onPaneReady` instead */
export declare function applyEdgeChanges(changes: EdgeChange[], edges: GraphEdge[]): GraphEdge[]
/** @deprecated Use store instance and call `applyChanges` with template-ref or the one received by `onPaneReady` instead */
export declare function applyNodeChanges(changes: NodeChange[], nodes: GraphNode[]): GraphNode<any, any, string>[]
export declare function createSelectionChange(id: string, selected: boolean): NodeSelectionChange | EdgeSelectionChange
export declare function createAdditionChange<
  T extends GraphNode | GraphEdge = GraphNode,
  C extends NodeAddChange | EdgeAddChange = T extends GraphNode ? NodeAddChange : EdgeAddChange,
>(item: T): C
export declare function createNodeRemoveChange(id: string): NodeRemoveChange
export declare function createEdgeRemoveChange(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): EdgeRemoveChange
export declare function getSelectionChanges(
  items: Map<string, any>,
  selectedIds?: Set<string>,
  mutateItem?: boolean,
): NodeSelectionChange[] | EdgeSelectionChange[]
