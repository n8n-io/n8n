import type * as grpc from '../index';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { ChannelzClient as _grpc_channelz_v1_ChannelzClient, ChannelzDefinition as _grpc_channelz_v1_ChannelzDefinition } from './grpc/channelz/v1/Channelz';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  google: {
    protobuf: {
      Any: MessageTypeDefinition
      BoolValue: MessageTypeDefinition
      BytesValue: MessageTypeDefinition
      DoubleValue: MessageTypeDefinition
      Duration: MessageTypeDefinition
      FloatValue: MessageTypeDefinition
      Int32Value: MessageTypeDefinition
      Int64Value: MessageTypeDefinition
      StringValue: MessageTypeDefinition
      Timestamp: MessageTypeDefinition
      UInt32Value: MessageTypeDefinition
      UInt64Value: MessageTypeDefinition
    }
  }
  grpc: {
    channelz: {
      v1: {
        Address: MessageTypeDefinition
        Channel: MessageTypeDefinition
        ChannelConnectivityState: MessageTypeDefinition
        ChannelData: MessageTypeDefinition
        ChannelRef: MessageTypeDefinition
        ChannelTrace: MessageTypeDefinition
        ChannelTraceEvent: MessageTypeDefinition
        /**
         * Channelz is a service exposed by gRPC servers that provides detailed debug
         * information.
         */
        Channelz: SubtypeConstructor<typeof grpc.Client, _grpc_channelz_v1_ChannelzClient> & { service: _grpc_channelz_v1_ChannelzDefinition }
        GetChannelRequest: MessageTypeDefinition
        GetChannelResponse: MessageTypeDefinition
        GetServerRequest: MessageTypeDefinition
        GetServerResponse: MessageTypeDefinition
        GetServerSocketsRequest: MessageTypeDefinition
        GetServerSocketsResponse: MessageTypeDefinition
        GetServersRequest: MessageTypeDefinition
        GetServersResponse: MessageTypeDefinition
        GetSocketRequest: MessageTypeDefinition
        GetSocketResponse: MessageTypeDefinition
        GetSubchannelRequest: MessageTypeDefinition
        GetSubchannelResponse: MessageTypeDefinition
        GetTopChannelsRequest: MessageTypeDefinition
        GetTopChannelsResponse: MessageTypeDefinition
        Security: MessageTypeDefinition
        Server: MessageTypeDefinition
        ServerData: MessageTypeDefinition
        ServerRef: MessageTypeDefinition
        Socket: MessageTypeDefinition
        SocketData: MessageTypeDefinition
        SocketOption: MessageTypeDefinition
        SocketOptionLinger: MessageTypeDefinition
        SocketOptionTcpInfo: MessageTypeDefinition
        SocketOptionTimeout: MessageTypeDefinition
        SocketRef: MessageTypeDefinition
        Subchannel: MessageTypeDefinition
        SubchannelRef: MessageTypeDefinition
      }
    }
  }
}

