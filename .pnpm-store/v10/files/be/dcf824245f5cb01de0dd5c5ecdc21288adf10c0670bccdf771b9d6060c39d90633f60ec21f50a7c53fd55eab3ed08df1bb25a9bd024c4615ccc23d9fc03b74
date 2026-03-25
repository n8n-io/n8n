import type * as http from 'node:http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
export declare const instrumentExpress: ((options?: unknown) => ExpressInstrumentation) & {
    id: string;
};
/**
 * Adds Sentry tracing instrumentation for [Express](https://expressjs.com/).
 *
 * If you also want to capture errors, you need to call `setupExpressErrorHandler(app)` after you set up your Express server.
 *
 * For more information, see the [express documentation](https://docs.sentry.io/platforms/javascript/guides/express/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *   integrations: [Sentry.expressIntegration()],
 * })
 * ```
 */
export declare const expressIntegration: () => import("@sentry/core").Integration;
interface MiddlewareError extends Error {
    status?: number | string;
    statusCode?: number | string;
    status_code?: number | string;
    output?: {
        statusCode?: number | string;
    };
}
type ExpressMiddleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void;
type ExpressErrorMiddleware = (error: MiddlewareError, req: http.IncomingMessage, res: http.ServerResponse, next: (error: MiddlewareError) => void) => void;
interface ExpressHandlerOptions {
    /**
     * Callback method deciding whether error should be captured and sent to Sentry
     * @param error Captured middleware error
     */
    shouldHandleError?(this: void, error: MiddlewareError): boolean;
}
/**
 * An Express-compatible error handler.
 */
export declare function expressErrorHandler(options?: ExpressHandlerOptions): ExpressErrorMiddleware;
/**
 * Add an Express error handler to capture errors to Sentry.
 *
 * The error handler must be before any other middleware and after all controllers.
 *
 * @param app The Express instances
 * @param options {ExpressHandlerOptions} Configuration options for the handler
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 * const express = require("express");
 *
 * const app = express();
 *
 * // Add your routes, etc.
 *
 * // Add this after all routes,
 * // but before any and other error-handling middlewares are defined
 * Sentry.setupExpressErrorHandler(app);
 *
 * app.listen(3000);
 * ```
 */
export declare function setupExpressErrorHandler(app: {
    use: (middleware: ExpressMiddleware | ExpressErrorMiddleware) => unknown;
}, options?: ExpressHandlerOptions): void;
export {};
//# sourceMappingURL=express.d.ts.map