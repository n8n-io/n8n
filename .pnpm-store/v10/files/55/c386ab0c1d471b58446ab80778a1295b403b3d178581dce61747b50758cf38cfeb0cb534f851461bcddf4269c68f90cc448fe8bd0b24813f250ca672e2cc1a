import { assign } from '../../../utils'
import RetryMiddlewareV2, { defaultRetryConfigs } from '../v2'

let retryConfigs = assign({}, defaultRetryConfigs)

/**
 * @deprecated The use of setRetryConfigs is deprecated as it sets a global config
    which may cause troubles if you need multiple different configurations.
    Use middleware/retry/v2 instead which supports passing in a configuration object.
 *
 * @param {Object} newConfigs
 *   @param {String} newConfigs.headerRetryCount (default: 'X-Mappersmith-Retry-Count')
 *   @param {String} newConfigs.headerRetryTime (default: 'X-Mappersmith-Retry-Time')
 *   @param {Number} newConfigs.maxRetryTimeInSecs (default: 5)
 *   @param {Number} newConfigs.initialRetryTimeInSecs (default: 1)
 *   @param {Number} newConfigs.factor (default: 0.2) - randomization factor
 *   @param {Number} newConfigs.multiplier (default: 2) - exponential factor
 *   @param {Number} newConfigs.retries (default: 5) - max retries
 */
export const setRetryConfigs = (newConfigs) => {
  console.warn('The use of setRetryConfigs is deprecated - use RetryMiddleware v2 instead.')
  retryConfigs = assign({}, retryConfigs, newConfigs)
  middlewareInstance = RetryMiddlewareV2(retryConfigs)()
}

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
 * Parameters can be configured using the method `setRetryConfigs`.
 */
let middlewareInstance = RetryMiddlewareV2(retryConfigs)()

export default function RetryMiddleware() {
  return {
    response(next, renew, request) {
      return middlewareInstance.response(next, renew, request)
    },
  }
}

/**
 * Increases the retry time for each attempt using a randomization function that grows exponentially.
 * The value is limited by `retryConfigs.maxRetryTimeInSecs`.
 * @param {Number} retryTime
 *
 * @return {Number}
 */
export const calculateExponentialRetryTime = (retryTime) =>
  Math.min(
    randomFromRetryTime(retryTime) * retryConfigs.multiplier,
    retryConfigs.maxRetryTimeInSecs * 1000
  )

const randomFromRetryTime = (retryTime) => {
  const delta = retryConfigs.factor * retryTime
  return random(retryTime - delta, retryTime + delta)
}

const random = (min, max) => {
  return Math.random() * (max - min) + min
}
