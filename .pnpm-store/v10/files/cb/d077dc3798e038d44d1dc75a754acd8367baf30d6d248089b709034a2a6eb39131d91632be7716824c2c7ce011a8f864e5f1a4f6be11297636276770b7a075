import type { ChannelTrace as _grpc_channelz_v1_ChannelTrace, ChannelTrace__Output as _grpc_channelz_v1_ChannelTrace__Output } from '../../../grpc/channelz/v1/ChannelTrace';
import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../google/protobuf/Timestamp';
import type { Long } from '@grpc/proto-loader';
/**
 * ServerData is data for a specific Server.
 */
export interface ServerData {
    /**
     * A trace of recent events on the server.  May be absent.
     */
    'trace'?: (_grpc_channelz_v1_ChannelTrace | null);
    /**
     * The number of incoming calls started on the server
     */
    'calls_started'?: (number | string | Long);
    /**
     * The number of incoming calls that have completed with an OK status
     */
    'calls_succeeded'?: (number | string | Long);
    /**
     * The number of incoming calls that have a completed with a non-OK status
     */
    'calls_failed'?: (number | string | Long);
    /**
     * The last time a call was started on the server.
     */
    'last_call_started_timestamp'?: (_google_protobuf_Timestamp | null);
}
/**
 * ServerData is data for a specific Server.
 */
export interface ServerData__Output {
    /**
     * A trace of recent events on the server.  May be absent.
     */
    'trace': (_grpc_channelz_v1_ChannelTrace__Output | null);
    /**
     * The number of incoming calls started on the server
     */
    'calls_started': (string);
    /**
     * The number of incoming calls that have completed with an OK status
     */
    'calls_succeeded': (string);
    /**
     * The number of incoming calls that have a completed with a non-OK status
     */
    'calls_failed': (string);
    /**
     * The last time a call was started on the server.
     */
    'last_call_started_timestamp': (_google_protobuf_Timestamp__Output | null);
}
