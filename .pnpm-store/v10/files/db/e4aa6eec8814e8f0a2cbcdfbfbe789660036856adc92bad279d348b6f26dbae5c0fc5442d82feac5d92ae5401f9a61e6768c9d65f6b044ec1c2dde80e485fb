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

module.exports.expressJwtSecret = function (options) {
  if (options === null || options === undefined) {
    throw new ArgumentError('An options object must be provided when initializing expressJwtSecret');
  }

  const client = new JwksClient(options);
  const onError = options.handleSigningKeyError || handleSigningKeyError;

  const expressJwt7Provider = async (req, token) => {
    if (!token) { return; }
    const header = token.header;
    if (!header || !supportedAlg.includes(header.alg)) {
      return;
    }
    try {
      const key = await client.getSigningKey(header.kid);
      return key.publicKey || key.rsaPublicKey;
    } catch (err) {
      return new Promise((resolve, reject) => {
        onError(err, (newError) => {
          if (!newError) { return resolve(); }
          reject(newError);
        });
      });
    }
  };

  return function secretProvider(req, header, payload, cb) {
    //This function has 4 parameters to make it work with express-jwt@6
    //but it also supports express-jwt@7 which only has 2.
    if (arguments.length === 4) {
      expressJwt7Provider(req, { header })
        .then(key => {
          setImmediate(cb, null, key);
        }).catch(err => {
          setImmediate(cb, err);
        });

      return;
    }

    return expressJwt7Provider(req, arguments[1]);
  };
};
