const { ArgumentError } = require('../errors');
const { JwksClient } = require('../JwksClient');
const supportedAlg = require('./config');

module.exports.koaJwtSecret = function (options = {}) {
  if (!options.jwksUri) {
    throw new ArgumentError('No JWKS provided. Please provide a jwksUri');
  }

  const client = new JwksClient(options);

  return function secretProvider({ alg, kid } = {}) {
    return new Promise((resolve, reject) => {
      if (!supportedAlg.includes(alg)) {
        return reject(new Error('Missing / invalid token algorithm'));
      }

      client.getSigningKey(kid)
        .then(key => {
          resolve(key.publicKey || key.rsaPublicKey);
        }).catch(err => {
          if (options.handleSigningKeyError) {
            return options.handleSigningKeyError(err).then(reject);
          }

          return reject(err);
        });
    });
  };
};
