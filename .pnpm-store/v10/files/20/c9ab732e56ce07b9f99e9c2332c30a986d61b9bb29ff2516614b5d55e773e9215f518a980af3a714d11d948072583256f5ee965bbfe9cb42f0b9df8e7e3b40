import type {
  Actions,
  Connection,
  ConnectionLookup,
  DefaultEdgeOptions,
  Edge,
  EdgeLookup,
  GraphEdge,
  GraphNode,
  Node,
  NodeConnection,
  State,
  ValidConnectionFunc,
  VueFlowStore,
} from '../types'

type NonUndefined<T> = T extends undefined ? never : T
export declare function isDef<T>(val: T): val is NonUndefined<T>
export declare function addEdgeToStore(
  edgeParams: Edge | Connection,
  edges: Edge[],
  triggerError: State['hooks']['error']['trigger'],
  defaultEdgeOptions?: DefaultEdgeOptions,
): GraphEdge | false
export declare function updateEdgeAction(
  edge: GraphEdge,
  newConnection: Connection,
  prevEdge: GraphEdge | undefined,
  shouldReplaceId: boolean,
  triggerError: State['hooks']['error']['trigger'],
):
  | false
  | {
      id: string
      source: string
      target: string
      sourceHandle: string | null | undefined
      targetHandle: string | null | undefined
      label?:
        | string
        | import('vue').VNode<
            import('vue').RendererNode,
            import('vue').RendererElement,
            {
              [key: string]: any
            }
          >
        | import('vue').Component<import('../types').EdgeTextProps>
        | undefined
      type: string
      animated?: boolean | undefined
      markerStart?: import('../types').EdgeMarkerType | undefined
      markerEnd?: import('../types').EdgeMarkerType | undefined
      updatable?: import('../types').EdgeUpdatable | undefined
      selectable?: boolean | undefined
      focusable?: boolean | undefined
      deletable?: boolean | undefined
      class?: string | string[] | Record<string, any> | import('../types').ClassFunc<GraphEdge<any, any, string>> | undefined
      style?: import('../types').Styles | import('../types').StyleFunc<GraphEdge<any, any, string>> | undefined
      hidden?: boolean | undefined
      interactionWidth?: number | undefined
      template?: import('../types').EdgeComponent | undefined
      data: any
      events: Partial<import('../types').EdgeEventsHandler<any>>
      zIndex?: number | undefined
      ariaLabel?: string | null | undefined
      domAttributes?:
        | Omit<
            import('vue').SVGAttributes,
            | 'id'
            | 'style'
            | 'className'
            | 'role'
            | 'aria-label'
            | 'onClick'
            | 'onMouseenter'
            | 'onMousemove'
            | 'onMouseleave'
            | 'onContextmenu'
            | 'onDblclick'
            | 'onKeyDown'
          >
        | undefined
      labelStyle?: import('vue').CSSProperties | undefined
      labelShowBg?: boolean | undefined
      labelBgStyle?: import('vue').CSSProperties | undefined
      labelBgPadding?: [number, number] | undefined
      labelBgBorderRadius?: number | undefined
      selected: boolean
      sourceNode: GraphNode<any, any, string>
      targetNode: GraphNode<any, any, string>
      sourceX: number
      sourceY: number
      targetX: number
      targetY: number
    }
  | {
      id: string
      source: string
      target: string
      sourceHandle: string | null | undefined
      targetHandle: string | null | undefined
      label?:
        | string
        | import('vue').VNode<
            import('vue').RendererNode,
            import('vue').RendererElement,
            {
              [key: string]: any
            }
          >
        | import('vue').Component<import('../types').EdgeTextProps>
        | undefined
      type: 'smoothstep'
      animated?: boolean | undefined
      markerStart?: import('../types').EdgeMarkerType | undefined
      markerEnd?: import('../types').EdgeMarkerType | undefined
      updatable?: import('../types').EdgeUpdatable | undefined
      selectable?: boolean | undefined
      focusable?: boolean | undefined
      deletable?: boolean | undefined
      class?: string | string[] | Record<string, any> | import('../types').ClassFunc<GraphEdge<any, any, string>> | undefined
      style?: import('../types').Styles | import('../types').StyleFunc<GraphEdge<any, any, string>> | undefined
      hidden?: boolean | undefined
      interactionWidth?: number | undefined
      template?: import('../types').EdgeComponent | undefined
      data: any
      events: Partial<import('../types').EdgeEventsHandler<any>>
      zIndex?: number | undefined
      ariaLabel?: string | null | undefined
      domAttributes?:
        | Omit<
            import('vue').SVGAttributes,
            | 'id'
            | 'style'
            | 'className'
            | 'role'
            | 'aria-label'
            | 'onClick'
            | 'onMouseenter'
            | 'onMousemove'
            | 'onMouseleave'
            | 'onContextmenu'
            | 'onDblclick'
            | 'onKeyDown'
          >
        | undefined
      labelStyle?: import('vue').CSSProperties | undefined
      labelShowBg?: boolean | undefined
      labelBgStyle?: import('vue').CSSProperties | undefined
      labelBgPadding?: [number, number] | undefined
      labelBgBorderRadius?: number | undefined
      pathOptions?: import('../types').SmoothStepPathOptions | undefined
      selected: boolean
      sourceNode: GraphNode<any, any, string>
      targetNode: GraphNode<any, any, string>
      sourceX: number
      sourceY: number
      targetX: number
      targetY: number
    }
  | {
      id: string
      source: string
      target: string
      sourceHandle: string | null | undefined
      targetHandle: string | null | undefined
      label?:
        | string
        | import('vue').VNode<
            import('vue').RendererNode,
            import('vue').RendererElement,
            {
              [key: string]: any
            }
          >
        | import('vue').Component<import('../types').EdgeTextProps>
        | undefined
      type: 'default'
      animated?: boolean | undefined
      markerStart?: import('../types').EdgeMarkerType | undefined
      markerEnd?: import('../types').EdgeMarkerType | undefined
      updatable?: import('../types').EdgeUpdatable | undefined
      selectable?: boolean | undefined
      focusable?: boolean | undefined
      deletable?: boolean | undefined
      class?: string | string[] | Record<string, any> | import('../types').ClassFunc<GraphEdge<any, any, string>> | undefined
      style?: import('../types').Styles | import('../types').StyleFunc<GraphEdge<any, any, string>> | undefined
      hidden?: boolean | undefined
      interactionWidth?: number | undefined
      template?: import('../types').EdgeComponent | undefined
      data: any
      events: Partial<import('../types').EdgeEventsHandler<any>>
      zIndex?: number | undefined
      ariaLabel?: string | null | undefined
      domAttributes?:
        | Omit<
            import('vue').SVGAttributes,
            | 'id'
            | 'style'
            | 'className'
            | 'role'
            | 'aria-label'
            | 'onClick'
            | 'onMouseenter'
            | 'onMousemove'
            | 'onMouseleave'
            | 'onContextmenu'
            | 'onDblclick'
            | 'onKeyDown'
          >
        | undefined
      labelStyle?: import('vue').CSSProperties | undefined
      labelShowBg?: boolean | undefined
      labelBgStyle?: import('vue').CSSProperties | undefined
      labelBgPadding?: [number, number] | undefined
      labelBgBorderRadius?: number | undefined
      pathOptions?: import('../types').BezierPathOptions | undefined
      selected: boolean
      sourceNode: GraphNode<any, any, string>
      targetNode: GraphNode<any, any, string>
      sourceX: number
      sourceY: number
      targetX: number
      targetY: number
    }
export declare function createGraphNodes(
  nodes: Node[],
  findNode: Actions['findNode'],
  triggerError: State['hooks']['error']['trigger'],
): GraphNode<any, any, string>[]
export declare function updateConnectionLookup(
  connectionLookup: ConnectionLookup,
  edgeLookup: EdgeLookup,
  edges: GraphEdge[],
): void
/**
 * We call the callback for all connections in a that are not in b
 *
 * @internal
 */
export declare function handleConnectionChange(
  a: Map<string, NodeConnection>,
  b: Map<string, NodeConnection>,
  cb?: (diff: NodeConnection[]) => void,
): void
/**
 * @internal
 */
export declare function areConnectionMapsEqual(a?: Map<string, Connection>, b?: Map<string, Connection>): boolean
/**
 * @internal
 */
export declare function areSetsEqual(a: Set<string>, b: Set<string>): boolean
/**
 * @internal
 */
export declare function createGraphEdges(
  nextEdges: (Edge | Connection)[],
  isValidConnection: ValidConnectionFunc | null,
  findNode: Actions['findNode'],
  findEdge: Actions['findEdge'],
  onError: VueFlowStore['emits']['error'],
  defaultEdgeOptions: DefaultEdgeOptions | undefined,
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphEdge[]
export {}
