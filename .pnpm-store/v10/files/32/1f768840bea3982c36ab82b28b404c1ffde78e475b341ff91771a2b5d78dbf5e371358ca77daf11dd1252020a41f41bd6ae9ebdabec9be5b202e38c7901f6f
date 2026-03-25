import { IncomingMessage, ServerResponse } from 'node:http';
import { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import { FetchCallback, CustomErrorHandler } from './types.mjs';
import 'node:https';

declare const getRequestListener: (fetchCallback: FetchCallback, options?: {
    hostname?: string;
    errorHandler?: CustomErrorHandler;
    overrideGlobalObjects?: boolean;
    autoCleanupIncoming?: boolean;
}) => (incoming: IncomingMessage | Http2ServerRequest, outgoing: ServerResponse | Http2ServerResponse) => Promise<void>;

export { getRequestListener };
