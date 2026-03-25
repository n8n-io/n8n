import type {
  Actions,
  Box,
  Connection,
  CoordinateExtent,
  DefaultEdgeOptions,
  Dimensions,
  Edge,
  EdgeMarkerType,
  ElementData,
  Elements,
  FlowElements,
  GraphEdge,
  GraphNode,
  MaybeElement,
  Node,
  Rect,
  ViewportTransform,
  XYPosition,
  XYZPosition,
} from '../types'

export declare function nodeToRect(node: GraphNode): Rect
export declare function getOverlappingArea(rectA: Rect, rectB: Rect): number
export declare function getDimensions(node: HTMLElement): Dimensions
export declare function clamp(val: number, min?: number, max?: number): number
export declare function clampPosition(position: XYPosition, extent: CoordinateExtent): XYPosition
export declare function getHostForElement(element: HTMLElement): Document
export declare function isEdge<Data = ElementData>(element: MaybeElement): element is Edge<Data>
export declare function isGraphEdge<Data = ElementData>(element: MaybeElement): element is GraphEdge<Data>
export declare function isNode<Data = ElementData>(element: MaybeElement): element is Node<Data>
export declare function isGraphNode<Data = ElementData>(element: MaybeElement): element is GraphNode<Data>
export declare function isRect(obj: any): obj is Rect
export declare function parseNode(node: Node, existingNode?: GraphNode, parentNode?: string): GraphNode
export declare function parseEdge(edge: Edge, existingEdge?: GraphEdge, defaultEdgeOptions?: DefaultEdgeOptions): GraphEdge
export declare function getOutgoers<N extends Node>(
  nodeOrId:
    | Node
    | {
        id: string
      }
    | string,
  nodes: N[],
  edges: Edge[],
): N[]
export declare function getOutgoers<T extends Elements>(
  nodeOrId:
    | Node
    | {
        id: string
      }
    | string,
  elements: T,
): T extends FlowElements ? GraphNode[] : Node[]
export declare function getIncomers<N extends Node>(
  nodeOrId:
    | Node
    | {
        id: string
      }
    | string,
  nodes: N[],
  edges: Edge[],
): N[]
export declare function getIncomers<T extends Elements>(
  nodeOrId:
    | Node
    | {
        id: string
      }
    | string,
  elements: T,
): T extends FlowElements ? GraphNode[] : Node[]
export declare function getEdgeId({ source, sourceHandle, target, targetHandle }: Connection): string
export declare function connectionExists(edge: Edge | Connection, elements: Elements): boolean
/**
 * @deprecated Use store instance and call `addEdges` with template-ref or the one received by `onPaneReady` instead
 *
 * Intended for options API
 * In composition API you can access utilities from `useVueFlow`
 */
export declare function addEdge(edgeParams: Edge | Connection, elements: Elements, defaults?: DefaultEdgeOptions): Elements
/**
 * @deprecated Use store instance and call `updateEdge` with template-ref or the one received by `onPaneReady` instead
 *
 * Intended for options API
 * In composition API you can access utilities from `useVueFlow`
 */
export declare function updateEdge(oldEdge: Edge, newConnection: Connection, elements: Elements): Elements
export declare function rendererPointToPoint({ x, y }: XYPosition, { x: tx, y: ty, zoom: tScale }: ViewportTransform): XYPosition
export declare function pointToRendererPoint(
  { x, y }: XYPosition,
  { x: tx, y: ty, zoom: tScale }: ViewportTransform,
  snapToGrid?: boolean,
  snapGrid?: [snapX: number, snapY: number],
): XYPosition
export declare function rectToBox({ x, y, width, height }: Rect): Box
export declare function boxToRect({ x, y, x2, y2 }: Box): Rect
export declare function getBoundsofRects(rect1: Rect, rect2: Rect): Rect
export declare function getRectOfNodes(nodes: GraphNode[]): Rect
export declare function getNodesInside(
  nodes: GraphNode[],
  rect: Rect,
  viewport?: ViewportTransform,
  partially?: boolean,
  excludeNonSelectableNodes?: boolean,
): GraphNode<any, any, string>[]
export declare function getConnectedEdges<E extends Edge>(nodesOrId: Node[] | string, edges: E[]): E[]
export declare function getConnectedNodes<
  N extends
    | Node
    | {
        id: string
      }
    | string,
>(nodes: N[], edges: Edge[]): N[]
export declare function getTransformForBounds(
  bounds: Rect,
  width: number,
  height: number,
  minZoom: number,
  maxZoom: number,
  padding?: number,
  offset?: {
    x?: number
    y?: number
  },
): ViewportTransform
export declare function getXYZPos(parentPos: XYZPosition, computedPosition: XYZPosition): XYZPosition
export declare function isParentSelected(node: GraphNode, findNode: Actions['findNode']): boolean
export declare function getMarkerId(marker: EdgeMarkerType | undefined, vueFlowId?: string): string
