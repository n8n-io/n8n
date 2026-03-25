// Copyright 2018 The gRPC Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This file defines an interface for exporting monitoring information
// out of gRPC servers.  See the full design at
// https://github.com/grpc/proposal/blob/master/A14-channelz.md
//
// The canonical version of this proto can be found at
// https://github.com/grpc/grpc-proto/blob/master/grpc/channelz/v1/channelz.proto

syntax = "proto3";

package grpc.channelz.v1;

import "google/protobuf/any.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/wrappers.proto";

option go_package = "google.golang.org/grpc/channelz/grpc_channelz_v1";
option java_multiple_files = true;
option java_package = "io.grpc.channelz.v1";
option java_outer_classname = "ChannelzProto";

// Channel is a logical grouping of channels, subchannels, and sockets.
message Channel {
  // The identifier for this channel. This should bet set.
  ChannelRef ref = 1;
  // Data specific to this channel.
  ChannelData data = 2;
  // At most one of 'channel_ref+subchannel_ref' and 'socket' is set.

  // There are no ordering guarantees on the order of channel refs.
  // There may not be cycles in the ref graph.
  // A channel ref may be present in more than one channel or subchannel.
  repeated ChannelRef channel_ref = 3;

  // At most one of 'channel_ref+subchannel_ref' and 'socket' is set.
  // There are no ordering guarantees on the order of subchannel refs.
  // There may not be cycles in the ref graph.
  // A sub channel ref may be present in more than one channel or subchannel.
  repeated SubchannelRef subchannel_ref = 4;

  // There are no ordering guarantees on the order of sockets.
  repeated SocketRef socket_ref = 5;
}

// Subchannel is a logical grouping of channels, subchannels, and sockets.
// A subchannel is load balanced over by it's ancestor
message Subchannel {
  // The identifier for this channel.
  SubchannelRef ref = 1;
  // Data specific to this channel.
  ChannelData data = 2;
  // At most one of 'channel_ref+subchannel_ref' and 'socket' is set.

  // There are no ordering guarantees on the order of channel refs.
  // There may not be cycles in the ref graph.
  // A channel ref may be present in more than one channel or subchannel.
  repeated ChannelRef channel_ref = 3;

  // At most one of 'channel_ref+subchannel_ref' and 'socket' is set.
  // There are no ordering guarantees on the order of subchannel refs.
  // There may not be cycles in the ref graph.
  // A sub channel ref may be present in more than one channel or subchannel.
  repeated SubchannelRef subchannel_ref = 4;

  // There are no ordering guarantees on the order of sockets.
  repeated SocketRef socket_ref = 5;
}

// These come from the specified states in this document:
// https://github.com/grpc/grpc/blob/master/doc/connectivity-semantics-and-api.md
message ChannelConnectivityState {
  enum State {
    UNKNOWN = 0;
    IDLE = 1;
    CONNECTING = 2;
    READY = 3;
    TRANSIENT_FAILURE = 4;
    SHUTDOWN = 5;
  }
  State state = 1;
}

// Channel data is data related to a specific Channel or Subchannel.
message ChannelData {
  // The connectivity state of the channel or subchannel.  Implementations
  // should always set this.
  ChannelConnectivityState state = 1;

  // The target this channel originally tried to connect to.  May be absent
  string target = 2;

  // A trace of recent events on the channel.  May be absent.
  ChannelTrace trace = 3;

  // The number of calls started on the channel
  int64 calls_started = 4;
  // The number of calls that have completed with an OK status
  int64 calls_succeeded = 5;
  // The number of calls that have completed with a non-OK status
  int64 calls_failed = 6;

  // The last time a call was started on the channel.
  google.protobuf.Timestamp last_call_started_timestamp = 7;
}

// A trace event is an interesting thing that happened to a channel or
// subchannel, such as creation, address resolution, subchannel creation, etc.
message ChannelTraceEvent {
  // High level description of the event.
  string description = 1;
  // The supported severity levels of trace events.
  enum Severity {
    CT_UNKNOWN = 0;
    CT_INFO = 1;
    CT_WARNING = 2;
    CT_ERROR = 3;
  }
  // the severity of the trace event
  Severity severity = 2;
  // When this event occurred.
  google.protobuf.Timestamp timestamp = 3;
  // ref of referenced channel or subchannel.
  // Optional, only present if this event refers to a child object. For example,
  // this field would be filled if this trace event was for a subchannel being
  // created.
  oneof child_ref {
    ChannelRef channel_ref = 4;
    SubchannelRef subchannel_ref = 5;
  }
}

