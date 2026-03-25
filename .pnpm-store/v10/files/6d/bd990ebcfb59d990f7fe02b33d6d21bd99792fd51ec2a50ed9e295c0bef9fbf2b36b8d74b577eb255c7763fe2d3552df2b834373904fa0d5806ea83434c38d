import type { Any as _google_protobuf_Any, Any__Output as _google_protobuf_Any__Output } from '../../../google/protobuf/Any';
/**
 * An address type not included above.
 */
export interface _grpc_channelz_v1_Address_OtherAddress {
    /**
     * The human readable version of the value.  This value should be set.
     */
    'name'?: (string);
    /**
     * The actual address message.
     */
    'value'?: (_google_protobuf_Any | null);
}
/**
 * An address type not included above.
 */
export interface _grpc_channelz_v1_Address_OtherAddress__Output {
    /**
     * The human readable version of the value.  This value should be set.
     */
    'name': (string);
    /**
     * The actual address message.
     */
    'value': (_google_protobuf_Any__Output | null);
}
export interface _grpc_channelz_v1_Address_TcpIpAddress {
    /**
     * Either the IPv4 or IPv6 address in bytes.  Will be either 4 bytes or 16
     * bytes in length.
     */
    'ip_address'?: (Buffer | Uint8Array | string);
    /**
     * 0-64k, or -1 if not appropriate.
     */
    'port'?: (number);
}
export interface _grpc_channelz_v1_Address_TcpIpAddress__Output {
    /**
     * Either the IPv4 or IPv6 address in bytes.  Will be either 4 bytes or 16
     * bytes in length.
     */
    'ip_address': (Buffer);
    /**
     * 0-64k, or -1 if not appropriate.
     */
    'port': (number);
}
/**
 * A Unix Domain Socket address.
 */
export interface _grpc_channelz_v1_Address_UdsAddress {
    'filename'?: (string);
}
/**
 * A Unix Domain Socket address.
 */
export interface _grpc_channelz_v1_Address_UdsAddress__Output {
    'filename': (string);
}
/**
 * Address represents the address used to create the socket.
 */
export interface Address {
    'tcpip_address'?: (_grpc_channelz_v1_Address_TcpIpAddress | null);
    'uds_address'?: (_grpc_channelz_v1_Address_UdsAddress | null);
    'other_address'?: (_grpc_channelz_v1_Address_OtherAddress | null);
    'address'?: "tcpip_address" | "uds_address" | "other_address";
}
/**
 * Address represents the address used to create the socket.
 */
export interface Address__Output {
    'tcpip_address'?: (_grpc_channelz_v1_Address_TcpIpAddress__Output | null);
    'uds_address'?: (_grpc_channelz_v1_Address_UdsAddress__Output | null);
    'other_address'?: (_grpc_channelz_v1_Address_OtherAddress__Output | null);
    'address'?: "tcpip_address" | "uds_address" | "other_address";
}
