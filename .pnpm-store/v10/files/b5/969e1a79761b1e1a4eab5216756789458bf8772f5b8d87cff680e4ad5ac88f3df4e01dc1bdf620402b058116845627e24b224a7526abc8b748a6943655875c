// Original file: proto/channelz.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../google/protobuf/Timestamp';
import type { Int64Value as _google_protobuf_Int64Value, Int64Value__Output as _google_protobuf_Int64Value__Output } from '../../../google/protobuf/Int64Value';
import type { SocketOption as _grpc_channelz_v1_SocketOption, SocketOption__Output as _grpc_channelz_v1_SocketOption__Output } from '../../../grpc/channelz/v1/SocketOption';
import type { Long } from '@grpc/proto-loader';

/**
 * SocketData is data associated for a specific Socket.  The fields present
 * are specific to the implementation, so there may be minor differences in
 * the semantics.  (e.g. flow control windows)
 */
export interface SocketData {
  /**
   * The number of streams that have been started.
   */
  'streams_started'?: (number | string | Long);
  /**
   * The number of streams that have ended successfully:
   * On client side, received frame with eos bit set;
   * On server side, sent frame with eos bit set.
   */
  'streams_succeeded'?: (number | string | Long);
  /**
   * The number of streams that have ended unsuccessfully:
   * On client side, ended without receiving frame with eos bit set;
   * On server side, ended without sending frame with eos bit set.
   */
  'streams_failed'?: (number | string | Long);
  /**
   * The number of grpc messages successfully sent on this socket.
   */
  'messages_sent'?: (number | string | Long);
  /**
   * The number of grpc messages received on this socket.
   */
  'messages_received'?: (number | string | Long);
  /**
   * The number of keep alives sent.  This is typically implemented with HTTP/2
   * ping messages.
   */
  'keep_alives_sent'?: (number | string | Long);
  /**
   * The last time a stream was created by this endpoint.  Usually unset for
   * servers.
   */
  'last_local_stream_created_timestamp'?: (_google_protobuf_Timestamp | null);
  /**
   * The last time a stream was created by the remote endpoint.  Usually unset
   * for clients.
   */
  'last_remote_stream_created_timestamp'?: (_google_protobuf_Timestamp | null);
  /**
   * The last time a message was sent by this endpoint.
   */
  'last_message_sent_timestamp'?: (_google_protobuf_Timestamp | null);
  /**
   * The last time a message was received by this endpoint.
   */
  'last_message_received_timestamp'?: (_google_protobuf_Timestamp | null);
  /**
   * The amount of window, granted to the local endpoint by the remote endpoint.
   * This may be slightly out of date due to network latency.  This does NOT
   * include stream level or TCP level flow control info.
   */
  'local_flow_control_window'?: (_google_protobuf_Int64Value | null);
  /**
   * The amount of window, granted to the remote endpoint by the local endpoint.
   * This may be slightly out of date due to network latency.  This does NOT
   * include stream level or TCP level flow control info.
   */
  'remote_flow_control_window'?: (_google_protobuf_Int64Value | null);
  /**
   * Socket options set on this socket.  May be absent if 'summary' is set
   * on GetSocketRequest.
   */
  'option'?: (_grpc_channelz_v1_SocketOption)[];
}

/**
 * SocketData is data associated for a specific Socket.  The fields present
 * are specific to the implementation, so there may be minor differences in
 * the semantics.  (e.g. flow control windows)
 */
export interface SocketData__Output {
  /**
   * The number of streams that have been started.
   */
  'streams_started': (string);
  /**
   * The number of streams that have ended successfully:
   * On client side, received frame with eos bit set;
   * On server side, sent frame with eos bit set.
   */
  'streams_succeeded': (string);
  /**
   * The number of streams that have ended unsuccessfully:
   * On client side, ended without receiving frame with eos bit set;
   * On server side, ended without sending frame with eos bit set.
   */
  'streams_failed': (string);
  /**
   * The number of grpc messages successfully sent on this socket.
   */
  'messages_sent': (string);
  /**
   * The number of grpc messages received on this socket.
   */
  'messages_received': (string);
  /**
   * The number of keep alives sent.  This is typically implemented with HTTP/2
   * ping messages.
   */
  'keep_alives_sent': (string);
  /**
   * The last time a stream was created by this endpoint.  Usually unset for
   * servers.
   */
  'last_local_stream_created_timestamp': (_google_protobuf_Timestamp__Output | null);
  /**
   * The last time a stream was created by the remote endpoint.  Usually unset
   * for clients.
   */
  'last_remote_stream_created_timestamp': (_google_protobuf_Timestamp__Output | null);
  /**
   * The last time a message was sent by this endpoint.
   */
  'last_message_sent_timestamp': (_google_protobuf_Timestamp__Output | null);
  /**
   * The last time a message was received by this endpoint.
   */
  'last_message_received_timestamp': (_google_protobuf_Timestamp__Output | null);
  /**
   * The amount of window, granted to the local endpoint by the remote endpoint.
   * This may be slightly out of date due to network latency.  This does NOT
   * include stream level or TCP level flow control info.
   */
  'local_flow_control_window': (_google_protobuf_Int64Value__Output | null);
  /**
   * The amount of window, granted to the remote endpoint by the local endpoint.
   * This may be slightly out of date due to network latency.  This does NOT
   * include stream level or TCP level flow control info.
   */
  'remote_flow_control_window': (_google_protobuf_Int64Value__Output | null);
  /**
   * Socket options set on this socket.  May be absent if 'summary' is set
   * on GetSocketRequest.
   */
  'option': (_grpc_channelz_v1_SocketOption__Output)[];
}
