import type { CSSProperties } from 'vue'
import type { KeyFilter } from '@vueuse/core'
import type { D3ZoomEvent } from 'd3-zoom'
import type { VueFlowError } from '../utils'
import type { DefaultEdgeOptions, Edge, EdgeProps, EdgeUpdatable, GraphEdge } from './edge'
import type { CoordinateExtent, CoordinateExtentRange, GraphNode, Node, NodeProps } from './node'
import type {
  Connection,
  ConnectionLineOptions,
  ConnectionLineProps,
  ConnectionLineType,
  ConnectionMode,
  Connector,
  OnConnectStartParams,
} from './connection'
import type { PanOnScrollMode, ViewportTransform } from './zoom'
import type { EdgeTypesObject, NodeTypesObject } from './components'
import type { CustomEvent, EdgeMouseEvent, EdgeUpdateEvent, NodeDragEvent, NodeMouseEvent } from './hooks'
import type { ValidConnectionFunc } from './handle'
import type { EdgeChange, NodeChange } from './changes'
import type { VueFlowStore } from './store'

export type ElementData = any
/**
 * @deprecated - will be removed in the next major version
 * A flow element (after parsing into state)
 */
export type FlowElement<
  NodeData = ElementData,
  EdgeData = ElementData,
  NodeEvents extends Record<string, CustomEvent> = any,
  EdgeEvents extends Record<string, CustomEvent> = any,
> = GraphNode<NodeData, NodeEvents> | GraphEdge<EdgeData, EdgeEvents>
/**
 * @deprecated - will be removed in the next major version
 * An array of flow elements (after parsing into state)
 */
export type FlowElements<
  NodeData = ElementData,
  EdgeData = ElementData,
  NodeEvents extends Record<string, CustomEvent> = any,
  EdgeEvents extends Record<string, CustomEvent> = any,
> = FlowElement<NodeData, EdgeData, NodeEvents, EdgeEvents>[]
/** Initial elements (before parsing into state) */
export type Element<
  NodeData = ElementData,
  EdgeData = ElementData,
  NodeEvents extends Record<string, CustomEvent> = any,
  EdgeEvents extends Record<string, CustomEvent> = any,
> = Node<NodeData, NodeEvents> | Edge<EdgeData, EdgeEvents>
export type Elements<
  NodeData = ElementData,
  EdgeData = ElementData,
  NodeEvents extends Record<string, CustomEvent> = any,
  EdgeEvents extends Record<string, CustomEvent> = any,
> = Element<NodeData, EdgeData, NodeEvents, EdgeEvents>[]
export type MaybeElement = Node | Edge | Connection | FlowElement | Element
export interface CustomThemeVars {
  [key: string]: string | number | undefined
}
export type CSSVars =
  | '--vf-node-color'
  | '--vf-box-shadow'
  | '--vf-node-bg'
  | '--vf-node-text'
  | '--vf-connection-path'
  | '--vf-handle'