// ChannelTrace represents the recent events that have occurred on the channel.
message ChannelTrace {
  // Number of events ever logged in this tracing object. This can differ from
  // events.size() because events can be overwritten or garbage collected by
  // implementations.
  int64 num_events_logged = 1;
  // Time that this channel was created.
  google.protobuf.Timestamp creation_timestamp = 2;
  // List of events that have occurred on this channel.
  repeated ChannelTraceEvent events = 3;
}

// ChannelRef is a reference to a Channel.
message ChannelRef {
  // The globally unique id for this channel.  Must be a positive number.
  int64 channel_id = 1;
  // An optional name associated with the channel.
  string name = 2;
  // Intentionally don't use field numbers from other refs.
  reserved 3, 4, 5, 6, 7, 8;
}

// SubchannelRef is a reference to a Subchannel.
message SubchannelRef {
  // The globally unique id for this subchannel.  Must be a positive number.
  int64 subchannel_id = 7;
  // An optional name associated with the subchannel.
  string name = 8;
  // Intentionally don't use field numbers from other refs.
  reserved 1, 2, 3, 4, 5, 6;
}

// SocketRef is a reference to a Socket.
message SocketRef {
  // The globally unique id for this socket.  Must be a positive number.
  int64 socket_id = 3;
  // An optional name associated with the socket.
  string name = 4;
  // Intentionally don't use field numbers from other refs.
  reserved 1, 2, 5, 6, 7, 8;
}

// ServerRef is a reference to a Server.
message ServerRef {
  // A globally unique identifier for this server.  Must be a positive number.
  int64 server_id = 5;
  // An optional name associated with the server.
  string name = 6;
  // Intentionally don't use field numbers from other refs.
  reserved 1, 2, 3, 4, 7, 8;
}

// Server represents a single server.  There may be multiple servers in a single
// program.
message Server {
  // The identifier for a Server.  This should be set.
  ServerRef ref = 1;
  // The associated data of the Server.
  ServerData data = 2;

  // The sockets that the server is listening on.  There are no ordering
  // guarantees.  This may be absent.
  repeated SocketRef listen_socket = 3;
}

// ServerData is data for a specific Server.
message ServerData {
  // A trace of recent events on the server.  May be absent.
  ChannelTrace trace = 1;

  // The number of incoming calls started on the server
  int64 calls_started = 2;
  // The number of incoming calls that have completed with an OK status
  int64 calls_succeeded = 3;
  // The number of incoming calls that have a completed with a non-OK status
  int64 calls_failed = 4;

  // The last time a call was started on the server.
  google.protobuf.Timestamp last_call_started_timestamp = 5;
}

// Information about an actual connection.  Pronounced "sock-ay".
message Socket {
  // The identifier for the Socket.
  SocketRef ref = 1;

  // Data specific to this Socket.
  SocketData data = 2;
  // The locally bound address.
  Address local = 3;
  // The remote bound address.  May be absent.
  Address remote = 4;
  // Security details for this socket.  May be absent if not available, or
  // there is no security on the socket.
  Security security = 5;

  // Optional, represents the name of the remote endpoint, if different than
  // the original target name.
  string remote_name = 6;
}

// SocketData is data associated for a specific Socket.  The fields present
// are specific to the implementation, so there may be minor differences in
// the semantics.  (e.g. flow control windows)
message SocketData {
  // The number of streams that have been started.
  int64 streams_started = 1;
  // The number of streams that have ended successfully:
  // On client side, received frame with eos bit set;
  // On server side, sent frame with eos bit set.
  int64 streams_succeeded = 2;
  // The number of streams that have ended unsuccessfully:
  // On client side, ended without receiving frame with eos bit set;
  // On server side, ended without sending frame with eos bit set.
  int64 streams_failed = 3;
  // The number of grpc messages successfully sent on this socket.
  int64 messages_sent = 4;
  // The number of grpc messages received on this socket.
  int64 messages_received = 5;

  // The number of keep alives sent.  This is typically implemented with HTTP/2
  // ping messages.
  int64 keep_alives_sent = 6;

  // The last time a stream was created by this endpoint.  Usually unset for
  // servers.
  google.protobuf.Timestamp last_local_stream_created_timestamp = 7;
  // The last time a stream was created by the remote endpoint.  Usually unset
  // for clients.
  google.protobuf.Timestamp last_remote_stream_created_timestamp = 8;

  // The last time a message was sent by this endpoint.
  google.protobuf.Timestamp last_message_sent_timestamp = 9;
  // The last time a message was received by this endpoint.
  google.protobuf.Timestamp last_message_received_timestamp = 10;

  // The amount of window, granted to the local endpoint by the remote endpoint.
  // This may be slightly out of date due to network latency.  This does NOT
  // include stream level or TCP level flow control info.
  google.protobuf.Int64Value local_flow_control_window = 11;

  // The amount of window, granted to the remote endpoint by the local endpoint.
  // This may be slightly out of date due to network latency.  This does NOT
  // include stream level or TCP level flow control info.
  google.protobuf.Int64Value  remote_flow_control_window = 12;

  // Socket options set on this socket.  May be absent if 'summary' is set
  // on GetSocketRequest.
  repeated SocketOption option = 13;
}

