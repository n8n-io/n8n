import type { CSSProperties, ComputedRef, ToRefs } from 'vue'
import type { KeyFilter } from '@vueuse/core'
import type { ViewportHelper } from '../composables'
import type {
  Dimensions,
  ElementData,
  Elements,
  FlowElements,
  FlowExportObject,
  FlowOptions,
  FlowProps,
  Rect,
  SelectionMode,
  SelectionRect,
  SnapGrid,
  XYPosition,
} from './flow'
import type { DefaultEdgeTypes, DefaultNodeTypes, EdgeComponent, NodeComponent } from './components'
import type {
  Connection,
  ConnectionLineOptions,
  ConnectionLineType,
  ConnectionLookup,
  ConnectionMode,
  ConnectionStatus,
  Connector,
  HandleConnection,
} from './connection'
import type { DefaultEdgeOptions, Edge, EdgeUpdatable, GraphEdge } from './edge'
import type { CoordinateExtent, CoordinateExtentRange, GraphNode, Node } from './node'
import type { D3Selection, D3Zoom, D3ZoomHandler, PanOnScrollMode, ViewportTransform } from './zoom'
import type { CustomEvent, FlowHooks, FlowHooksEmit, FlowHooksOn } from './hooks'
import type { EdgeChange, NodeChange, NodeDragItem } from './changes'
import type { ConnectingHandle, HandleType, ValidConnectionFunc } from './handle'