export type ThemeVars = {
  [key in CSSVars]?: CSSProperties['color']
}
export type Styles = CSSProperties & ThemeVars & CustomThemeVars
/** @deprecated will be removed in the next major version */
export type ClassFunc<ElementType extends FlowElement = FlowElement> = (element: ElementType) => string | void
/** @deprecated will be removed in the next major version */
export type StyleFunc<ElementType extends FlowElement = FlowElement> = (element: ElementType) => Styles | void
/** Handle Positions */
export declare enum Position {
  Left = 'left',
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
}
export interface XYPosition {
  x: number
  y: number
}
export type XYZPosition = XYPosition & {
  z: number
}
export interface Dimensions {
  width: number
  height: number
}
export interface Box extends XYPosition {
  x2: number
  y2: number
}
export interface Rect extends Dimensions, XYPosition {}
export type SnapGrid = [x: number, y: number]
export interface SelectionRect extends Rect {
  startX: number
  startY: number
}
export declare enum SelectionMode {
  Partial = 'partial',
  Full = 'full',
}
export interface FlowExportObject {
  /** exported nodes */
  nodes: Node[]
  /** exported edges */
  edges: Edge[]
  /**
   * exported viewport position
   * @deprecated use {@link FlowExportObject.viewport} instead
   */
  position: [x: number, y: number]
  /**
   * exported zoom level
   * @deprecated use {@link FlowExportObject.viewport} instead
   */
  zoom: number
  /** exported viewport (position + zoom) */
  viewport: ViewportTransform
}
export interface FlowProps {
  id?: string
  /**
   * all elements (nodes + edges)
   * @deprecated use {@link FlowProps.nodes} & {@link FlowProps.nodes} instead
   */
  modelValue?: Elements
  nodes?: Node[]
  edges?: Edge[]
  /** either use the edgeTypes prop to define your edge-types or use slots (<template #edge-mySpecialType="props">) */
  edgeTypes?: EdgeTypesObject
  /** either use the nodeTypes prop to define your node-types or use slots (<template #node-mySpecialType="props">) */
  nodeTypes?: NodeTypesObject
  connectionMode?: ConnectionMode
  /** @deprecated use {@link ConnectionLineOptions.type} */
  connectionLineType?: ConnectionLineType | null
  /** @deprecated use {@link ConnectionLineOptions.style} */
  connectionLineStyle?: CSSProperties | null
  connectionLineOptions?: ConnectionLineOptions
  connectionRadius?: number
  isValidConnection?: ValidConnectionFunc | null
  deleteKeyCode?: KeyFilter | null
  selectionKeyCode?: KeyFilter | boolean | null
  multiSelectionKeyCode?: KeyFilter | null
  zoomActivationKeyCode?: KeyFilter | null
  panActivationKeyCode?: KeyFilter | null
  snapToGrid?: boolean
  snapGrid?: SnapGrid
  onlyRenderVisibleElements?: boolean
  edgesUpdatable?: EdgeUpdatable
  nodesDraggable?: boolean
  nodesConnectable?: boolean
  nodeDragThreshold?: number
  elementsSelectable?: boolean
  selectNodesOnDrag?: boolean
  /** move pane on drag, replaced prop `paneMovable` */
  panOnDrag?: boolean | number[]
  minZoom?: number
  maxZoom?: number
  defaultViewport?: Partial<ViewportTransform>
  translateExtent?: CoordinateExtent
  nodeExtent?: CoordinateExtent | CoordinateExtentRange
  defaultMarkerColor?: string
  zoomOnScroll?: boolean
  zoomOnPinch?: boolean
  panOnScroll?: boolean
  panOnScrollSpeed?: number
  panOnScrollMode?: PanOnScrollMode
  /**
   * Distance that the mouse can move between mousedown/up that will trigger a click
   * @default 0
   */
  paneClickDistance?: number
  zoomOnDoubleClick?: boolean
  /** If set to false, scrolling inside the viewport will be disabled and instead the page scroll will be used */
  preventScrolling?: boolean
  selectionMode?: SelectionMode
  edgeUpdaterRadius?: number
  /** will be renamed to `fitView` */
  fitViewOnInit?: boolean
  /** allow connection with click handlers, i.e. support touch devices */
  connectOnClick?: boolean
  /**
   * apply default change handlers for position, dimensions, adding/removing nodes. set this to false if you want to apply the changes manually
   * @deprecated - will be removed in the next major version, changes will not be auto applied in the future
   */
  applyDefault?: boolean
  /**
   * automatically create an edge when connection is triggered
   * @deprecated - will be removed in the next major version
   */
  autoConnect?: boolean | Connector
  noDragClassName?: string
  noWheelClassName?: string
  noPanClassName?: string
  /** does not work for the `addEdge` utility! */
  defaultEdgeOptions?: DefaultEdgeOptions
  /** elevates edges when selected and applies z-Index to put them above their nodes */
  elevateEdgesOnSelect?: boolean
  /** elevates nodes when selected and applies z-Index + 1000 */
  elevateNodesOnSelect?: boolean
  disableKeyboardA11y?: boolean
  edgesFocusable?: boolean
  nodesFocusable?: boolean
  autoPanOnConnect?: boolean
  autoPanOnNodeDrag?: boolean
  autoPanSpeed?: number
}
/**
 * All available VueFlow options
 * @deprecated use the {@link FlowProps} type instead
 */
