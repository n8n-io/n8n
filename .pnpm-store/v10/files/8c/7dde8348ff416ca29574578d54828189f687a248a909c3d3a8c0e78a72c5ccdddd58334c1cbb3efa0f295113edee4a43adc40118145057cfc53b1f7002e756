const logger = require('debug')('jwks');
const memoizer = require('lru-memoizer');
const { promisify, callbackify } = require('util');

function cacheWrapper(client, { cacheMaxEntries = 5, cacheMaxAge = 600000 }) {
  logger(`Configured caching of signing keys. Max: ${cacheMaxEntries} / Age: ${cacheMaxAge}`);
  return promisify(memoizer({
    hash: (kid) => kid,
    load: callbackify(client.getSigningKey.bind(client)),
    maxAge: cacheMaxAge,
    max: cacheMaxEntries
  }));
}

module.exports.default = cacheWrapper;
