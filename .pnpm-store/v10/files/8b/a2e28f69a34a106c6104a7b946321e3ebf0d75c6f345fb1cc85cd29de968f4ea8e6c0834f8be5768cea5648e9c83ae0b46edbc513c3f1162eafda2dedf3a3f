const jose = require('jose');
const { ArgumentError } = require('../errors');
const { JwksClient } = require('../JwksClient');
const supportedAlg = require('./config');

const handleSigningKeyError = (err, cb) => {
  // If we didn't find a match, can't provide a key.
  if (err && err.name === 'SigningKeyNotFoundError') {
    return cb(null);
  }

  // If an error occured like rate limiting or HTTP issue, we'll bubble up the error.
  if (err) {
    return cb(err);
  }
};

module.exports.passportJwtSecret = function (options) {
  if (options === null || options === undefined) {
    throw new ArgumentError('An options object must be provided when initializing passportJwtSecret');
  }

  if (!options.jwksUri) {
    throw new ArgumentError('No JWKS provided. Please provide a jwksUri');
  }

  const client = new JwksClient(options);
  const onError = options.handleSigningKeyError || handleSigningKeyError;

  return function secretProvider(req, rawJwtToken, cb) {
    let decoded;
    try {
      decoded = {
        payload: jose.decodeJwt(rawJwtToken),
        header: jose.decodeProtectedHeader(rawJwtToken)
      };
    } catch (err) {
      decoded = null;
    }

    if (!decoded || !supportedAlg.includes(decoded.header.alg)) {
      return cb(null, null);
    }

    client.getSigningKey(decoded.header.kid)
      .then(key => {
        cb(null, key.publicKey || key.rsaPublicKey);
      }).catch(err => {
        onError(err, (newError) => cb(newError, null));
      });
  };
};
