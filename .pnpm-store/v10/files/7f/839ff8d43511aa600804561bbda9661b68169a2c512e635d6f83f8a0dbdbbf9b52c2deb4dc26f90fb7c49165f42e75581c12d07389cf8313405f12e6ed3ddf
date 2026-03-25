import { LRUMap } from '@sentry/core';
import { ClientRequest, IncomingMessage, RequestOptions } from 'http';
/** Add a breadcrumb for outgoing requests. */
export declare function addRequestBreadcrumb(request: ClientRequest, response: IncomingMessage | undefined): void;
/**
 * Add trace propagation headers to an outgoing request.
 * This must be called _before_ the request is sent!
 */
export declare function addTracePropagationHeadersToOutgoingRequest(request: ClientRequest, propagationDecisionMap: LRUMap<string, boolean>): void;
/** Convert an outgoing request to request options. */
export declare function getRequestOptions(request: ClientRequest): RequestOptions;
//# sourceMappingURL=outgoing-requests.d.ts.map
