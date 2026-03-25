/**
 * @module
 * Combine Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
type Condition = (c: Context) => boolean;
/**
 * Create a composed middleware that runs the first middleware that returns true.
 *
 * @param middleware - An array of MiddlewareHandler or Condition functions.
 * Middleware is applied in the order it is passed, and if any middleware exits without returning
 * an exception first, subsequent middleware will not be executed.
 * You can also pass a condition function that returns a boolean value. If returns true
 * the evaluation will be halted, and rest of the middleware will not be executed.
 * @returns A composed middleware.
 *
 * @example
 * ```ts
 * import { some } from 'hono/combine'
 * import { bearerAuth } from 'hono/bearer-auth'
 * import { myRateLimit } from '@/rate-limit'
 *
 * // If client has a valid token, then skip rate limiting.
 * // Otherwise, apply rate limiting.
 * app.use('/api/*', some(
 *   bearerAuth({ token }),
 *   myRateLimit({ limit: 100 }),
 * ));
 * ```
 */
export declare const some: (...middleware: (MiddlewareHandler | Condition)[]) => MiddlewareHandler;
/**
 * Create a composed middleware that runs all middleware and throws an error if any of them fail.
 *
 * @param middleware - An array of MiddlewareHandler or Condition functions.
 * Middleware is applied in the order it is passed, and if any middleware throws an error,
 * subsequent middleware will not be executed.
 * You can also pass a condition function that returns a boolean value. If returns false
 * the evaluation will be halted, and rest of the middleware will not be executed.
 * @returns A composed middleware.
 *
 * @example
 * ```ts
 * import { some, every } from 'hono/combine'
 * import { bearerAuth } from 'hono/bearer-auth'
 * import { myCheckLocalNetwork } from '@/check-local-network'
 * import { myRateLimit } from '@/rate-limit'
 *
 * // If client is in local network, then skip authentication and rate limiting.
 * // Otherwise, apply authentication and rate limiting.
 * app.use('/api/*', some(
 *   myCheckLocalNetwork(),
 *   every(
 *     bearerAuth({ token }),
 *     myRateLimit({ limit: 100 }),
 *   ),
 * ));
 * ```
 */
export declare const every: (...middleware: (MiddlewareHandler | Condition)[]) => MiddlewareHandler;
/**
 * Create a composed middleware that runs all middleware except when the condition is met.
 *
 * @param condition - A string or Condition function.
 * If there are multiple targets to match any of them, they can be passed as an array.
 * If a string is passed, it will be treated as a path pattern to match.
 * If a Condition function is passed, it will be evaluated against the request context.
 * @param middleware - A composed middleware
 *
 * @example
 * ```ts
 * import { except } from 'hono/combine'
 * import { bearerAuth } from 'hono/bearer-auth
 *
 * // If client is accessing public API, then skip authentication.
 * // Otherwise, require a valid token.
 * app.use('/api/*', except(
 *   '/api/public/*',
 *   bearerAuth({ token }),
 * ));
 * ```
 */
export declare const except: (condition: string | Condition | (string | Condition)[], ...middleware: MiddlewareHandler[]) => MiddlewareHandler;
export {};
