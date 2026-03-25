import { RateLimits, TransportMakeRequestResponse } from '@sentry/core';
import { SendReplayData } from '../types';
/**
 * Send replay attachment using `fetch()`
 */
export declare function sendReplayRequest({ recordingData, replayId, segmentId: segment_id, eventContext, timestamp, session, }: SendReplayData): Promise<TransportMakeRequestResponse>;
/**
 * This error indicates that the transport returned an invalid status code.
 */
export declare class TransportStatusCodeError extends Error {
    constructor(statusCode: number);
}
/**
 * This error indicates that we hit a rate limit API error.
 */
export declare class RateLimitError extends Error {
    rateLimits: RateLimits;
    constructor(rateLimits: RateLimits);
}
//# sourceMappingURL=sendReplayRequest.d.ts.map
