// Original file: proto/channelz.proto

import type { Channel as _grpc_channelz_v1_Channel, Channel__Output as _grpc_channelz_v1_Channel__Output } from '../../../grpc/channelz/v1/Channel';

export interface GetTopChannelsResponse {
  /**
   * list of channels that the connection detail service knows about.  Sorted in
   * ascending channel_id order.
   * Must contain at least 1 result, otherwise 'end' must be true.
   */
  'channel'?: (_grpc_channelz_v1_Channel)[];
  /**
   * If set, indicates that the list of channels is the final list.  Requesting
   * more channels can only return more if they are created after this RPC
   * completes.
   */
  'end'?: (boolean);
}

export interface GetTopChannelsResponse__Output {
  /**
   * list of channels that the connection detail service knows about.  Sorted in
   * ascending channel_id order.
   * Must contain at least 1 result, otherwise 'end' must be true.
   */
  'channel': (_grpc_channelz_v1_Channel__Output)[];
  /**
   * If set, indicates that the list of channels is the final list.  Requesting
   * more channels can only return more if they are created after this RPC
   * completes.
   */
  'end': (boolean);
}
