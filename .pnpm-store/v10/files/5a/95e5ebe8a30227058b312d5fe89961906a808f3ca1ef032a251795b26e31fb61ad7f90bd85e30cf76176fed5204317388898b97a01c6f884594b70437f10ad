import { safeDateNow } from './randomSafeContext.js';

// Intentionally keeping the key broad, as we don't know for sure what rate limit headers get returned from backend

const DEFAULT_RETRY_AFTER = 60 * 1000; // 60 seconds

/**
 * Extracts Retry-After value from the request header or returns default value
 * @param header string representation of 'Retry-After' header
 * @param now current unix timestamp
 *
 */
function parseRetryAfterHeader(header, now = safeDateNow()) {
  const headerDelay = parseInt(`${header}`, 10);
  if (!isNaN(headerDelay)) {
    return headerDelay * 1000;
  }

  const headerDate = Date.parse(`${header}`);
  if (!isNaN(headerDate)) {
    return headerDate - now;
  }

  return DEFAULT_RETRY_AFTER;
}

/**
 * Gets the time that the given category is disabled until for rate limiting.
 * In case no category-specific limit is set but a general rate limit across all categories is active,
 * that time is returned.
 *
 * @return the time in ms that the category is disabled until or 0 if there's no active rate limit.
 */
function disabledUntil(limits, dataCategory) {
  return limits[dataCategory] || limits.all || 0;
}

/**
 * Checks if a category is rate limited
 */
function isRateLimited(limits, dataCategory, now = safeDateNow()) {
  return disabledUntil(limits, dataCategory) > now;
}

/**
 * Update ratelimits from incoming headers.
 *
 * @return the updated RateLimits object.
 */
function updateRateLimits(
  limits,
  { statusCode, headers },
  now = safeDateNow(),
) {
  const updatedRateLimits = {
    ...limits,
  };

  // "The name is case-insensitive."
  // https://developer.mozilla.org/en-US/docs/Web/API/Headers/get
  const rateLimitHeader = headers?.['x-sentry-rate-limits'];
  const retryAfterHeader = headers?.['retry-after'];

  if (rateLimitHeader) {
    /**
     * rate limit headers are of the form
     *     <header>,<header>,..
     * where each <header> is of the form
     *     <retry_after>: <categories>: <scope>: <reason_code>: <namespaces>
     * where
     *     <retry_after> is a delay in seconds
     *     <categories> is the event type(s) (error, transaction, etc) being rate limited and is of the form
     *         <category>;<category>;...
     *     <scope> is what's being limited (org, project, or key) - ignored by SDK
     *     <reason_code> is an arbitrary string like "org_quota" - ignored by SDK
     *     <namespaces> Semicolon-separated list of metric namespace identifiers. Defines which namespace(s) will be affected.
     *         Only present if rate limit applies to the metric_bucket data category.
     */
    for (const limit of rateLimitHeader.trim().split(',')) {
      const [retryAfter, categories, , , namespaces] = limit.split(':', 5) ;
      const headerDelay = parseInt(retryAfter, 10);
      const delay = (!isNaN(headerDelay) ? headerDelay : 60) * 1000; // 60sec default
      if (!categories) {
        updatedRateLimits.all = now + delay;
      } else {
        for (const category of categories.split(';')) {
          if (category === 'metric_bucket') {
            // namespaces will be present when category === 'metric_bucket'
            if (!namespaces || namespaces.split(';').includes('custom')) {
              updatedRateLimits[category] = now + delay;
            }
          } else {
            updatedRateLimits[category] = now + delay;
          }
        }
      }
    }
  } else if (retryAfterHeader) {
    updatedRateLimits.all = now + parseRetryAfterHeader(retryAfterHeader, now);
  } else if (statusCode === 429) {
    updatedRateLimits.all = now + 60 * 1000;
  }

  return updatedRateLimits;
}

export { DEFAULT_RETRY_AFTER, disabledUntil, isRateLimited, parseRetryAfterHeader, updateRateLimits };
//# sourceMappingURL=ratelimit.js.map
