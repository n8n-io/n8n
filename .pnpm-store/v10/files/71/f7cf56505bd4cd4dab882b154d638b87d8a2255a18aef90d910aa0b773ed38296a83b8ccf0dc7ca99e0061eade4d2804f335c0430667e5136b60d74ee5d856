import type { Middleware } from '../../index';
import { Response } from '../../../response';
import type { Request } from '../../../request';
export interface RetryMiddlewareOptions {
    readonly headerRetryCount: string;
    readonly headerRetryTime: string;
    readonly maxRetryTimeInSecs: number;
    readonly initialRetryTimeInSecs: number;
    readonly factor: number;
    readonly multiplier: number;
    readonly retries: number;
    validateRetry(response: Response): boolean;
}
export declare const defaultRetryConfigs: RetryMiddlewareOptions;
type RetryMiddlewareType = Middleware<{
    enableRetry: boolean;
    inboundRequest: Request;
}>;
/**
 * This middleware will automatically retry GET requests up to the configured amount of
 * retries using a randomization function that grows exponentially. The retry count and
 * the time used will be included as a header in the response.
 *
 * The retry time is calculated using the following formula:
 *   retryTime = min(
 *     random(previousRetryTime - randomizedFactor, previousRetryTime + randomizedFactor) * multipler,
 *     maxRetryTime
 *   )
 *
 * Take a look at `calculateExponentialRetryTime` for more information.
 *
 *  @param {Object} retryConfigs
 *   @param {String} retryConfigs.headerRetryCount (default: 'X-Mappersmith-Retry-Count')
 *   @param {String} retryConfigs.headerRetryTime (default: 'X-Mappersmith-Retry-Time')
 *   @param {Number} retryConfigs.maxRetryTimeInSecs (default: 5)
 *   @param {Number} retryConfigs.initialRetryTimeInSecs (default: 1)
 *   @param {Number} retryConfigs.factor (default: 0.2) - randomization factor
 *   @param {Number} retryConfigs.multiplier (default: 2) - exponential factor
 *   @param {Number} retryConfigs.retries (default: 5) - max retries
 */
export declare const RetryMiddleware: (customConfigs?: Partial<RetryMiddlewareOptions>) => RetryMiddlewareType;
export default RetryMiddleware;
/**
 * Increases the retry time for each attempt using a randomization function that grows exponentially.
 * The value is limited by `retryConfigs.maxRetryTimeInSecs`.
 * @param {Number} retryTime
 *
 * @return {Number}
 */
export declare const calculateExponentialRetryTime: (retryTime: number, retryConfigs: RetryMiddlewareOptions) => number;
