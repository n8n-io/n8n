import type { IncomingMessage } from 'node:http';
import type { Scope } from '@sentry/core';
/**
 * This method patches the request object to capture the body.
 * Instead of actually consuming the streamed body ourselves, which has potential side effects,
 * we monkey patch `req.on('data')` to intercept the body chunks.
 * This way, we only read the body if the user also consumes the body, ensuring we do not change any behavior in unexpected ways.
 */
export declare function patchRequestToCaptureBody(req: IncomingMessage, isolationScope: Scope, maxIncomingRequestBodySize: 'small' | 'medium' | 'always', integrationName: string): void;
//# sourceMappingURL=captureRequestBody.d.ts.map