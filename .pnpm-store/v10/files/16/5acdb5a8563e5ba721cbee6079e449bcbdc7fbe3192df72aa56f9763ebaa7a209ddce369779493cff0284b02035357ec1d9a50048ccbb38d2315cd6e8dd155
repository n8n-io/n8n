import type { ChannelConnectivityState as _grpc_channelz_v1_ChannelConnectivityState, ChannelConnectivityState__Output as _grpc_channelz_v1_ChannelConnectivityState__Output } from '../../../grpc/channelz/v1/ChannelConnectivityState';
import type { ChannelTrace as _grpc_channelz_v1_ChannelTrace, ChannelTrace__Output as _grpc_channelz_v1_ChannelTrace__Output } from '../../../grpc/channelz/v1/ChannelTrace';
import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../google/protobuf/Timestamp';
import type { Long } from '@grpc/proto-loader';
/**
 * Channel data is data related to a specific Channel or Subchannel.
 */
export interface ChannelData {
    /**
     * The connectivity state of the channel or subchannel.  Implementations
     * should always set this.
     */
    'state'?: (_grpc_channelz_v1_ChannelConnectivityState | null);
    /**
     * The target this channel originally tried to connect to.  May be absent
     */
    'target'?: (string);
    /**
     * A trace of recent events on the channel.  May be absent.
     */
    'trace'?: (_grpc_channelz_v1_ChannelTrace | null);
    /**
     * The number of calls started on the channel
     */
    'calls_started'?: (number | string | Long);
    /**
     * The number of calls that have completed with an OK status
     */
    'calls_succeeded'?: (number | string | Long);
    /**
     * The number of calls that have completed with a non-OK status
     */
    'calls_failed'?: (number | string | Long);
    /**
     * The last time a call was started on the channel.
     */
    'last_call_started_timestamp'?: (_google_protobuf_Timestamp | null);
}
/**
 * Channel data is data related to a specific Channel or Subchannel.
 */
export interface ChannelData__Output {
    /**
     * The connectivity state of the channel or subchannel.  Implementations
     * should always set this.
     */
    'state': (_grpc_channelz_v1_ChannelConnectivityState__Output | null);
    /**
     * The target this channel originally tried to connect to.  May be absent
     */
    'target': (string);
    /**
     * A trace of recent events on the channel.  May be absent.
     */
    'trace': (_grpc_channelz_v1_ChannelTrace__Output | null);
    /**
     * The number of calls started on the channel
     */
    'calls_started': (string);
    /**
     * The number of calls that have completed with an OK status
     */
    'calls_succeeded': (string);
    /**
     * The number of calls that have completed with a non-OK status
     */
    'calls_failed': (string);
    /**
     * The last time a call was started on the channel.
     */
    'last_call_started_timestamp': (_google_protobuf_Timestamp__Output | null);
}
