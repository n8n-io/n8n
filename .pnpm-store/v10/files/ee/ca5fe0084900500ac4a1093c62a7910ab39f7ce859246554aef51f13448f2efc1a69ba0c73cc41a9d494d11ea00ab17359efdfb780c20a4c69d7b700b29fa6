import type { Dimensions, Position, XYPosition } from './flow'
import type { Connection, ConnectionMode } from './connection'
import type { GraphEdge } from './edge'
import type { GraphNode } from './node'
import type { NodeLookup } from './store'

export type HandleType = 'source' | 'target'
export interface HandleElement extends XYPosition, Dimensions {
  id?: string | null
  position: Position
  type: HandleType
  nodeId: string
}
export interface ConnectionHandle extends XYPosition {
  id: string | null
  type: HandleType | null
  nodeId: string
}
export interface ConnectingHandle extends XYPosition {
  nodeId: string
  type: HandleType
  id?: string | null
  position: Position
}
/** A valid connection function can determine if an attempted connection is valid or not, i.e. abort creating a new edge */
export type ValidConnectionFunc = (
  connection: Connection,
  elements: {
    edges: GraphEdge[]
    nodes: GraphNode[]
    sourceNode: GraphNode
    targetNode: GraphNode
  },
) => boolean
export type HandleConnectableFunc = (node: GraphNode, connectedEdges: GraphEdge[]) => boolean
/**
 * set to true to allow unlimited connections,
 * single for only one connection
 * or use a cb function to determine connect-ability
 *
 * if set to single and the handle already has more than one connection, it will act the same as setting it to false
 */
export type HandleConnectable = boolean | number | 'single' | HandleConnectableFunc
export interface HandleProps {
  /** Unique id of handle element */
  id?: string
  /** Handle type (source / target) {@link HandleType} */
  type?: HandleType
  /** Handle position (top, bottom, left, right) {@link Position} */
  position?: Position
  /** A valid connection func {@link ValidConnectionFunc} */
  isValidConnection?: ValidConnectionFunc
  /** Enable/disable connecting to handle altogether */
  connectable?: HandleConnectable
  /** Can this handle be used to *start* a connection */
  connectableStart?: boolean
  /** Can this handle be used to *end* a connection */
  connectableEnd?: boolean
}
export interface IsValidParams {
  handle: ConnectingHandle | null
  connectionMode: ConnectionMode
  fromNodeId: string
  fromHandleId: string | null
  fromType: HandleType
  isValidConnection?: ValidConnectionFunc
  doc: Document | ShadowRoot
  lib: string
  flowId: string | null
  nodeLookup: NodeLookup
}
export interface Result {
  handleDomNode: Element | null
  isValid: boolean
  connection: Connection | null
  toHandle: ConnectingHandle | null
}
export interface ConnectionInProgress<NodeType extends GraphNode = GraphNode> {
  inProgress: true
  isValid: boolean | null
  from: XYPosition
  fromHandle: HandleElement
  fromPosition: Position
  fromNode: NodeType
  to: XYPosition
  toHandle: ConnectingHandle | null
  toPosition: Position
  toNode: NodeType | null
}
