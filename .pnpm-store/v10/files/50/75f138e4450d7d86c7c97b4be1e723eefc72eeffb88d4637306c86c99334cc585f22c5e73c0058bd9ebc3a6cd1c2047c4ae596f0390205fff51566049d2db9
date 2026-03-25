const logger = require('debug')('jwks');
const { RateLimiter } = require('limiter');

const JwksRateLimitError = require('../errors/JwksRateLimitError');

function rateLimitWrapper(client, { jwksRequestsPerMinute = 10 }) {
  const getSigningKey = client.getSigningKey.bind(client);

  const limiter = new RateLimiter(jwksRequestsPerMinute, 'minute', true);
  logger(`Configured rate limiting to JWKS endpoint at ${jwksRequestsPerMinute}/minute`);

  return async (kid) => await new Promise((resolve, reject) => {
    limiter.removeTokens(1, async (err, remaining) => {
      if (err) {
        reject(err);
      }

      logger('Requests to the JWKS endpoint available for the next minute:', remaining);
      if (remaining < 0) {
        logger('Too many requests to the JWKS endpoint');
        reject(new JwksRateLimitError('Too many requests to the JWKS endpoint'));
      } else {
        try {
          const key = await getSigningKey(kid);
          resolve(key);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

module.exports.default = rateLimitWrapper;
