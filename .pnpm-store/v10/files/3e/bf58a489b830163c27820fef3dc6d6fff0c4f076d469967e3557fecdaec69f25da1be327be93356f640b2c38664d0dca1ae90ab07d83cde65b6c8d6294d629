const { ArgumentError } = require('../errors');
const { JwksClient } = require('../JwksClient');
const supportedAlg = require('./config');

const handleSigningKeyError = (err, cb) => {
  // If we didn't find a match, can't provide a key.
  if (err && err.name === 'SigningKeyNotFoundError') {
    return cb(err, null, null);
  }

  // If an error occured like rate limiting or HTTP issue, we'll bubble up the error.
  if (err) {
    return cb(err, null, null);
  }
};

/**
 * Call hapiJwt2Key as a Promise
 * @param {object} options 
 * @returns {Promise}
 */
module.exports.hapiJwt2KeyAsync = (options) => {
  const secretProvider = module.exports.hapiJwt2Key(options);
  return function(decoded) {
    return new Promise((resolve, reject) => {
      const cb = (err, key) => {
        (!key || err) ? reject(err) : resolve({ key });
      };
      secretProvider(decoded, cb);
    });
  };
}; 

module.exports.hapiJwt2Key = function (options) {
  if (options === null || options === undefined) {
    throw new ArgumentError('An options object must be provided when initializing hapiJwt2Key');
  }

  const client = new JwksClient(options);
  const onError = options.handleSigningKeyError || handleSigningKeyError;

  return function secretProvider(decoded, cb) {
    // We cannot find a signing certificate if there is no header (no kid).
    if (!decoded || !decoded.header) {
      return cb(new Error('Cannot find a signing certificate if there is no header'), null, null);
    }

    if (!supportedAlg.includes(decoded.header.alg)) {
      return cb(new Error('Unsupported algorithm ' + decoded.header.alg + ' supplied.'), null, null);
    }

    client.getSigningKey(decoded.header.kid)
      .then(key => {
        return cb(null, key.publicKey || key.rsaPublicKey, key);
      }).catch(err => {
        return onError(err, (newError) => cb(newError, null, null));
      });
  };
};
