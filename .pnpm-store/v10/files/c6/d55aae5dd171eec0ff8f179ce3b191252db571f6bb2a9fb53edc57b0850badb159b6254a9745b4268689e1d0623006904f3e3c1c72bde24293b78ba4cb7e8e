import type { FlowSlots, VueFlowStore } from '../../types'

declare const _default: __VLS_WithTemplateSlots<
  import('vue').DefineComponent<
    {
      id: {
        type: import('vue').PropType<string>
      }
      nodes: {
        type: import('vue').PropType<import('../../types').Node<any, any, string>[]>
      }
      edges: {
        type: import('vue').PropType<import('../../types').Edge[]>
      }
      modelValue: {
        type: import('vue').PropType<import('../../types').Elements<any, any, any, any>>
      }
      edgeTypes: {
        type: import('vue').PropType<import('../../types').EdgeTypesObject>
      }
      nodeTypes: {
        type: import('vue').PropType<import('../../types').NodeTypesObject>
      }
      connectionMode: {
        type: import('vue').PropType<import('../../types').ConnectionMode>
      }
      connectionLineType: {
        type: import('vue').PropType<import('../../types').ConnectionLineType | null>
      }
      connectionLineStyle: {
        type: import('vue').PropType<import('vue').CSSProperties | null>
        default: undefined
      }
      connectionLineOptions: {
        type: import('vue').PropType<import('../../types').ConnectionLineOptions>
        default: undefined
      }
      connectionRadius: {
        type: import('vue').PropType<number>
      }
      isValidConnection: {
        type: import('vue').PropType<import('../../types').ValidConnectionFunc | null>
        default: undefined
      }
      deleteKeyCode: {
        type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
        default: undefined
      }
      selectionKeyCode: {
        type: import('vue').PropType<false | import('@vueuse/core').KeyFilter | null>
        default: undefined
      }
      multiSelectionKeyCode: {
        type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
        default: undefined
      }
      zoomActivationKeyCode: {
        type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
        default: undefined
      }
      panActivationKeyCode: {
        type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
        default: undefined
      }
      snapToGrid: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      snapGrid: {
        type: import('vue').PropType<import('../../types').SnapGrid>
      }
      onlyRenderVisibleElements: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      edgesUpdatable: {
        type: import('vue').PropType<import('../../types').EdgeUpdatable>
        default: undefined
      }
      nodesDraggable: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      nodesConnectable: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      nodeDragThreshold: {
        type: import('vue').PropType<number>
      }
      elementsSelectable: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      selectNodesOnDrag: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      panOnDrag: {
        type: import('vue').PropType<boolean | number[]>
        default: undefined
      }
      minZoom: {
        type: import('vue').PropType<number>
      }
      maxZoom: {
        type: import('vue').PropType<number>
      }
      defaultViewport: {
        type: import('vue').PropType<Partial<import('../../types').ViewportTransform>>
      }
      translateExtent: {
        type: import('vue').PropType<import('../../types').CoordinateExtent>
      }
      nodeExtent: {
        type: import('vue').PropType<import('../../types').CoordinateExtent | import('../../types').CoordinateExtentRange>
      }
      defaultMarkerColor: {
        type: import('vue').PropType<string>
      }
      zoomOnScroll: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      zoomOnPinch: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      panOnScroll: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      panOnScrollSpeed: {
        type: import('vue').PropType<number>
      }
      panOnScrollMode: {
        type: import('vue').PropType<import('../../types').PanOnScrollMode>
      }
      paneClickDistance: {
        type: import('vue').PropType<number>
      }
      zoomOnDoubleClick: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      preventScrolling: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      selectionMode: {
        type: import('vue').PropType<import('../../types').SelectionMode>
      }
      edgeUpdaterRadius: {
        type: import('vue').PropType<number>
      }
      fitViewOnInit: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      connectOnClick: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      applyDefault: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      autoConnect: {
        type: import('vue').PropType<boolean | import('../../types').Connector>
        default: undefined
      }
      noDragClassName: {
        type: import('vue').PropType<string>
      }
      noWheelClassName: {
        type: import('vue').PropType<string>
      }
      noPanClassName: {
        type: import('vue').PropType<string>
      }
      defaultEdgeOptions: {
        type: import('vue').PropType<import('../../types').DefaultEdgeOptions>
      }
      elevateEdgesOnSelect: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      elevateNodesOnSelect: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      disableKeyboardA11y: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      edgesFocusable: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      nodesFocusable: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      autoPanOnConnect: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      autoPanOnNodeDrag: {
        type: import('vue').PropType<boolean>
        default: undefined
      }
      autoPanSpeed: {
        type: import('vue').PropType<number>
      }
    },
    {
      id: string
      emits: Readonly<{
        nodesChange: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeChange[]>
        edgesChange: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeChange[]>
        nodeDoubleClick: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        nodeClick: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        nodeMouseEnter: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        nodeMouseMove: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        nodeMouseLeave: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        nodeContextMenu: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        nodeDragStart: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeDragEvent>
        nodeDrag: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeDragEvent>
        nodeDragStop: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeDragEvent>
        nodesInitialized: import('@vueuse/shared').EventHookTrigger<import('../../types').GraphNode<any, any, string>[]>
        updateNodeInternals: import('@vueuse/shared').EventHookTrigger<string[]>
        miniMapNodeClick: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        miniMapNodeDoubleClick: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        miniMapNodeMouseEnter: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        miniMapNodeMouseMove: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        miniMapNodeMouseLeave: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeMouseEvent>
        connect: import('@vueuse/shared').EventHookTrigger<import('../../types').Connection>
        connectStart: import('@vueuse/shared').EventHookTrigger<
          {
            event?: MouseEvent | TouchEvent | undefined
          } & import('../../types').OnConnectStartParams
        >
        connectEnd: import('@vueuse/shared').EventHookTrigger<MouseEvent | TouchEvent | undefined>
        clickConnectStart: import('@vueuse/shared').EventHookTrigger<
          {
            event?: MouseEvent | TouchEvent | undefined
          } & import('../../types').OnConnectStartParams
        >
        clickConnectEnd: import('@vueuse/shared').EventHookTrigger<MouseEvent | TouchEvent | undefined>
        paneReady: import('@vueuse/shared').EventHookTrigger<VueFlowStore>
        init: import('@vueuse/shared').EventHookTrigger<VueFlowStore>
        move: import('@vueuse/shared').EventHookTrigger<{
          event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
          flowTransform: import('../../types').ViewportTransform
        }>
        moveStart: import('@vueuse/shared').EventHookTrigger<{
          event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
          flowTransform: import('../../types').ViewportTransform
        }>
        moveEnd: import('@vueuse/shared').EventHookTrigger<{
          event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
          flowTransform: import('../../types').ViewportTransform
        }>
        selectionDragStart: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeDragEvent>
        selectionDrag: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeDragEvent>
        selectionDragStop: import('@vueuse/shared').EventHookTrigger<import('../../types').NodeDragEvent>
        selectionContextMenu: import('@vueuse/shared').EventHookTrigger<{
          event: MouseEvent
          nodes: import('../../types').GraphNode<any, any, string>[]
        }>
        selectionStart: import('@vueuse/shared').EventHookTrigger<MouseEvent>
        selectionEnd: import('@vueuse/shared').EventHookTrigger<MouseEvent>
        viewportChangeStart: import('@vueuse/shared').EventHookTrigger<import('../../types').ViewportTransform>
        viewportChange: import('@vueuse/shared').EventHookTrigger<import('../../types').ViewportTransform>
        viewportChangeEnd: import('@vueuse/shared').EventHookTrigger<import('../../types').ViewportTransform>
        paneScroll: import('@vueuse/shared').EventHookTrigger<WheelEvent | undefined>
        paneClick: import('@vueuse/shared').EventHookTrigger<MouseEvent>
        paneContextMenu: import('@vueuse/shared').EventHookTrigger<MouseEvent>
        paneMouseEnter: import('@vueuse/shared').EventHookTrigger<PointerEvent>
        paneMouseMove: import('@vueuse/shared').EventHookTrigger<PointerEvent>
        paneMouseLeave: import('@vueuse/shared').EventHookTrigger<PointerEvent>
        edgeContextMenu: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeMouseEnter: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeMouseMove: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeMouseLeave: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeDoubleClick: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeClick: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeUpdateStart: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        edgeUpdate: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeUpdateEvent>
        edgeUpdateEnd: import('@vueuse/shared').EventHookTrigger<import('../../types').EdgeMouseEvent>
        error: import('@vueuse/shared').EventHookTrigger<
          import('../..').VueFlowError<
            import('../..').ErrorCode,
            | []
            | [id?: string | undefined]
            | [id: string | null]
            | [id: string, parentId: string]
            | [type: string]
            | [id: string]
            | [id: string]
            | [id: string, source: string]
            | [id: string, target: string]
            | [type: string]
            | [id: string, source: string, target: string]
            | [id: string, source: string, target: string]
            | [id: string]
            | [id: string]
          >
        >
      }>
      nodeLookup: import('vue').ComputedRef<import('../../types').NodeLookup>
      edgeLookup: import('vue').ComputedRef<import('../../types').EdgeLookup>
      vueFlowVersion: string
      onNodesChange: import('@vueuse/shared').EventHookOn<import('../../types').NodeChange[]>
      onEdgesChange: import('@vueuse/shared').EventHookOn<import('../../types').EdgeChange[]>
      onNodeDoubleClick: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onNodeClick: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onNodeMouseEnter: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onNodeMouseMove: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onNodeMouseLeave: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onNodeContextMenu: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onNodeDragStart: import('@vueuse/shared').EventHookOn<import('../../types').NodeDragEvent>
      onNodeDrag: import('@vueuse/shared').EventHookOn<import('../../types').NodeDragEvent>
      onNodeDragStop: import('@vueuse/shared').EventHookOn<import('../../types').NodeDragEvent>
      onNodesInitialized: import('@vueuse/shared').EventHookOn<import('../../types').GraphNode<any, any, string>[]>
      onUpdateNodeInternals: import('@vueuse/shared').EventHookOn<string[]>
      onMiniMapNodeClick: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onMiniMapNodeDoubleClick: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onMiniMapNodeMouseEnter: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onMiniMapNodeMouseMove: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onMiniMapNodeMouseLeave: import('@vueuse/shared').EventHookOn<import('../../types').NodeMouseEvent>
      onConnect: import('@vueuse/shared').EventHookOn<import('../../types').Connection>
      onConnectStart: import('@vueuse/shared').EventHookOn<
        {
          event?: MouseEvent | TouchEvent | undefined
        } & import('../../types').OnConnectStartParams
      >
      onConnectEnd: import('@vueuse/shared').EventHookOn<MouseEvent | TouchEvent | undefined>
      onClickConnectStart: import('@vueuse/shared').EventHookOn<
        {
          event?: MouseEvent | TouchEvent | undefined
        } & import('../../types').OnConnectStartParams
      >
      onClickConnectEnd: import('@vueuse/shared').EventHookOn<MouseEvent | TouchEvent | undefined>
      onPaneReady: import('@vueuse/shared').EventHookOn<VueFlowStore>
      onInit: import('@vueuse/shared').EventHookOn<VueFlowStore>
      onMove: import('@vueuse/shared').EventHookOn<{
        event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
        flowTransform: import('../../types').ViewportTransform
      }>
      onMoveStart: import('@vueuse/shared').EventHookOn<{
        event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
        flowTransform: import('../../types').ViewportTransform
      }>
      onMoveEnd: import('@vueuse/shared').EventHookOn<{
        event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
        flowTransform: import('../../types').ViewportTransform
      }>
      onSelectionDragStart: import('@vueuse/shared').EventHookOn<import('../../types').NodeDragEvent>
      onSelectionDrag: import('@vueuse/shared').EventHookOn<import('../../types').NodeDragEvent>
      onSelectionDragStop: import('@vueuse/shared').EventHookOn<import('../../types').NodeDragEvent>
      onSelectionContextMenu: import('@vueuse/shared').EventHookOn<{
        event: MouseEvent
        nodes: import('../../types').GraphNode<any, any, string>[]
      }>
      onSelectionStart: import('@vueuse/shared').EventHookOn<MouseEvent>
      onSelectionEnd: import('@vueuse/shared').EventHookOn<MouseEvent>
      onViewportChangeStart: import('@vueuse/shared').EventHookOn<import('../../types').ViewportTransform>
      onViewportChange: import('@vueuse/shared').EventHookOn<import('../../types').ViewportTransform>
      onViewportChangeEnd: import('@vueuse/shared').EventHookOn<import('../../types').ViewportTransform>
      onPaneScroll: import('@vueuse/shared').EventHookOn<WheelEvent | undefined>
      onPaneClick: import('@vueuse/shared').EventHookOn<MouseEvent>
      onPaneContextMenu: import('@vueuse/shared').EventHookOn<MouseEvent>
      onPaneMouseEnter: import('@vueuse/shared').EventHookOn<PointerEvent>
      onPaneMouseMove: import('@vueuse/shared').EventHookOn<PointerEvent>
      onPaneMouseLeave: import('@vueuse/shared').EventHookOn<PointerEvent>
      onEdgeContextMenu: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeMouseEnter: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeMouseMove: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeMouseLeave: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeDoubleClick: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeClick: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeUpdateStart: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onEdgeUpdate: import('@vueuse/shared').EventHookOn<import('../../types').EdgeUpdateEvent>
      onEdgeUpdateEnd: import('@vueuse/shared').EventHookOn<import('../../types').EdgeMouseEvent>
      onError: import('@vueuse/shared').EventHookOn<
        import('../..').VueFlowError<
          import('../..').ErrorCode,
          | []
          | [id?: string | undefined]
          | [id: string | null]
          | [id: string, parentId: string]
          | [type: string]
          | [id: string]
          | [id: string]
          | [id: string, source: string]
          | [id: string, target: string]
          | [type: string]
          | [id: string, source: string, target: string]
          | [id: string, source: string, target: string]
          | [id: string]
          | [id: string]
        >
      >
      vueFlowRef: import('vue').Ref<HTMLDivElement | null>
      viewportRef: import('vue').Ref<HTMLDivElement | null>
      hooks: import('vue').Ref<
        Readonly<{
          nodesChange: import('../../utils').EventHookExtended<import('../../types').NodeChange[]>
          edgesChange: import('../../utils').EventHookExtended<import('../../types').EdgeChange[]>
          nodeDoubleClick: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          nodeClick: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          nodeMouseEnter: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          nodeMouseMove: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          nodeMouseLeave: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          nodeContextMenu: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          nodeDragStart: import('../../utils').EventHookExtended<import('../../types').NodeDragEvent>
          nodeDrag: import('../../utils').EventHookExtended<import('../../types').NodeDragEvent>
          nodeDragStop: import('../../utils').EventHookExtended<import('../../types').NodeDragEvent>
          nodesInitialized: import('../../utils').EventHookExtended<import('../../types').GraphNode<any, any, string>[]>
          updateNodeInternals: import('../../utils').EventHookExtended<string[]>
          miniMapNodeClick: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          miniMapNodeDoubleClick: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          miniMapNodeMouseEnter: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          miniMapNodeMouseMove: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          miniMapNodeMouseLeave: import('../../utils').EventHookExtended<import('../../types').NodeMouseEvent>
          connect: import('../../utils').EventHookExtended<import('../../types').Connection>
          connectStart: import('../../utils').EventHookExtended<
            {
              event?: MouseEvent | TouchEvent | undefined
            } & import('../../types').OnConnectStartParams
          >
          connectEnd: import('../../utils').EventHookExtended<MouseEvent | TouchEvent | undefined>
          clickConnectStart: import('../../utils').EventHookExtended<
            {
              event?: MouseEvent | TouchEvent | undefined
            } & import('../../types').OnConnectStartParams
          >
          clickConnectEnd: import('../../utils').EventHookExtended<MouseEvent | TouchEvent | undefined>
          paneReady: import('../../utils').EventHookExtended<VueFlowStore>
          init: import('../../utils').EventHookExtended<VueFlowStore>
          move: import('../../utils').EventHookExtended<{
            event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
            flowTransform: import('../../types').ViewportTransform
          }>
          moveStart: import('../../utils').EventHookExtended<{
            event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
            flowTransform: import('../../types').ViewportTransform
          }>
          moveEnd: import('../../utils').EventHookExtended<{
            event: WheelEvent | import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
            flowTransform: import('../../types').ViewportTransform
          }>
          selectionDragStart: import('../../utils').EventHookExtended<import('../../types').NodeDragEvent>
          selectionDrag: import('../../utils').EventHookExtended<import('../../types').NodeDragEvent>
          selectionDragStop: import('../../utils').EventHookExtended<import('../../types').NodeDragEvent>
          selectionContextMenu: import('../../utils').EventHookExtended<{
            event: MouseEvent
            nodes: import('../../types').GraphNode<any, any, string>[]
          }>
          selectionStart: import('../../utils').EventHookExtended<MouseEvent>
          selectionEnd: import('../../utils').EventHookExtended<MouseEvent>
          viewportChangeStart: import('../../utils').EventHookExtended<import('../../types').ViewportTransform>
          viewportChange: import('../../utils').EventHookExtended<import('../../types').ViewportTransform>
          viewportChangeEnd: import('../../utils').EventHookExtended<import('../../types').ViewportTransform>
          paneScroll: import('../../utils').EventHookExtended<WheelEvent | undefined>
          paneClick: import('../../utils').EventHookExtended<MouseEvent>
          paneContextMenu: import('../../utils').EventHookExtended<MouseEvent>
          paneMouseEnter: import('../../utils').EventHookExtended<PointerEvent>
          paneMouseMove: import('../../utils').EventHookExtended<PointerEvent>
          paneMouseLeave: import('../../utils').EventHookExtended<PointerEvent>
          edgeContextMenu: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeMouseEnter: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeMouseMove: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeMouseLeave: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeDoubleClick: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeClick: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeUpdateStart: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          edgeUpdate: import('../../utils').EventHookExtended<import('../../types').EdgeUpdateEvent>
          edgeUpdateEnd: import('../../utils').EventHookExtended<import('../../types').EdgeMouseEvent>
          error: import('../../utils').EventHookExtended<
            import('../..').VueFlowError<
              import('../..').ErrorCode,
              | []
              | [id?: string | undefined]
              | [id: string | null]
              | [id: string, parentId: string]
              | [type: string]
              | [id: string]
              | [id: string]
              | [id: string, source: string]
              | [id: string, target: string]
              | [type: string]
              | [id: string, source: string, target: string]
              | [id: string, source: string, target: string]
              | [id: string]
              | [id: string]
            >
          >
        }>
      >
      nodes: import('vue').Ref<import('../../types').GraphNode<any, any, string>[]>
      edges: import('vue').Ref<import('../../types').GraphEdge[]>
      connectionLookup: import('vue').Ref<import('../../types').ConnectionLookup>
      d3Zoom: import('vue').Ref<import('../../types').D3Zoom | null>
      d3Selection: import('vue').Ref<import('../../types').D3Selection | null>
      d3ZoomHandler: import('vue').Ref<import('../../types').D3ZoomHandler | null>
      minZoom: import('vue').Ref<number>
      maxZoom: import('vue').Ref<number>
      defaultViewport: import('vue').Ref<Partial<import('../../types').ViewportTransform>>
      translateExtent: import('vue').Ref<import('../../types').CoordinateExtent>
      nodeExtent: import('vue').Ref<import('../../types').CoordinateExtent | import('../../types').CoordinateExtentRange>
      dimensions: import('vue').Ref<import('../../types').Dimensions>
      viewport: import('vue').Ref<import('../../types').ViewportTransform>
      onlyRenderVisibleElements: import('vue').Ref<boolean>
      nodesSelectionActive: import('vue').Ref<boolean>
      userSelectionActive: import('vue').Ref<boolean>
      multiSelectionActive: import('vue').Ref<boolean>
      deleteKeyCode: import('vue').Ref<import('@vueuse/core').KeyFilter | null>
      selectionKeyCode: import('vue').Ref<false | import('@vueuse/core').KeyFilter | null>
      multiSelectionKeyCode: import('vue').Ref<import('@vueuse/core').KeyFilter | null>
      zoomActivationKeyCode: import('vue').Ref<import('@vueuse/core').KeyFilter | null>
      panActivationKeyCode: import('vue').Ref<import('@vueuse/core').KeyFilter | null>
      connectionMode: import('vue').Ref<import('../../types').ConnectionMode>
      connectionLineOptions: import('vue').Ref<import('../../types').ConnectionLineOptions>
      connectionLineType: import('vue').Ref<import('../../types').ConnectionLineType | null>
      connectionLineStyle: import('vue').Ref<import('vue').CSSProperties | null>
      connectionStartHandle: import('vue').Ref<import('../../types').ConnectingHandle | null>
      connectionEndHandle: import('vue').Ref<import('../../types').ConnectingHandle | null>
      connectionClickStartHandle: import('vue').Ref<import('../../types').ConnectingHandle | null>
      connectionPosition: import('vue').Ref<import('../../types').XYPosition>
      connectionRadius: import('vue').Ref<number>
      connectionStatus: import('vue').Ref<import('../../types').ConnectionStatus | null>
      isValidConnection: import('vue').Ref<import('../../types').ValidConnectionFunc | null>
      connectOnClick: import('vue').Ref<boolean>
      edgeUpdaterRadius: import('vue').Ref<number>
      snapToGrid: import('vue').Ref<boolean>
      snapGrid: import('vue').Ref<import('../../types').SnapGrid>
      defaultMarkerColor: import('vue').Ref<string>
      edgesUpdatable: import('vue').Ref<import('../../types').EdgeUpdatable>
      edgesFocusable: import('vue').Ref<boolean>
      nodesFocusable: import('vue').Ref<boolean>
      nodesDraggable: import('vue').Ref<boolean>
      nodesConnectable: import('vue').Ref<boolean>
      nodeDragThreshold: import('vue').Ref<number>
      elementsSelectable: import('vue').Ref<boolean>
      selectNodesOnDrag: import('vue').Ref<boolean>
      userSelectionRect: import('vue').Ref<import('../../types').SelectionRect | null>
      selectionMode: import('vue').Ref<import('../../types').SelectionMode>
      panOnDrag: import('vue').Ref<boolean | number[]>
      zoomOnScroll: import('vue').Ref<boolean>
      zoomOnPinch: import('vue').Ref<boolean>
      panOnScroll: import('vue').Ref<boolean>
      panOnScrollSpeed: import('vue').Ref<number>
      panOnScrollMode: import('vue').Ref<import('../../types').PanOnScrollMode>
      paneClickDistance: import('vue').Ref<number>
      zoomOnDoubleClick: import('vue').Ref<boolean>
      preventScrolling: import('vue').Ref<boolean>
      paneDragging: import('vue').Ref<boolean>
      initialized: import('vue').Ref<boolean>
      applyDefault: import('vue').Ref<boolean>
      autoConnect: import('vue').Ref<boolean | import('../../types').Connector>
      fitViewOnInit: import('vue').Ref<boolean>
      fitViewOnInitDone: import('vue').Ref<boolean>
      noDragClassName: import('vue').Ref<string>
      noWheelClassName: import('vue').Ref<string>
      noPanClassName: import('vue').Ref<string>
      defaultEdgeOptions: import('vue').Ref<import('../../types').DefaultEdgeOptions | undefined>
      elevateEdgesOnSelect: import('vue').Ref<boolean>
      elevateNodesOnSelect: import('vue').Ref<boolean>
      autoPanOnConnect: import('vue').Ref<boolean>
      autoPanOnNodeDrag: import('vue').Ref<boolean>
      autoPanSpeed: import('vue').Ref<number>
      disableKeyboardA11y: import('vue').Ref<boolean>
      ariaLiveMessage: import('vue').Ref<string>
      edgeTypes?: import('vue').Ref<import('../../types').EdgeTypesObject | undefined> | undefined
      nodeTypes?: import('vue').Ref<import('../../types').NodeTypesObject | undefined> | undefined
      getEdgeTypes: import('vue').ComputedRef<Record<string, import('../../types').EdgeComponent>>
      getNodeTypes: import('vue').ComputedRef<Record<string, import('../../types').NodeComponent>>
      getElements: import('vue').ComputedRef<import('../../types').FlowElements>
      getNodes: import('vue').ComputedRef<import('../../types').GraphNode<any, any, string>[]>
      getEdges: import('vue').ComputedRef<import('../../types').GraphEdge[]>
      getNode: import('vue').ComputedRef<(id: string) => import('../../types').GraphNode<any, any, string> | undefined>
      getEdge: import('vue').ComputedRef<(id: string) => import('../../types').GraphEdge | undefined>
      getSelectedElements: import('vue').ComputedRef<import('../../types').FlowElements>
      getSelectedNodes: import('vue').ComputedRef<import('../../types').GraphNode<any, any, string>[]>
      getSelectedEdges: import('vue').ComputedRef<import('../../types').GraphEdge[]>
      getNodesInitialized: import('vue').ComputedRef<import('../../types').GraphNode<any, any, string>[]>
      areNodesInitialized: import('vue').ComputedRef<boolean>
      setElements: import('../../types').SetElements
      setNodes: import('../../types').SetNodes
      setEdges: import('../../types').SetEdges
      addNodes: import('../../types').AddNodes
      addEdges: import('../../types').AddEdges
      removeNodes: import('../../types').RemoveNodes
      removeEdges: import('../../types').RemoveEdges
      findNode: import('../../types').FindNode
      findEdge: import('../../types').FindEdge
      updateEdge: import('../../types').UpdateEdge
      updateEdgeData: import('../../types').UpdateEdgeData
      updateNode: import('../../types').UpdateNode
      updateNodeData: import('../../types').UpdateNodeData
      applyEdgeChanges: (changes: import('../../types').EdgeChange[]) => import('../../types').GraphEdge[]
      applyNodeChanges: (changes: import('../../types').NodeChange[]) => import('../../types').GraphNode<any, any, string>[]
      addSelectedElements: (elements: import('../../types').FlowElements) => void
      addSelectedEdges: (edges: import('../../types').GraphEdge[]) => void
      addSelectedNodes: (nodes: import('../../types').GraphNode<any, any, string>[]) => void
      removeSelectedEdges: (edges: import('../../types').GraphEdge[]) => void
      removeSelectedNodes: (nodes: import('../../types').GraphNode<any, any, string>[]) => void
      removeSelectedElements: (elements?: import('../../types').Elements | undefined) => void
      setMinZoom: (zoom: number) => void
      setMaxZoom: (zoom: number) => void
      setTranslateExtent: (translateExtent: import('../../types').CoordinateExtent) => void
      setNodeExtent: (nodeExtent: import('../../types').CoordinateExtent | import('../../types').CoordinateExtentRange) => void
      setPaneClickDistance: (distance: number) => void
      setInteractive: (isInteractive: boolean) => void
      setState: import('../../types').SetState
      toObject: () => import('../../types').FlowExportObject
      fromObject: (obj: import('../../types').FlowExportObject) => Promise<boolean>
      updateNodeInternals: import('../../types').UpdateNodeInternals
      startConnection: (
        startHandle: import('../../types').ConnectingHandle,
        position?: import('../../types').XYPosition | undefined,
        isClick?: boolean | undefined,
      ) => void
      updateConnection: (
        position: import('../../types').XYPosition,
        result?: import('../../types').ConnectingHandle | null | undefined,
        status?: import('../../types').ConnectionStatus | null | undefined,
      ) => void
      endConnection: (event?: MouseEvent | TouchEvent | undefined, isClick?: boolean | undefined) => void
      updateNodePositions: import('../../types').UpdateNodePosition
      updateNodeDimensions: import('../../types').UpdateNodeDimensions
      getIntersectingNodes: import('../../types').GetIntersectingNodes
      isNodeIntersecting: import('../../types').IsNodeIntersecting
      getIncomers: (
        nodeOrId: string | import('../../types').Node<any, any, string>,
      ) => import('../../types').GraphNode<any, any, string>[]
      getOutgoers: (
        nodeOrId: string | import('../../types').Node<any, any, string>,
      ) => import('../../types').GraphNode<any, any, string>[]
      getConnectedEdges: (nodesOrId: string | import('../../types').Node<any, any, string>[]) => import('../../types').GraphEdge[]
      getHandleConnections: ({
        id,
        type,
        nodeId,
      }: {
        id?: string | null | undefined
        type: import('../../types').HandleType
        nodeId: string
      }) => import('../../types').HandleConnection[]
      panBy: (delta: import('../../types').XYPosition) => boolean
      viewportHelper: import('vue').ComputedRef<import('../../composables').ViewportHelper>
      $reset: () => void
      $destroy: () => void
      screenToFlowCoordinate: import('../../types').Project
      flowToScreenCoordinate: import('../../types').Project
      zoomIn: import('../../types').ZoomInOut
      zoomOut: import('../../types').ZoomInOut
      zoomTo: import('../../types').ZoomTo
      setViewport: import('../../types').SetViewport
      setTransform: import('../../types').SetViewport
      getViewport: import('../../types').GetViewport
      getTransform: import('../../types').GetViewport
      fitView: import('../../types').FitView
      setCenter: import('../../types').SetCenter
      fitBounds: import('../../types').FitBounds
      project: import('../../types').Project
    },
    unknown,
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {
      'nodesChange': (changes: import('../../types').NodeChange[]) => void
      'edgesChange': (changes: import('../../types').EdgeChange[]) => void
      'nodesInitialized': () => void
      'paneReady': (paneEvent: VueFlowStore) => void
      'init': (paneEvent: VueFlowStore) => void
      'updateNodeInternals': () => void
      'error': (
        error: import('../..').VueFlowError<
          import('../..').ErrorCode,
          | []
          | [id?: string | undefined]
          | [id: string | null]
          | [id: string, parentId: string]
          | [type: string]
          | [id: string]
          | [id: string]
          | [id: string, source: string]
          | [id: string, target: string]
          | [type: string]
          | [id: string, source: string, target: string]
          | [id: string, source: string, target: string]
          | [id: string]
          | [id: string]
        >,
      ) => void
      'connect': (connectionEvent: import('../../types').Connection) => void
      'connectStart': (
        connectionEvent: {
          event?: MouseEvent | undefined
        } & import('../../types').OnConnectStartParams,
      ) => void
      'connectEnd': (connectionEvent?: MouseEvent | undefined) => void
      'clickConnectStart': (
        connectionEvent: {
          event?: MouseEvent | undefined
        } & import('../../types').OnConnectStartParams,
      ) => void
      'clickConnectEnd': (connectionEvent?: MouseEvent | undefined) => void
      'moveStart': (moveEvent: {
        event: import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
        flowTransform: import('../../types').ViewportTransform
      }) => void
      'move': (moveEvent: {
        event: import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
        flowTransform: import('../../types').ViewportTransform
      }) => void
      'moveEnd': (moveEvent: {
        event: import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
        flowTransform: import('../../types').ViewportTransform
      }) => void
      'selectionDragStart': (selectionEvent: import('../../types').NodeDragEvent) => void
      'selectionDrag': (selectionEvent: import('../../types').NodeDragEvent) => void
      'selectionDragStop': (selectionEvent: import('../../types').NodeDragEvent) => void
      'selectionContextMenu': (selectionEvent: {
        event: MouseEvent
        nodes: import('../../types').GraphNode<any, any, string>[]
      }) => void
      'selectionStart': (selectionEvent: MouseEvent) => void
      'selectionEnd': (selectionEvent: MouseEvent) => void
      'viewportChangeStart': (viewport: import('../../types').ViewportTransform) => void
      'viewportChange': (viewport: import('../../types').ViewportTransform) => void
      'viewportChangeEnd': (viewport: import('../../types').ViewportTransform) => void
      'paneScroll': (paneScrollEvent: WheelEvent | undefined) => void
      'paneClick': (paneMouseEvent: MouseEvent) => void
      'paneContextMenu': (paneMouseEvent: MouseEvent) => void
      'paneMouseEnter': (paneMouseEvent: MouseEvent) => void
      'paneMouseMove': (paneMouseEvent: MouseEvent) => void
      'paneMouseLeave': (paneMouseEvent: MouseEvent) => void
      'edgeUpdate': (edgeUpdateEvent: import('../../types').EdgeUpdateEvent) => void
      'edgeContextMenu': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeMouseEnter': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeMouseMove': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeMouseLeave': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeDoubleClick': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeClick': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeUpdateStart': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'edgeUpdateEnd': (edgeMouseEvent: import('../../types').EdgeMouseEvent) => void
      'nodeDoubleClick': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'nodeClick': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'nodeMouseEnter': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'nodeMouseMove': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'nodeMouseLeave': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'nodeContextMenu': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'nodeDragStart': (nodeDragEvent: import('../../types').NodeDragEvent) => void
      'nodeDrag': (nodeDragEvent: import('../../types').NodeDragEvent) => void
      'nodeDragStop': (nodeDragEvent: import('../../types').NodeDragEvent) => void
      'miniMapNodeClick': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'miniMapNodeDoubleClick': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'miniMapNodeMouseEnter': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'miniMapNodeMouseMove': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'miniMapNodeMouseLeave': (nodeMouseEvent: import('../../types').NodeMouseEvent) => void
      'update:modelValue': (value: import('../../types').FlowElements<any, any, any, any>) => void
      'update:nodes': (value: import('../../types').GraphNode<any, any, string>[]) => void
      'update:edges': (value: import('../../types').GraphEdge[]) => void
    },
    string,
    import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps,
    Readonly<
      import('vue').ExtractPropTypes<{
        id: {
          type: import('vue').PropType<string>
        }
        nodes: {
          type: import('vue').PropType<import('../../types').Node<any, any, string>[]>
        }
        edges: {
          type: import('vue').PropType<import('../../types').Edge[]>
        }
        modelValue: {
          type: import('vue').PropType<import('../../types').Elements<any, any, any, any>>
        }
        edgeTypes: {
          type: import('vue').PropType<import('../../types').EdgeTypesObject>
        }
        nodeTypes: {
          type: import('vue').PropType<import('../../types').NodeTypesObject>
        }
        connectionMode: {
          type: import('vue').PropType<import('../../types').ConnectionMode>
        }
        connectionLineType: {
          type: import('vue').PropType<import('../../types').ConnectionLineType | null>
        }
        connectionLineStyle: {
          type: import('vue').PropType<import('vue').CSSProperties | null>
          default: undefined
        }
        connectionLineOptions: {
          type: import('vue').PropType<import('../../types').ConnectionLineOptions>
          default: undefined
        }
        connectionRadius: {
          type: import('vue').PropType<number>
        }
        isValidConnection: {
          type: import('vue').PropType<import('../../types').ValidConnectionFunc | null>
          default: undefined
        }
        deleteKeyCode: {
          type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
          default: undefined
        }
        selectionKeyCode: {
          type: import('vue').PropType<false | import('@vueuse/core').KeyFilter | null>
          default: undefined
        }
        multiSelectionKeyCode: {
          type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
          default: undefined
        }
        zoomActivationKeyCode: {
          type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
          default: undefined
        }
        panActivationKeyCode: {
          type: import('vue').PropType<import('@vueuse/core').KeyFilter | null>
          default: undefined
        }
        snapToGrid: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        snapGrid: {
          type: import('vue').PropType<import('../../types').SnapGrid>
        }
        onlyRenderVisibleElements: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        edgesUpdatable: {
          type: import('vue').PropType<import('../../types').EdgeUpdatable>
          default: undefined
        }
        nodesDraggable: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        nodesConnectable: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        nodeDragThreshold: {
          type: import('vue').PropType<number>
        }
        elementsSelectable: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        selectNodesOnDrag: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        panOnDrag: {
          type: import('vue').PropType<boolean | number[]>
          default: undefined
        }
        minZoom: {
          type: import('vue').PropType<number>
        }
        maxZoom: {
          type: import('vue').PropType<number>
        }
        defaultViewport: {
          type: import('vue').PropType<Partial<import('../../types').ViewportTransform>>
        }
        translateExtent: {
          type: import('vue').PropType<import('../../types').CoordinateExtent>
        }
        nodeExtent: {
          type: import('vue').PropType<import('../../types').CoordinateExtent | import('../../types').CoordinateExtentRange>
        }
        defaultMarkerColor: {
          type: import('vue').PropType<string>
        }
        zoomOnScroll: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        zoomOnPinch: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        panOnScroll: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        panOnScrollSpeed: {
          type: import('vue').PropType<number>
        }
        panOnScrollMode: {
          type: import('vue').PropType<import('../../types').PanOnScrollMode>
        }
        paneClickDistance: {
          type: import('vue').PropType<number>
        }
        zoomOnDoubleClick: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        preventScrolling: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        selectionMode: {
          type: import('vue').PropType<import('../../types').SelectionMode>
        }
        edgeUpdaterRadius: {
          type: import('vue').PropType<number>
        }
        fitViewOnInit: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        connectOnClick: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        applyDefault: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        autoConnect: {
          type: import('vue').PropType<boolean | import('../../types').Connector>
          default: undefined
        }
        noDragClassName: {
          type: import('vue').PropType<string>
        }
        noWheelClassName: {
          type: import('vue').PropType<string>
        }
        noPanClassName: {
          type: import('vue').PropType<string>
        }
        defaultEdgeOptions: {
          type: import('vue').PropType<import('../../types').DefaultEdgeOptions>
        }
        elevateEdgesOnSelect: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        elevateNodesOnSelect: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        disableKeyboardA11y: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        edgesFocusable: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        nodesFocusable: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        autoPanOnConnect: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        autoPanOnNodeDrag: {
          type: import('vue').PropType<boolean>
          default: undefined
        }
        autoPanSpeed: {
          type: import('vue').PropType<number>
        }
      }>
    > & {
      'onMove'?:
        | ((moveEvent: {
            event: import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
            flowTransform: import('../../types').ViewportTransform
          }) => any)
        | undefined
      'onNodesChange'?: ((changes: import('../../types').NodeChange[]) => any) | undefined
      'onEdgesChange'?: ((changes: import('../../types').EdgeChange[]) => any) | undefined
      'onNodeDoubleClick'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onNodeClick'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onNodeMouseEnter'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onNodeMouseMove'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onNodeMouseLeave'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onNodeContextMenu'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onNodeDragStart'?: ((nodeDragEvent: import('../../types').NodeDragEvent) => any) | undefined
      'onNodeDrag'?: ((nodeDragEvent: import('../../types').NodeDragEvent) => any) | undefined
      'onNodeDragStop'?: ((nodeDragEvent: import('../../types').NodeDragEvent) => any) | undefined
      'onNodesInitialized'?: (() => any) | undefined
      'onUpdateNodeInternals'?: (() => any) | undefined
      'onMiniMapNodeClick'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onMiniMapNodeDoubleClick'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onMiniMapNodeMouseEnter'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onMiniMapNodeMouseMove'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onMiniMapNodeMouseLeave'?: ((nodeMouseEvent: import('../../types').NodeMouseEvent) => any) | undefined
      'onConnect'?: ((connectionEvent: import('../../types').Connection) => any) | undefined
      'onConnectStart'?:
        | ((
            connectionEvent: {
              event?: MouseEvent | undefined
            } & import('../../types').OnConnectStartParams,
          ) => any)
        | undefined
      'onConnectEnd'?: ((connectionEvent?: MouseEvent | undefined) => any) | undefined
      'onClickConnectStart'?:
        | ((
            connectionEvent: {
              event?: MouseEvent | undefined
            } & import('../../types').OnConnectStartParams,
          ) => any)
        | undefined
      'onClickConnectEnd'?: ((connectionEvent?: MouseEvent | undefined) => any) | undefined
      'onPaneReady'?: ((paneEvent: VueFlowStore) => any) | undefined
      'onInit'?: ((paneEvent: VueFlowStore) => any) | undefined
      'onMoveStart'?:
        | ((moveEvent: {
            event: import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
            flowTransform: import('../../types').ViewportTransform
          }) => any)
        | undefined
      'onMoveEnd'?:
        | ((moveEvent: {
            event: import('d3-zoom').D3ZoomEvent<HTMLDivElement, any>
            flowTransform: import('../../types').ViewportTransform
          }) => any)
        | undefined
      'onSelectionDragStart'?: ((selectionEvent: import('../../types').NodeDragEvent) => any) | undefined
      'onSelectionDrag'?: ((selectionEvent: import('../../types').NodeDragEvent) => any) | undefined
      'onSelectionDragStop'?: ((selectionEvent: import('../../types').NodeDragEvent) => any) | undefined
      'onSelectionContextMenu'?:
        | ((selectionEvent: { event: MouseEvent; nodes: import('../../types').GraphNode<any, any, string>[] }) => any)
        | undefined
      'onSelectionStart'?: ((selectionEvent: MouseEvent) => any) | undefined
      'onSelectionEnd'?: ((selectionEvent: MouseEvent) => any) | undefined
      'onViewportChangeStart'?: ((viewport: import('../../types').ViewportTransform) => any) | undefined
      'onViewportChange'?: ((viewport: import('../../types').ViewportTransform) => any) | undefined
      'onViewportChangeEnd'?: ((viewport: import('../../types').ViewportTransform) => any) | undefined
      'onPaneScroll'?: ((paneScrollEvent: WheelEvent | undefined) => any) | undefined
      'onPaneClick'?: ((paneMouseEvent: MouseEvent) => any) | undefined
      'onPaneContextMenu'?: ((paneMouseEvent: MouseEvent) => any) | undefined
      'onPaneMouseEnter'?: ((paneMouseEvent: MouseEvent) => any) | undefined
      'onPaneMouseMove'?: ((paneMouseEvent: MouseEvent) => any) | undefined
      'onPaneMouseLeave'?: ((paneMouseEvent: MouseEvent) => any) | undefined
      'onEdgeContextMenu'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeMouseEnter'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeMouseMove'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeMouseLeave'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeDoubleClick'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeClick'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeUpdateStart'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onEdgeUpdate'?: ((edgeUpdateEvent: import('../../types').EdgeUpdateEvent) => any) | undefined
      'onEdgeUpdateEnd'?: ((edgeMouseEvent: import('../../types').EdgeMouseEvent) => any) | undefined
      'onError'?:
        | ((
            error: import('../..').VueFlowError<
              import('../..').ErrorCode,
              | []
              | [id?: string | undefined]
              | [id: string | null]
              | [id: string, parentId: string]
              | [type: string]
              | [id: string]
              | [id: string]
              | [id: string, source: string]
              | [id: string, target: string]
              | [type: string]
              | [id: string, source: string, target: string]
              | [id: string, source: string, target: string]
              | [id: string]
              | [id: string]
            >,
          ) => any)
        | undefined
      'onUpdate:modelValue'?: ((value: import('../../types').FlowElements<any, any, any, any>) => any) | undefined
      'onUpdate:nodes'?: ((value: import('../../types').GraphNode<any, any, string>[]) => any) | undefined
      'onUpdate:edges'?: ((value: import('../../types').GraphEdge[]) => any) | undefined
    },
    {
      connectionLineStyle: import('vue').CSSProperties | null
      connectionLineOptions: import('../../types').ConnectionLineOptions
      isValidConnection: import('../../types').ValidConnectionFunc | null
      deleteKeyCode: import('@vueuse/core').KeyFilter | null
      selectionKeyCode: false | import('@vueuse/core').KeyFilter | null
      multiSelectionKeyCode: import('@vueuse/core').KeyFilter | null
      zoomActivationKeyCode: import('@vueuse/core').KeyFilter | null
      panActivationKeyCode: import('@vueuse/core').KeyFilter | null
      snapToGrid: boolean
      onlyRenderVisibleElements: boolean
      edgesUpdatable: import('../../types').EdgeUpdatable
      nodesDraggable: boolean
      nodesConnectable: boolean
      elementsSelectable: boolean
      selectNodesOnDrag: boolean
      panOnDrag: boolean | number[]
      zoomOnScroll: boolean
      zoomOnPinch: boolean
      panOnScroll: boolean
      zoomOnDoubleClick: boolean
      preventScrolling: boolean
      fitViewOnInit: boolean
      connectOnClick: boolean
      applyDefault: boolean
      autoConnect: boolean | import('../../types').Connector
      elevateEdgesOnSelect: boolean
      elevateNodesOnSelect: boolean
      disableKeyboardA11y: boolean
      edgesFocusable: boolean
      nodesFocusable: boolean
      autoPanOnConnect: boolean
      autoPanOnNodeDrag: boolean
    },
    {}
  >,
  Readonly<FlowSlots>
>
export default _default
type __VLS_WithTemplateSlots<T, S> = T & {
  new (): {
    $slots: S
  }
}
