import type { Middleware, ResponseGetter } from '../../index'
import { configs } from '../../../index'
import { assign } from '../../../utils/index'
import { Response } from '../../../response'
import type { Request } from '../../../request'

export interface RetryMiddlewareOptions {
  readonly headerRetryCount: string
  readonly headerRetryTime: string
  readonly maxRetryTimeInSecs: number
  readonly initialRetryTimeInSecs: number
  readonly factor: number
  readonly multiplier: number
  readonly retries: number
  validateRetry(response: Response): boolean
}

export const defaultRetryConfigs: RetryMiddlewareOptions = {
  headerRetryCount: 'X-Mappersmith-Retry-Count',
  headerRetryTime: 'X-Mappersmith-Retry-Time',
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2, // randomization factor
  multiplier: 2, // exponential factor
  retries: 5, // max retries
  validateRetry: (response: Response) => response.responseStatus >= 500, // a function that returns true if the request should be retried
}

type RetryMiddlewareType = Middleware<{
  enableRetry: boolean
  inboundRequest: Request
}>

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
export const RetryMiddleware = (
  customConfigs: Partial<RetryMiddlewareOptions> = {}
): RetryMiddlewareType =>
  function RetryMiddleware() {
    return {
      request(request) {
        this.enableRetry = request.method() === 'get'
        this.inboundRequest = request
        return request
      },

      response(next) {
        const retryConfigs = assign({}, defaultRetryConfigs, customConfigs)
        const inboundRequest = this.inboundRequest

        if (!this.enableRetry) {
          return next()
        }

        if (!configs.Promise) {
          return next()
        }

        if (!inboundRequest) {
          return next()
        }

        return new configs.Promise((resolve, reject) => {
          const retryTime = retryConfigs.initialRetryTimeInSecs * 1000
          retriableRequest(
            resolve,
            reject,
            next,
            inboundRequest
          )(randomFromRetryTime(retryTime, retryConfigs.factor), 0, retryConfigs)
        })
      },
    }
  }

export default RetryMiddleware

type RetryFn = (retryTime: number, retryCount: number, retryConfigs: RetryMiddlewareOptions) => void
type RetriableRequestFn = (
  resolve: (value: Response | PromiseLike<Response>) => void,
  reject: (reason?: unknown) => void,
  next: ResponseGetter,
  response: Request
) => RetryFn
const retriableRequest: RetriableRequestFn = (resolve, reject, next, request) => {
  const retry: RetryFn = (retryTime, retryCount, retryConfigs) => {
    const nextRetryTime = calculateExponentialRetryTime(retryTime, retryConfigs)
    const shouldRetry = retryCount < retryConfigs.retries
    const scheduleRequest = () => {
      setTimeout(() => retry(nextRetryTime, retryCount + 1, retryConfigs), retryTime)
    }

    next()
      .then((response) => {
        if (shouldRetry && retryConfigs.validateRetry(response)) {
          scheduleRequest()
        } else {
          try {
            resolve(
              enhancedResponse(
                response,
                retryConfigs.headerRetryCount,
                retryCount,
                retryConfigs.headerRetryTime,
                retryTime
              )
            )
          } catch (e) {
            let errorMessage = ''
            if (response instanceof Error) {
              errorMessage = response.message
            }
            if (typeof e === 'object' && e !== null && 'message' in e) {
              errorMessage = (e as Record<'message', string>).message
            }
            reject(new Response(request, 400, errorMessage, {}, [new Error(errorMessage)]))
          }
        }
      })
      .catch((response) => {
        if (shouldRetry && retryConfigs.validateRetry(response)) {
          scheduleRequest()
        } else {
          try {
            reject(
              enhancedResponse(
                response,
                retryConfigs.headerRetryCount,
                retryCount,
                retryConfigs.headerRetryTime,
                retryTime
              )
            )
          } catch (e) {
            let errorMessage = ''
            if (response instanceof Error) {
              errorMessage = response.message
            }
            if (typeof e === 'object' && e !== null && 'message' in e) {
              errorMessage = (e as Record<'message', string>).message
            }
            reject(new Response(request, 400, errorMessage, {}, [response]))
          }
        }
      })
  }

  return retry
}

/**
 * Increases the retry time for each attempt using a randomization function that grows exponentially.
 * The value is limited by `retryConfigs.maxRetryTimeInSecs`.
 * @param {Number} retryTime
 *
 * @return {Number}
 */
export const calculateExponentialRetryTime = (
  retryTime: number,
  retryConfigs: RetryMiddlewareOptions
) =>
  Math.min(
    randomFromRetryTime(retryTime, retryConfigs.factor) * retryConfigs.multiplier,
    retryConfigs.maxRetryTimeInSecs * 1000
  )

const randomFromRetryTime = (retryTime: number, factor: number) => {
  const delta = factor * retryTime
  return random(retryTime - delta, retryTime + delta)
}

const random = (min: number, max: number) => {
  return Math.random() * (max - min) + min
}

const enhancedResponse = (
  response: Response,
  headerRetryCount: string,
  retryCount: number,
  headerRetryTime: string,
  retryTime: number
) =>
  response.enhance({
    headers: {
      [headerRetryCount]: retryCount,
      [headerRetryTime]: retryTime,
    },
  })
