const logger = require('debug')('jwks');
const { retrieveSigningKeys } = require('./utils') ;
const { request, cacheSigningKey, rateLimitSigningKey, getKeysInterceptor, callbackSupport } = require('./wrappers');
const JwksError = require('./errors/JwksError');
const SigningKeyNotFoundError = require('./errors/SigningKeyNotFoundError');

class JwksClient {
  constructor(options) {
    this.options = {
      rateLimit: false,
      cache: true,
      timeout: 30000,
      ...options
    };

    // Initialize wrappers.
    if (this.options.getKeysInterceptor) {
      this.getSigningKey = getKeysInterceptor(this, options);
    }

    if (this.options.rateLimit) {
      this.getSigningKey = rateLimitSigningKey(this, options);
    }
    if (this.options.cache) {
      this.getSigningKey = cacheSigningKey(this, options);
    }

    this.getSigningKey = callbackSupport(this, options);
  }

  async getKeys() {
    logger(`Fetching keys from '${this.options.jwksUri}'`);

    try {
      const res = await request({
        uri: this.options.jwksUri,
        headers: this.options.requestHeaders,
        agent: this.options.requestAgent,
        timeout: this.options.timeout,
        fetcher: this.options.fetcher
      });

      logger('Keys:', res.keys);
      return res.keys;
    } catch (err) {
      const { errorMsg } = err;
      logger('Failure:', errorMsg || err);
      throw (errorMsg ? new JwksError(errorMsg) : err);
    }
  }

  async getSigningKeys() {
    const keys = await this.getKeys();

    if (!keys || !keys.length) {
      throw new JwksError('The JWKS endpoint did not contain any keys');
    }

    const signingKeys = await retrieveSigningKeys(keys);

    if (!signingKeys.length) {
      throw new JwksError('The JWKS endpoint did not contain any signing keys');
    }

    logger('Signing Keys:', signingKeys);
    return signingKeys;
  }

  async getSigningKey (kid) {
    logger(`Fetching signing key for '${kid}'`);
    const keys = await this.getSigningKeys();

    const kidDefined = kid !== undefined && kid !== null;
    if (!kidDefined && keys.length > 1) {
      logger('No KID specified and JWKS endpoint returned more than 1 key');
      throw new SigningKeyNotFoundError('No KID specified and JWKS endpoint returned more than 1 key');
    }

    const key = keys.find(k => !kidDefined || k.kid === kid);
    if (key) {
      return key;
    } else {
      logger(`Unable to find a signing key that matches '${kid}'`);
      throw new SigningKeyNotFoundError(`Unable to find a signing key that matches '${kid}'`);
    }
  }
}

module.exports = {
  JwksClient
};
