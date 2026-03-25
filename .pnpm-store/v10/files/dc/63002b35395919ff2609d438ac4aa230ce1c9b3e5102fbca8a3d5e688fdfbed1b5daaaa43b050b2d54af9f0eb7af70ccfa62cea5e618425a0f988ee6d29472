import type { Middleware } from './index';
export type Milliseconds = number;
/**
 * Automatically configure your requests with a default timeout
 *
 * Example:
 * In your manifest:
 * {
 *   middleware: [ TimeoutMiddleware(500) ]
 * }
 *
 * You can still override the default value:
 * client.User.all({ timeout: 100 })
 */
export declare const TimeoutMiddleware: (timeoutValue: Milliseconds) => Middleware;
export default TimeoutMiddleware;
