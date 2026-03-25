// Original file: proto/channelz.proto

import type { Long } from '@grpc/proto-loader';

export interface GetServerSocketsRequest {
  'server_id'?: (number | string | Long);
  /**
   * start_socket_id indicates that only sockets at or above this id should be
   * included in the results.
   * To request the first page, this must be set to 0. To request
   * subsequent pages, the client generates this value by adding 1 to
   * the highest seen result ID.
   */
  'start_socket_id'?: (number | string | Long);
  /**
   * If non-zero, the server will return a page of results containing
   * at most this many items. If zero, the server will choose a
   * reasonable page size.  Must never be negative.
   */
  'max_results'?: (number | string | Long);
}

export interface GetServerSocketsRequest__Output {
  'server_id': (string);
  /**
   * start_socket_id indicates that only sockets at or above this id should be
   * included in the results.
   * To request the first page, this must be set to 0. To request
   * subsequent pages, the client generates this value by adding 1 to
   * the highest seen result ID.
   */
  'start_socket_id': (string);
  /**
   * If non-zero, the server will return a page of results containing
   * at most this many items. If zero, the server will choose a
   * reasonable page size.  Must never be negative.
   */
  'max_results': (string);
}
