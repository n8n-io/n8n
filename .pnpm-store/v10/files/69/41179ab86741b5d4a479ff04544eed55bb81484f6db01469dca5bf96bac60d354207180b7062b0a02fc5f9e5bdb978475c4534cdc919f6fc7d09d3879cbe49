// Original file: proto/channelz.proto

import type { Any as _google_protobuf_Any, Any__Output as _google_protobuf_Any__Output } from '../../../google/protobuf/Any';

export interface _grpc_channelz_v1_Security_OtherSecurity {
  /**
   * The human readable version of the value.
   */
  'name'?: (string);
  /**
   * The actual security details message.
   */
  'value'?: (_google_protobuf_Any | null);
}

export interface _grpc_channelz_v1_Security_OtherSecurity__Output {
  /**
   * The human readable version of the value.
   */
  'name': (string);
  /**
   * The actual security details message.
   */
  'value': (_google_protobuf_Any__Output | null);
}

export interface _grpc_channelz_v1_Security_Tls {
  /**
   * The cipher suite name in the RFC 4346 format:
   * https://tools.ietf.org/html/rfc4346#appendix-C
   */
  'standard_name'?: (string);
  /**
   * Some other way to describe the cipher suite if
   * the RFC 4346 name is not available.
   */
  'other_name'?: (string);
  /**
   * the certificate used by this endpoint.
   */
  'local_certificate'?: (Buffer | Uint8Array | string);
  /**
   * the certificate used by the remote endpoint.
   */
  'remote_certificate'?: (Buffer | Uint8Array | string);
  'cipher_suite'?: "standard_name"|"other_name";
}

export interface _grpc_channelz_v1_Security_Tls__Output {
  /**
   * The cipher suite name in the RFC 4346 format:
   * https://tools.ietf.org/html/rfc4346#appendix-C
   */
  'standard_name'?: (string);
  /**
   * Some other way to describe the cipher suite if
   * the RFC 4346 name is not available.
   */
  'other_name'?: (string);
  /**
   * the certificate used by this endpoint.
   */
  'local_certificate': (Buffer);
  /**
   * the certificate used by the remote endpoint.
   */
  'remote_certificate': (Buffer);
  'cipher_suite'?: "standard_name"|"other_name";
}

/**
 * Security represents details about how secure the socket is.
 */
export interface Security {
  'tls'?: (_grpc_channelz_v1_Security_Tls | null);
  'other'?: (_grpc_channelz_v1_Security_OtherSecurity | null);
  'model'?: "tls"|"other";
}

/**
 * Security represents details about how secure the socket is.
 */
export interface Security__Output {
  'tls'?: (_grpc_channelz_v1_Security_Tls__Output | null);
  'other'?: (_grpc_channelz_v1_Security_OtherSecurity__Output | null);
  'model'?: "tls"|"other";
}
