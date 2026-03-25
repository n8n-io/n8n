import type { SocketRef as _grpc_channelz_v1_SocketRef, SocketRef__Output as _grpc_channelz_v1_SocketRef__Output } from '../../../grpc/channelz/v1/SocketRef';
export interface GetServerSocketsResponse {
    /**
     * list of socket refs that the connection detail service knows about.  Sorted in
     * ascending socket_id order.
     * Must contain at least 1 result, otherwise 'end' must be true.
     */
    'socket_ref'?: (_grpc_channelz_v1_SocketRef)[];
    /**
     * If set, indicates that the list of sockets is the final list.  Requesting
     * more sockets will only return more if they are created after this RPC
     * completes.
     */
    'end'?: (boolean);
}
export interface GetServerSocketsResponse__Output {
    /**
     * list of socket refs that the connection detail service knows about.  Sorted in
     * ascending socket_id order.
     * Must contain at least 1 result, otherwise 'end' must be true.
     */
    'socket_ref': (_grpc_channelz_v1_SocketRef__Output)[];
    /**
     * If set, indicates that the list of sockets is the final list.  Requesting
     * more sockets will only return more if they are created after this RPC
     * completes.
     */
    'end': (boolean);
}