// Address represents the address used to create the socket.
message Address {
  message TcpIpAddress {
    // Either the IPv4 or IPv6 address in bytes.  Will be either 4 bytes or 16
    // bytes in length.
    bytes ip_address = 1;
    // 0-64k, or -1 if not appropriate.
    int32 port = 2;
  }
  // A Unix Domain Socket address.
  message UdsAddress {
    string filename = 1;
  }
  // An address type not included above.
  message OtherAddress {
    // The human readable version of the value.  This value should be set.
    string name = 1;
    // The actual address message.
    google.protobuf.Any value = 2;
  }

  oneof address {
    TcpIpAddress tcpip_address = 1;
    UdsAddress uds_address = 2;
    OtherAddress other_address = 3;
  }
}

// Security represents details about how secure the socket is.
message Security {
  message Tls {
    oneof cipher_suite {
      // The cipher suite name in the RFC 4346 format:
      // https://tools.ietf.org/html/rfc4346#appendix-C
      string standard_name = 1;
      // Some other way to describe the cipher suite if
      // the RFC 4346 name is not available.
      string other_name = 2;
    }
    // the certificate used by this endpoint.
    bytes local_certificate = 3;
    // the certificate used by the remote endpoint.
    bytes remote_certificate = 4;
  }
  message OtherSecurity {
    // The human readable version of the value.
    string name = 1;
    // The actual security details message.
    google.protobuf.Any value = 2;
  }
  oneof model {
    Tls tls = 1;
    OtherSecurity other = 2;
  }
}

// SocketOption represents socket options for a socket.  Specifically, these
// are the options returned by getsockopt().
message SocketOption {
  // The full name of the socket option.  Typically this will be the upper case
  // name, such as "SO_REUSEPORT".
  string name = 1;
  // The human readable value of this socket option.  At least one of value or
  // additional will be set.
  string value = 2;
  // Additional data associated with the socket option.  At least one of value
  // or additional will be set.
  google.protobuf.Any additional = 3;
}

// For use with SocketOption's additional field.  This is primarily used for
// SO_RCVTIMEO and SO_SNDTIMEO
message SocketOptionTimeout {
  google.protobuf.Duration duration = 1;
}

// For use with SocketOption's additional field.  This is primarily used for
// SO_LINGER.
message SocketOptionLinger {
  // active maps to `struct linger.l_onoff`
  bool active = 1;
  // duration maps to `struct linger.l_linger`
  google.protobuf.Duration duration = 2;
}

// For use with SocketOption's additional field.  Tcp info for
// SOL_TCP and TCP_INFO.
message SocketOptionTcpInfo {
  uint32 tcpi_state = 1;

  uint32 tcpi_ca_state = 2;
  uint32 tcpi_retransmits = 3;
  uint32 tcpi_probes = 4;
  uint32 tcpi_backoff = 5;
  uint32 tcpi_options = 6;
  uint32 tcpi_snd_wscale = 7;
  uint32 tcpi_rcv_wscale = 8;

  uint32 tcpi_rto = 9;
  uint32 tcpi_ato = 10;
  uint32 tcpi_snd_mss = 11;
  uint32 tcpi_rcv_mss = 12;

  uint32 tcpi_unacked = 13;
  uint32 tcpi_sacked = 14;
  uint32 tcpi_lost = 15;
  uint32 tcpi_retrans = 16;
  uint32 tcpi_fackets = 17;

  uint32 tcpi_last_data_sent = 18;
  uint32 tcpi_last_ack_sent = 19;
  uint32 tcpi_last_data_recv = 20;
  uint32 tcpi_last_ack_recv = 21;

  uint32 tcpi_pmtu = 22;
  uint32 tcpi_rcv_ssthresh = 23;
  uint32 tcpi_rtt = 24;
  uint32 tcpi_rttvar = 25;
  uint32 tcpi_snd_ssthresh = 26;
  uint32 tcpi_snd_cwnd = 27;
  uint32 tcpi_advmss = 28;
  uint32 tcpi_reordering = 29;
}

