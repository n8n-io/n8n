import type { Server as _grpc_channelz_v1_Server, Server__Output as _grpc_channelz_v1_Server__Output } from '../../../grpc/channelz/v1/Server';
export interface GetServersResponse {
    /**
     * list of servers that the connection detail service knows about.  Sorted in
     * ascending server_id order.
     * Must contain at least 1 result, otherwise 'end' must be true.
     */
    'server'?: (_grpc_channelz_v1_Server)[];
    /**
     * If set, indicates that the list of servers is the final list.  Requesting
     * more servers will only return more if they are created after this RPC
     * completes.
     */
    'end'?: (boolean);
}
export interface GetServersResponse__Output {
    /**
     * list of servers that the connection detail service knows about.  Sorted in
     * ascending server_id order.
     * Must contain at least 1 result, otherwise 'end' must be true.
     */
    'server': (_grpc_channelz_v1_Server__Output)[];
    /**
     * If set, indicates that the list of servers is the final list.  Requesting
     * more servers will only return more if they are created after this RPC
     * completes.
     */
    'end': (boolean);
}
