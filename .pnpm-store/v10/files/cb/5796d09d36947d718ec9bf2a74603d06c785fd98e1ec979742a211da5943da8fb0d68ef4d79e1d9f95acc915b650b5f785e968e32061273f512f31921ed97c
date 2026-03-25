// Original file: proto/channelz.proto

import type { SocketRef as _grpc_channelz_v1_SocketRef, SocketRef__Output as _grpc_channelz_v1_SocketRef__Output } from '../../../grpc/channelz/v1/SocketRef';
import type { SocketData as _grpc_channelz_v1_SocketData, SocketData__Output as _grpc_channelz_v1_SocketData__Output } from '../../../grpc/channelz/v1/SocketData';
import type { Address as _grpc_channelz_v1_Address, Address__Output as _grpc_channelz_v1_Address__Output } from '../../../grpc/channelz/v1/Address';
import type { Security as _grpc_channelz_v1_Security, Security__Output as _grpc_channelz_v1_Security__Output } from '../../../grpc/channelz/v1/Security';

/**
 * Information about an actual connection.  Pronounced "sock-ay".
 */
export interface Socket {
  /**
   * The identifier for the Socket.
   */
  'ref'?: (_grpc_channelz_v1_SocketRef | null);
  /**
   * Data specific to this Socket.
   */
  'data'?: (_grpc_channelz_v1_SocketData | null);
  /**
   * The locally bound address.
   */
  'local'?: (_grpc_channelz_v1_Address | null);
  /**
   * The remote bound address.  May be absent.
   */
  'remote'?: (_grpc_channelz_v1_Address | null);
  /**
   * Security details for this socket.  May be absent if not available, or
   * there is no security on the socket.
   */
  'security'?: (_grpc_channelz_v1_Security | null);
  /**
   * Optional, represents the name of the remote endpoint, if different than
   * the original target name.
   */
  'remote_name'?: (string);
}

/**
 * Information about an actual connection.  Pronounced "sock-ay".
 */
export interface Socket__Output {
  /**
   * The identifier for the Socket.
   */
  'ref': (_grpc_channelz_v1_SocketRef__Output | null);
  /**
   * Data specific to this Socket.
   */
  'data': (_grpc_channelz_v1_SocketData__Output | null);
  /**
   * The locally bound address.
   */
  'local': (_grpc_channelz_v1_Address__Output | null);
  /**
   * The remote bound address.  May be absent.
   */
  'remote': (_grpc_channelz_v1_Address__Output | null);
  /**
   * Security details for this socket.  May be absent if not available, or
   * there is no security on the socket.
   */
  'security': (_grpc_channelz_v1_Security__Output | null);
  /**
   * Optional, represents the name of the remote endpoint, if different than
   * the original target name.
   */
  'remote_name': (string);
}