// Channelz is a service exposed by gRPC servers that provides detailed debug
// information.
service Channelz {
  // Gets all root channels (i.e. channels the application has directly
  // created). This does not include subchannels nor non-top level channels.
  rpc GetTopChannels(GetTopChannelsRequest) returns (GetTopChannelsResponse);
  // Gets all servers that exist in the process.
  rpc GetServers(GetServersRequest) returns (GetServersResponse);
  // Returns a single Server, or else a NOT_FOUND code.
  rpc GetServer(GetServerRequest) returns (GetServerResponse);
  // Gets all server sockets that exist in the process.
  rpc GetServerSockets(GetServerSocketsRequest) returns (GetServerSocketsResponse);
  // Returns a single Channel, or else a NOT_FOUND code.
  rpc GetChannel(GetChannelRequest) returns (GetChannelResponse);
  // Returns a single Subchannel, or else a NOT_FOUND code.
  rpc GetSubchannel(GetSubchannelRequest) returns (GetSubchannelResponse);
  // Returns a single Socket or else a NOT_FOUND code.
  rpc GetSocket(GetSocketRequest) returns (GetSocketResponse);
}

message GetTopChannelsRequest {
  // start_channel_id indicates that only channels at or above this id should be
  // included in the results.
  // To request the first page, this should be set to 0. To request
  // subsequent pages, the client generates this value by adding 1 to
  // the highest seen result ID.
  int64 start_channel_id = 1;

  // If non-zero, the server will return a page of results containing
  // at most this many items. If zero, the server will choose a
  // reasonable page size.  Must never be negative.
  int64 max_results = 2;
}

message GetTopChannelsResponse {
  // list of channels that the connection detail service knows about.  Sorted in
  // ascending channel_id order.
  // Must contain at least 1 result, otherwise 'end' must be true.
  repeated Channel channel = 1;
  // If set, indicates that the list of channels is the final list.  Requesting
  // more channels can only return more if they are created after this RPC
  // completes.
  bool end = 2;
}

message GetServersRequest {
  // start_server_id indicates that only servers at or above this id should be
  // included in the results.
  // To request the first page, this must be set to 0. To request
  // subsequent pages, the client generates this value by adding 1 to
  // the highest seen result ID.
  int64 start_server_id = 1;

  // If non-zero, the server will return a page of results containing
  // at most this many items. If zero, the server will choose a
  // reasonable page size.  Must never be negative.
  int64 max_results = 2;
}

message GetServersResponse {
  // list of servers that the connection detail service knows about.  Sorted in
  // ascending server_id order.
  // Must contain at least 1 result, otherwise 'end' must be true.
  repeated Server server = 1;
  // If set, indicates that the list of servers is the final list.  Requesting
  // more servers will only return more if they are created after this RPC
  // completes.
  bool end = 2;
}

message GetServerRequest {
  // server_id is the identifier of the specific server to get.
  int64 server_id = 1;
}

message GetServerResponse {
  // The Server that corresponds to the requested server_id.  This field
  // should be set.
  Server server = 1;
}

message GetServerSocketsRequest {
  int64 server_id = 1;
  // start_socket_id indicates that only sockets at or above this id should be
  // included in the results.
  // To request the first page, this must be set to 0. To request
  // subsequent pages, the client generates this value by adding 1 to
  // the highest seen result ID.
  int64 start_socket_id = 2;

  // If non-zero, the server will return a page of results containing
  // at most this many items. If zero, the server will choose a
  // reasonable page size.  Must never be negative.
  int64 max_results = 3;
}

message GetServerSocketsResponse {
  // list of socket refs that the connection detail service knows about.  Sorted in
  // ascending socket_id order.
  // Must contain at least 1 result, otherwise 'end' must be true.
  repeated SocketRef socket_ref = 1;
  // If set, indicates that the list of sockets is the final list.  Requesting
  // more sockets will only return more if they are created after this RPC
  // completes.
  bool end = 2;
}

message GetChannelRequest {
  // channel_id is the identifier of the specific channel to get.
  int64 channel_id = 1;
}

message GetChannelResponse {
  // The Channel that corresponds to the requested channel_id.  This field
  // should be set.
  Channel channel = 1;
}

message GetSubchannelRequest {
  // subchannel_id is the identifier of the specific subchannel to get.
  int64 subchannel_id = 1;
}

message GetSubchannelResponse {
  // The Subchannel that corresponds to the requested subchannel_id.  This
  // field should be set.
  Subchannel subchannel = 1;
}

message GetSocketRequest {
  // socket_id is the identifier of the specific socket to get.
  int64 socket_id = 1;

  // If true, the response will contain only high level information
  // that is inexpensive to obtain. Fields thay may be omitted are
  // documented.
  bool summary = 2;
}

message GetSocketResponse {
  // The Socket that corresponds to the requested socket_id.  This field
  // should be set.
  Socket socket = 1;
}