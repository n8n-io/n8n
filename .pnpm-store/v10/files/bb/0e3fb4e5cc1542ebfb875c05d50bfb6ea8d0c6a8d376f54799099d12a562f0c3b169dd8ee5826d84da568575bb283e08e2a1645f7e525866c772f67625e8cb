import type { ConnectionMode, Position } from '../types'
import type {
  Actions,
  ConnectionHandle,
  ConnectionStatus,
  GraphEdge,
  GraphNode,
  HandleElement,
  HandleType,
  IsValidParams,
  NodeHandleBounds,
  NodeLookup,
  Result,
  XYPosition,
} from '../types'

export declare function resetRecentHandle(handleDomNode: Element): void
export declare function getHandles(
  node: GraphNode,
  handleBounds: NodeHandleBounds,
  type: HandleType,
  currentHandle: string,
): ConnectionHandle[]
export declare function getClosestHandle(
  position: XYPosition,
  connectionRadius: number,
  nodeLookup: NodeLookup,
  fromHandle: {
    nodeId: string
    type: HandleType
    id?: string | null
  },
): HandleElement | null
export declare function isValidHandle(
  event: MouseEvent | TouchEvent,
  { handle, connectionMode, fromNodeId, fromHandleId, fromType, doc, lib, flowId, isValidConnection }: IsValidParams,
  edges: GraphEdge[],
  nodes: GraphNode[],
  findNode: Actions['findNode'],
): Result
export declare function getHandleType(edgeUpdaterType: HandleType | undefined, handleDomNode: Element | null): HandleType | null
export declare function getConnectionStatus(
  isInsideConnectionRadius: boolean,
  isHandleValid: boolean | null,
): ConnectionStatus | null
export declare function isConnectionValid(isInsideConnectionRadius: boolean, isHandleValid: boolean): boolean | null
export declare function getHandle(
  nodeId: string,
  handleType: HandleType,
  handleId: string | null,
  nodeLookup: NodeLookup,
  connectionMode: ConnectionMode,
  withAbsolutePosition?: boolean,
): HandleElement | null
export declare const oppositePosition: {
  left: Position
  right: Position
  top: Position
  bottom: Position
}
