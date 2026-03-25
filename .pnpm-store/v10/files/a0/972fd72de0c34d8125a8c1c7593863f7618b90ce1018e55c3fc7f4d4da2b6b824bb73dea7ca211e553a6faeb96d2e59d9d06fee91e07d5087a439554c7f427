import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../google/protobuf/Timestamp';
import type { ChannelTraceEvent as _grpc_channelz_v1_ChannelTraceEvent, ChannelTraceEvent__Output as _grpc_channelz_v1_ChannelTraceEvent__Output } from '../../../grpc/channelz/v1/ChannelTraceEvent';
import type { Long } from '@grpc/proto-loader';
/**
 * ChannelTrace represents the recent events that have occurred on the channel.
 */
export interface ChannelTrace {
    /**
     * Number of events ever logged in this tracing object. This can differ from
     * events.size() because events can be overwritten or garbage collected by
     * implementations.
     */
    'num_events_logged'?: (number | string | Long);
    /**
     * Time that this channel was created.
     */
    'creation_timestamp'?: (_google_protobuf_Timestamp | null);
    /**
     * List of events that have occurred on this channel.
     */
    'events'?: (_grpc_channelz_v1_ChannelTraceEvent)[];
}
/**
 * ChannelTrace represents the recent events that have occurred on the channel.
 */
export interface ChannelTrace__Output {
    /**
     * Number of events ever logged in this tracing object. This can differ from
     * events.size() because events can be overwritten or garbage collected by
     * implementations.
     */
    'num_events_logged': (string);
    /**
     * Time that this channel was created.
     */
    'creation_timestamp': (_google_protobuf_Timestamp__Output | null);
    /**
     * List of events that have occurred on this channel.
     */
    'events': (_grpc_channelz_v1_ChannelTraceEvent__Output)[];
}
