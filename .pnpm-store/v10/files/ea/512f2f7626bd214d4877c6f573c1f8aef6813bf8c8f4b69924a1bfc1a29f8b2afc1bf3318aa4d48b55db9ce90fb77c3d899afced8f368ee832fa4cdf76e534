/**
 * @module
 * Server-Timing Middleware for Hono.
 */
import type { Context } from '../../context';
import type { MiddlewareHandler } from '../../types';
import '../../context';
export type TimingVariables = {
    metric?: {
        headers: string[];
        timers: Map<string, Timer>;
    };
};
interface Timer {
    description?: string;
    start: number;
}
interface TimingOptions {
    total?: boolean;
    enabled?: boolean | ((c: Context) => boolean);
    totalDescription?: string;
    autoEnd?: boolean;
    crossOrigin?: boolean | string | ((c: Context) => boolean | string);
}
/**
 * Server-Timing Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/timing}
 *
 * @param {TimingOptions} [config] - The options for the timing middleware.
 * @param {boolean} [config.total=true] - Show the total response time.
 * @param {boolean | ((c: Context) => boolean)} [config.enabled=true] - Whether timings should be added to the headers or not.
 * @param {string} [config.totalDescription=Total Response Time] - Description for the total response time.
 * @param {boolean} [config.autoEnd=true] - If `startTime()` should end automatically at the end of the request.
 * @param {boolean | string | ((c: Context) => boolean | string)} [config.crossOrigin=false] - The origin this timings header should be readable.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * // add the middleware to your router
 * app.use(timing());
 *
 * app.get('/', async (c) => {
 *   // add custom metrics
 *   setMetric(c, 'region', 'europe-west3')
 *
 *   // add custom metrics with timing, must be in milliseconds
 *   setMetric(c, 'custom', 23.8, 'My custom Metric')
 *
 *   // start a new timer
 *   startTime(c, 'db');
 *
 *   const data = await db.findMany(...);
 *
 *   // end the timer
 *   endTime(c, 'db');
 *
 *   return c.json({ response: data });
 * });
 * ```
 */
export declare const timing: (config?: TimingOptions) => MiddlewareHandler;
interface SetMetric {
    (c: Context, name: string, value: number, description?: string, precision?: number): void;
    (c: Context, name: string, description?: string): void;
}
/**
 * Set a metric for the timing middleware.
 *
 * @param {Context} c - The context of the request.
 * @param {string} name - The name of the metric.
 * @param {number | string} [valueDescription] - The value or description of the metric.
 * @param {string} [description] - The description of the metric.
 * @param {number} [precision] - The precision of the metric value.
 *
 * @example
 * ```ts
 * setMetric(c, 'region', 'europe-west3')
 * setMetric(c, 'custom', 23.8, 'My custom Metric')
 * ```
 */
export declare const setMetric: SetMetric;
/**
 * Start a timer for the timing middleware.
 *
 * @param {Context} c - The context of the request.
 * @param {string} name - The name of the timer.
 * @param {string} [description] - The description of the timer.
 *
 * @example
 * ```ts
 * startTime(c, 'db')
 * ```
 */
export declare const startTime: (c: Context, name: string, description?: string) => void;
/**
 * End a timer for the timing middleware.
 *
 * @param {Context} c - The context of the request.
 * @param {string} name - The name of the timer.
 * @param {number} [precision] - The precision of the timer value.
 *
 * @example
 * ```ts
 * endTime(c, 'db')
 * ```
 */
export declare const endTime: (c: Context, name: string, precision?: number) => void;
/**
 * Wrap a Promise to capture its duration.
 * @param {Context} c - The context of the request.
 * @param {string} name - The name of the timer.
 * @param {Promise<T>} callable - The Promise to time.
 * @param {string} [description] - The description of the timer.
 * @param {number} [precision] - The precision of the timer value.
 *
 * @example
 * ```ts
 *   // Instead of this:
 *   const data = await db.findMany(...);
 *
 *   // do this:
 *   const data = await wrapTime(c, 'query', db.findMany(...));
 * ```
 * */
export declare function wrapTime<T>(c: Context, name: string, callable: Promise<T>, description?: string, precision?: number): Promise<T>;
export {};
