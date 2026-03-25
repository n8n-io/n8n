import type { Context } from './context';
import type { Env, ErrorHandler, Next, NotFoundHandler } from './types';
/**
 * Compose middleware functions into a single function based on `koa-compose` package.
 *
 * @template E - The environment type.
 *
 * @param {[[Function, unknown], unknown][] | [[Function]][]} middleware - An array of middleware functions and their corresponding parameters.
 * @param {ErrorHandler<E>} [onError] - An optional error handler function.
 * @param {NotFoundHandler<E>} [onNotFound] - An optional not-found handler function.
 *
 * @returns {(context: Context, next?: Next) => Promise<Context>} - A composed middleware function.
 */
export declare const compose: <E extends Env = Env>(middleware: [[Function, unknown], unknown][] | [[Function]][], onError?: ErrorHandler<E>, onNotFound?: NotFoundHandler<E>) => ((context: Context, next?: Next) => Promise<Context>);