export type FlowOptions = FlowProps
export interface FlowEmits {
  (event: 'nodesChange', changes: NodeChange[]): void
  (event: 'edgesChange', changes: EdgeChange[]): void
  (event: 'nodesInitialized'): void
  /** @deprecated use `init` instead */
  (event: 'paneReady', paneEvent: VueFlowStore): void
  (event: 'init', paneEvent: VueFlowStore): void
  (event: 'updateNodeInternals'): void
  (event: 'error', error: VueFlowError): void
  (event: 'connect', connectionEvent: Connection): void
  (
    event: 'connectStart',
    connectionEvent: {
      event?: MouseEvent
    } & OnConnectStartParams,
  ): void
  (event: 'connectEnd', connectionEvent?: MouseEvent): void
  (
    event: 'clickConnectStart',
    connectionEvent: {
      event?: MouseEvent
    } & OnConnectStartParams,
  ): void
  (event: 'clickConnectEnd', connectionEvent?: MouseEvent): void
  (
    event: 'moveStart',
    moveEvent: {
      event: D3ZoomEvent<HTMLDivElement, any>
      flowTransform: ViewportTransform
    },
  ): void
  (
    event: 'move',
    moveEvent: {
      event: D3ZoomEvent<HTMLDivElement, any>
      flowTransform: ViewportTransform
    },
  ): void
  (
    event: 'moveEnd',
    moveEvent: {
      event: D3ZoomEvent<HTMLDivElement, any>
      flowTransform: ViewportTransform
    },
  ): void
  (event: 'selectionDragStart', selectionEvent: NodeDragEvent): void
  (event: 'selectionDrag', selectionEvent: NodeDragEvent): void
  (event: 'selectionDragStop', selectionEvent: NodeDragEvent): void
  (
    event: 'selectionContextMenu',
    selectionEvent: {
      event: MouseEvent
      nodes: GraphNode[]
    },
  ): void
  (event: 'selectionStart', selectionEvent: MouseEvent): void
  (event: 'selectionEnd', selectionEvent: MouseEvent): void
  (event: 'viewportChangeStart', viewport: ViewportTransform): void
  (event: 'viewportChange', viewport: ViewportTransform): void
  (event: 'viewportChangeEnd', viewport: ViewportTransform): void
  (event: 'paneScroll', paneScrollEvent: WheelEvent | undefined): void
  (
    event: 'paneClick' | 'paneContextMenu' | 'paneMouseEnter' | 'paneMouseMove' | 'paneMouseLeave',
    paneMouseEvent: MouseEvent,
  ): void
  (event: 'edgeUpdate', edgeUpdateEvent: EdgeUpdateEvent): void
  (
    event:
      | 'edgeContextMenu'
      | 'edgeMouseEnter'
      | 'edgeMouseMove'
      | 'edgeMouseLeave'
      | 'edgeDoubleClick'
      | 'edgeClick'
      | 'edgeUpdateStart'
      | 'edgeUpdateEnd',
    edgeMouseEvent: EdgeMouseEvent,
  ): void
  (
    event: 'nodeContextMenu' | 'nodeMouseEnter' | 'nodeMouseMove' | 'nodeMouseLeave' | 'nodeDoubleClick' | 'nodeClick',
    nodeMouseEvent: NodeMouseEvent,
  ): void
  (event: 'nodeDragStart' | 'nodeDrag' | 'nodeDragStop', nodeDragEvent: NodeDragEvent): void
  (
    event:
      | 'miniMapNodeClick'
      | 'miniMapNodeDoubleClick'
      | 'miniMapNodeMouseEnter'
      | 'miniMapNodeMouseMove'
      | 'miniMapNodeMouseLeave',
    nodeMouseEvent: NodeMouseEvent,
  ): void
  /** v-model event definitions */
  (event: 'update:modelValue', value: FlowElements): void
  (event: 'update:nodes', value: GraphNode[]): void
  (event: 'update:edges', value: GraphEdge[]): void
}
export interface NodeSlots extends Record<`node-${string}`, (nodeProps: NodeProps) => any> {}
export interface EdgeSlots extends Record<`edge-${string}`, (edgeProps: EdgeProps) => any> {}
export interface FlowSlots extends NodeSlots, EdgeSlots {
  'connection-line': (connectionLineProps: ConnectionLineProps) => any
  'zoom-pane': () => any
  'default': () => any
}