export type NodeLookup = Map<string, GraphNode>
export type EdgeLookup = Map<string, GraphEdge>
export interface UpdateNodeDimensionsParams {
  id: string
  nodeElement: HTMLDivElement
  forceUpdate?: boolean
}
export interface State extends Omit<FlowProps, 'id' | 'modelValue'> {
  /** Vue flow element ref */
  vueFlowRef: HTMLDivElement | null
  /** Vue flow viewport element */
  viewportRef: HTMLDivElement | null
  /** Event hooks, you can manipulate the triggers at your own peril */
  readonly hooks: FlowHooks
  /** all stored nodes */
  nodes: GraphNode[]
  /** all stored edges */
  edges: GraphEdge[]
  connectionLookup: ConnectionLookup
  readonly d3Zoom: D3Zoom | null
  readonly d3Selection: D3Selection | null
  readonly d3ZoomHandler: D3ZoomHandler | null
  /** use setMinZoom action to change minZoom */
  minZoom: number
  /** use setMaxZoom action to change maxZoom */
  maxZoom: number
  defaultViewport: Partial<ViewportTransform>
  /** use setTranslateExtent action to change translateExtent */
  translateExtent: CoordinateExtent
  nodeExtent: CoordinateExtent | CoordinateExtentRange
  /** viewport dimensions - do not change! */
  readonly dimensions: Dimensions
  /** viewport transform x, y, z - do not change!  */
  readonly viewport: ViewportTransform
  /** if true will skip rendering any elements currently not inside viewport until they become visible */
  onlyRenderVisibleElements: boolean
  nodesSelectionActive: boolean
  userSelectionActive: boolean
  multiSelectionActive: boolean
  deleteKeyCode: KeyFilter | null
  selectionKeyCode: KeyFilter | boolean | null
  multiSelectionKeyCode: KeyFilter | null
  zoomActivationKeyCode: KeyFilter | null
  panActivationKeyCode: KeyFilter | null
  connectionMode: ConnectionMode
  connectionLineOptions: ConnectionLineOptions
  /** @deprecated use {@link ConnectionLineOptions.type} */
  connectionLineType: ConnectionLineType | null
  /** @deprecated use {@link ConnectionLineOptions.style} */
  connectionLineStyle: CSSProperties | null
  connectionStartHandle: ConnectingHandle | null
  connectionEndHandle: ConnectingHandle | null
  connectionClickStartHandle: ConnectingHandle | null
  connectionPosition: XYPosition
  connectionRadius: number
  connectionStatus: ConnectionStatus | null
  isValidConnection: ValidConnectionFunc | null
  connectOnClick: boolean
  edgeUpdaterRadius: number
  snapToGrid: boolean
  snapGrid: SnapGrid
  defaultMarkerColor: string
  edgesUpdatable: EdgeUpdatable
  edgesFocusable: boolean
  nodesFocusable: boolean
  nodesDraggable: boolean
  nodesConnectable: boolean
  nodeDragThreshold: number
  elementsSelectable: boolean
  selectNodesOnDrag: boolean
  userSelectionRect: SelectionRect | null
  selectionMode: SelectionMode
  panOnDrag: boolean | number[]
  zoomOnScroll: boolean
  zoomOnPinch: boolean
  panOnScroll: boolean
  panOnScrollSpeed: number
  panOnScrollMode: PanOnScrollMode
  paneClickDistance: number
  zoomOnDoubleClick: boolean
  preventScrolling: boolean
  paneDragging: boolean
  initialized: boolean
  applyDefault: boolean
  autoConnect: boolean | Connector
  fitViewOnInit: boolean
  fitViewOnInitDone: boolean
  noDragClassName: 'nodrag' | string
  noWheelClassName: 'nowheel' | string
  noPanClassName: 'nopan' | string
  defaultEdgeOptions: DefaultEdgeOptions | undefined
  elevateEdgesOnSelect: boolean
  elevateNodesOnSelect: boolean
  autoPanOnConnect: boolean
  autoPanOnNodeDrag: boolean
  /**
   * The speed at which the viewport pans while dragging a node or a selection box.
   * @default 15
   */
  autoPanSpeed: number
  disableKeyboardA11y: boolean
  ariaLiveMessage: string
}
export type SetElements = (elements: Elements | ((elements: FlowElements) => Elements)) => void
export type SetNodes = (nodes: Node[] | ((nodes: GraphNode[]) => Node[])) => void
export type SetEdges = (edges: Edge[] | ((edges: GraphEdge[]) => Edge[])) => void
export type AddNodes = (nodes: Node | Node[] | ((nodes: GraphNode[]) => Node | Node[])) => void
export type RemoveNodes = (
  nodes: (string | Node) | (Node | string)[] | ((nodes: GraphNode[]) => (string | Node) | (Node | string)[]),
  removeConnectedEdges?: boolean,
  removeChildren?: boolean,
) => void
export type RemoveEdges = (
  edges: (string | Edge) | (Edge | string)[] | ((edges: GraphEdge[]) => (string | Edge) | (Edge | string)[]),
) => void
export type AddEdges = (
  edgesOrConnections:
    | (Edge | Connection)
    | (Edge | Connection)[]
    | ((edges: GraphEdge[]) => (Edge | Connection) | (Edge | Connection)[]),
) => void
export type UpdateEdge = (oldEdge: GraphEdge, newConnection: Connection, shouldReplaceId?: boolean) => GraphEdge | false
export type UpdateEdgeData = <Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id: string,
  dataUpdate: Partial<Data> | ((edge: GraphEdge<Data, CustomEvents>) => Partial<Data>),
  options?: {
    replace: boolean
  },
) => void
export type SetState = (
  state:
    | Partial<FlowOptions & Omit<State, 'nodes' | 'edges' | 'modelValue'>>
    | ((state: State) => Partial<FlowOptions & Omit<State, 'nodes' | 'edges' | 'modelValue'>>),
) => void
export type UpdateNodePosition = (dragItems: NodeDragItem[], changed: boolean, dragging: boolean) => void
export type UpdateNodeDimensions = (updates: UpdateNodeDimensionsParams[]) => void
export type UpdateNodeInternals = (nodeIds?: string[]) => void
export type FindNode = <Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id: string | undefined | null,
) => GraphNode<Data, CustomEvents> | undefined
export type FindEdge = <Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id: string | undefined | null,
) => GraphEdge<Data, CustomEvents> | undefined
export type GetIntersectingNodes = (
  node:
    | (Partial<Node> & {
        id: Node['id']
      })
    | Rect,
  partially?: boolean,
  nodes?: GraphNode[],
) => GraphNode[]
export type UpdateNode = <Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id: string,
  nodeUpdate: Partial<Node<Data, CustomEvents>> | ((node: GraphNode<Data, CustomEvents>) => Partial<Node<Data, CustomEvents>>),
  options?: {
    replace: boolean
  },
) => void
export type UpdateNodeData = <Data = ElementData, CustomEvents extends Record<string, CustomEvent> = any>(
  id: string,
  dataUpdate: Partial<Data> | ((node: GraphNode<Data, CustomEvents>) => Partial<Data>),
  options?: {
    replace: boolean
  },
) => void
export type IsNodeIntersecting = (
  node:
    | (Partial<Node> & {
        id: Node['id']
      })
    | Rect,
  area: Rect,
  partially?: boolean,
) => boolean
export interface Actions extends Omit<ViewportHelper, 'viewportInitialized'> {
  /** parses elements (nodes + edges) and re-sets the state */
  setElements: SetElements
  /** parses nodes and re-sets the state */
  setNodes: SetNodes
  /** parses edges and re-sets the state */
  setEdges: SetEdges
  /** parses nodes and adds to state */
  addNodes: AddNodes
  /** parses edges and adds to state */
  addEdges: AddEdges
  /** remove nodes (and possibly connected edges and children) from state */
  removeNodes: RemoveNodes
  /** remove edges from state */
  removeEdges: RemoveEdges
  /** find a node by id */
  findNode: FindNode
  /** find an edge by id */
  findEdge: FindEdge
  /** updates an edge */
  updateEdge: UpdateEdge
  /** updates the data of an edge */
  updateEdgeData: UpdateEdgeData
  /** updates a node */
  updateNode: UpdateNode
  /** updates the data of a node */
  updateNodeData: UpdateNodeData
  /** applies default edge change handler */
  applyEdgeChanges: (changes: EdgeChange[]) => GraphEdge[]
  /** applies default node change handler */
  applyNodeChanges: (changes: NodeChange[]) => GraphNode[]
  /**
   * manually select elements and add to state
   * @deprecated will be removed in the next major, use {@link Actions.addSelectedNodes} or {@link Actions.addSelectedEdges} instead
   */
  addSelectedElements: (elements: FlowElements) => void
  /** manually select edges and add to state */
  addSelectedEdges: (edges: GraphEdge[]) => void
  /** manually select nodes and add to state */
  addSelectedNodes: (nodes: GraphNode[]) => void
  /** manually unselect edges and remove from state */
  removeSelectedEdges: (edges: GraphEdge[]) => void
  /** manually unselect nodes and remove from state */
  removeSelectedNodes: (nodes: GraphNode[]) => void
  /** unselect selected elements (if none are passed, all elements are unselected) */
  removeSelectedElements: (elements?: Elements) => void
  /** apply min zoom value to d3 */
  setMinZoom: (zoom: number) => void
  /** apply max zoom value to d3 */
  setMaxZoom: (zoom: number) => void
  /** apply translate extent to d3 */
  setTranslateExtent: (translateExtent: CoordinateExtent) => void
  /** apply extent to nodes */
  setNodeExtent: (nodeExtent: CoordinateExtent | CoordinateExtentRange) => void
  setPaneClickDistance: (distance: number) => void
  /** enable/disable node interaction (dragging, selecting etc) */
  setInteractive: (isInteractive: boolean) => void
  /** set new state */
  setState: SetState
  /** return an object of graph values (elements, viewport transform) for storage and re-loading a graph */
  toObject: () => FlowExportObject
  /** load graph from export obj */
  fromObject: (obj: FlowExportObject) => Promise<boolean>
  /** force update node internal data, if handle bounds are incorrect, you might want to use this */
  updateNodeInternals: UpdateNodeInternals
  /** start a connection */
  startConnection: (startHandle: ConnectingHandle, position?: XYPosition, isClick?: boolean) => void
  /** update connection position */
  updateConnection: (position: XYPosition, result?: ConnectingHandle | null, status?: ConnectionStatus | null) => void
  /** end (or cancel) a connection */
  endConnection: (event?: MouseEvent | TouchEvent, isClick?: boolean) => void
  /** internal position updater, you probably don't want to use this */
  updateNodePositions: UpdateNodePosition
  /** internal dimensions' updater, you probably don't want to use this */
  updateNodeDimensions: UpdateNodeDimensions
  /** returns all node intersections */
  getIntersectingNodes: GetIntersectingNodes
  /** check if a node is intersecting with a defined area */
  isNodeIntersecting: IsNodeIntersecting
  /** get a node's incomers */
  getIncomers: (nodeOrId: Node | string) => GraphNode[]
  /** get a node's outgoers */
  getOutgoers: (nodeOrId: Node | string) => GraphNode[]
  /** get a node's connected edges */
  getConnectedEdges: (nodesOrId: Node[] | string) => GraphEdge[]
  /** get all connections of a handle belonging to a node */
  getHandleConnections: ({ id, type, nodeId }: { id?: string | null; type: HandleType; nodeId: string }) => HandleConnection[]
  /** pan the viewport; return indicates if a transform has happened or not */
  panBy: (delta: XYPosition) => boolean
  /** viewport helper instance */
  viewportHelper: ComputedRef<ViewportHelper>
  /** reset state to defaults */
  $reset: () => void
  /** remove store instance from global storage and destroy it (will invalidate effect scopes) */
  $destroy: () => void
}
export interface Getters {
  /** returns object containing current edge types */
  getEdgeTypes: Record<keyof DefaultEdgeTypes | string, EdgeComponent>
  /** returns object containing current node types */
  getNodeTypes: Record<keyof DefaultNodeTypes | string, NodeComponent>
  /**
   * get all elements
   * @deprecated - will be removed in next major version
   */
  getElements: FlowElements
  /** all visible node */
  getNodes: GraphNode[]
  /** all visible edges */
  getEdges: GraphEdge[]
  /**
   * returns a node by id
   * @deprecated use {@link Actions.findNode} instead
   */
  getNode: (id: string) => GraphNode | undefined
  /**
   * returns an edge by id
   * @deprecated use {@link Actions.findEdge} instead
   */
  getEdge: (id: string) => GraphEdge | undefined
  /** returns all currently selected elements */
  getSelectedElements: FlowElements
  /** returns all currently selected nodes */
  getSelectedNodes: GraphNode[]
  /** returns all currently selected edges */
  getSelectedEdges: GraphEdge[]
  /**
   * returns all nodes that are initialized, i.e. they have actual dimensions
   * @deprecated - will be removed in next major version; use {@link useNodesInitialized} instead
   */
  getNodesInitialized: GraphNode[]
  /**
   * returns a boolean flag whether all current nodes are initialized
   * @deprecated - will be removed in next major version; use {@link useNodesInitialized} instead
   */
  areNodesInitialized: boolean
}
export type ComputedGetters = {
  [key in keyof Getters]: ComputedRef<Getters[key]>
}
export type VueFlowStore = {
  readonly id: string
  readonly emits: FlowHooksEmit
  readonly nodeLookup: ComputedRef<NodeLookup>
  readonly edgeLookup: ComputedRef<EdgeLookup>
  /** current vue flow version you're using */
  readonly vueFlowVersion: string
} & FlowHooksOn &
  ToRefs<State> &
  Readonly<ComputedGetters> &
  Readonly<Actions>
