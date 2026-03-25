import type { SubchannelRef as _grpc_channelz_v1_SubchannelRef, SubchannelRef__Output as _grpc_channelz_v1_SubchannelRef__Output } from '../../../grpc/channelz/v1/SubchannelRef';
import type { ChannelData as _grpc_channelz_v1_ChannelData, ChannelData__Output as _grpc_channelz_v1_ChannelData__Output } from '../../../grpc/channelz/v1/ChannelData';
import type { ChannelRef as _grpc_channelz_v1_ChannelRef, ChannelRef__Output as _grpc_channelz_v1_ChannelRef__Output } from '../../../grpc/channelz/v1/ChannelRef';
import type { SocketRef as _grpc_channelz_v1_SocketRef, SocketRef__Output as _grpc_channelz_v1_SocketRef__Output } from '../../../grpc/channelz/v1/SocketRef';
/**
 * Subchannel is a logical grouping of channels, subchannels, and sockets.
 * A subchannel is load balanced over by it's ancestor
 */
export interface Subchannel {
    /**
     * The identifier for this channel.
     */
    'ref'?: (_grpc_channelz_v1_SubchannelRef | null);
    /**
     * Data specific to this channel.
     */
    'data'?: (_grpc_channelz_v1_ChannelData | null);
    /**
     * There are no ordering guarantees on the order of channel refs.
     * There may not be cycles in the ref graph.
     * A channel ref may be present in more than one channel or subchannel.
     */
    'channel_ref'?: (_grpc_channelz_v1_ChannelRef)[];
    /**
     * At most one of 'channel_ref+subchannel_ref' and 'socket' is set.
     * There are no ordering guarantees on the order of subchannel refs.
     * There may not be cycles in the ref graph.
     * A sub channel ref may be present in more than one channel or subchannel.
     */
    'subchannel_ref'?: (_grpc_channelz_v1_SubchannelRef)[];
    /**
     * There are no ordering guarantees on the order of sockets.
     */
    'socket_ref'?: (_grpc_channelz_v1_SocketRef)[];
}
/**
 * Subchannel is a logical grouping of channels, subchannels, and sockets.
 * A subchannel is load balanced over by it's ancestor
 */
export interface Subchannel__Output {
    /**
     * The identifier for this channel.
     */
    'ref': (_grpc_channelz_v1_SubchannelRef__Output | null);
    /**
     * Data specific to this channel.
     */
    'data': (_grpc_channelz_v1_ChannelData__Output | null);
    /**
     * There are no ordering guarantees on the order of channel refs.
     * There may not be cycles in the ref graph.
     * A channel ref may be present in more than one channel or subchannel.
     */
    'channel_ref': (_grpc_channelz_v1_ChannelRef__Output)[];
    /**
     * At most one of 'channel_ref+subchannel_ref' and 'socket' is set.
     * There are no ordering guarantees on the order of subchannel refs.
     * There may not be cycles in the ref graph.
     * A sub channel ref may be present in more than one channel or subchannel.
     */
    'subchannel_ref': (_grpc_channelz_v1_SubchannelRef__Output)[];
    /**
     * There are no ordering guarantees on the order of sockets.
     */
    'socket_ref': (_grpc_channelz_v1_SocketRef__Output)[];
}
