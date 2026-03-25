import type { CSSProperties } from 'vue'
import type { Position } from './flow'
import type { GraphNode } from './node'
import type { HandleElement, HandleType } from './handle'
import type { Edge, EdgeMarkerType } from './edge'

/** Connection line types (same as default edge types */
export declare enum ConnectionLineType {
  Bezier = 'default',
  SimpleBezier = 'simple-bezier',
  Straight = 'straight',
  Step = 'step',
  SmoothStep = 'smoothstep',
}
export interface ConnectionLineOptions {
  type?: ConnectionLineType
  style?: CSSProperties
  class?: string
  markerEnd?: EdgeMarkerType
  markerStart?: EdgeMarkerType
}
/** Connection params that are passed when onConnect is called */
export interface Connection {
  /** Source node id */
  source: string
  /** Target node id */
  target: string
  /** Source handle id */
  sourceHandle?: string | null
  /** Target handle id */
  targetHandle?: string | null
}
/**
 * Connection with edge id
 * @deprecated
 * todo: remove in next major release
 */
export interface HandleConnection extends Connection {
  edgeId: string
}
export type NodeConnection = Connection & {
  edgeId: string
}
export type Connector = (
  params: Connection,
) => Promise<(Connection & Partial<Edge>) | false> | ((Connection & Partial<Edge>) | false)
export type ConnectionStatus = 'valid' | 'invalid'
/** The source nodes params when connection is initiated */
export interface OnConnectStartParams {
  /** Source node id */
  nodeId?: string
  /** Source handle id */
  handleId: string | null
  /** Source handle type */
  handleType?: HandleType
}
/** Connection modes, when set to loose all handles are treated as source */
export declare enum ConnectionMode {
  Strict = 'strict',
  Loose = 'loose',
}
export interface ConnectionLineProps {
  /** Source X position of the connection line */
  sourceX: number
  /** Source Y position of the connection line */
  sourceY: number
  /** Source position of the connection line */
  sourcePosition: Position
  /** Target X position of the connection line */
  targetX: number
  /** Target Y position of the connection line */
  targetY: number
  /** Target position of the connection line */
  targetPosition: Position
  /** The source node of the connection line */
  sourceNode: GraphNode
  /** The source handle element (not the DOM element) of the connection line */
  sourceHandle: HandleElement | null
  /** The target node of the connection line */
  targetNode: GraphNode | null
  /** The target handle element (not the DOM element) of the connection line */
  targetHandle: HandleElement | null
  /** marker url */
  markerStart: string
  /** marker url */
  markerEnd: string
  /** status of the connection (valid, invalid) */
  connectionStatus: ConnectionStatus | null
}
export type ConnectionLookup = Map<string, Map<string, NodeConnection>>
