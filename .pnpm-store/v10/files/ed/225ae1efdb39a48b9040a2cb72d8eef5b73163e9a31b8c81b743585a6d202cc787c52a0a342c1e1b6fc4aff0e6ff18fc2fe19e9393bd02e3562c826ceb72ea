import type { Long } from '@grpc/proto-loader';
export interface GetTopChannelsRequest {
    /**
     * start_channel_id indicates that only channels at or above this id should be
     * included in the results.
     * To request the first page, this should be set to 0. To request
     * subsequent pages, the client generates this value by adding 1 to
     * the highest seen result ID.
     */
    'start_channel_id'?: (number | string | Long);
    /**
     * If non-zero, the server will return a page of results containing
     * at most this many items. If zero, the server will choose a
     * reasonable page size.  Must never be negative.
     */
    'max_results'?: (number | string | Long);
}
export interface GetTopChannelsRequest__Output {
    /**
     * start_channel_id indicates that only channels at or above this id should be
     * included in the results.
     * To request the first page, this should be set to 0. To request
     * subsequent pages, the client generates this value by adding 1 to
     * the highest seen result ID.
     */
    'start_channel_id': (string);
    /**
     * If non-zero, the server will return a page of results containing
     * at most this many items. If zero, the server will choose a
     * reasonable page size.  Must never be negative.
     */
    'max_results': (string);
}
