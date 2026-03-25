const { JwksClient } = require('./JwksClient');
const errors = require('./errors');
const { hapiJwt2Key, hapiJwt2KeyAsync } = require('./integrations/hapi');
const { expressJwtSecret } = require('./integrations/express');
const { koaJwtSecret } = require('./integrations/koa');
const { passportJwtSecret } = require('./integrations/passport');

module.exports = (options) => {
  return new JwksClient(options);
};
module.exports.JwksClient = JwksClient;

module.exports.ArgumentError = errors.ArgumentError;
module.exports.JwksError = errors.JwksError;
module.exports.JwksRateLimitError = errors.JwksRateLimitError;
module.exports.SigningKeyNotFoundError = errors.SigningKeyNotFoundError;

module.exports.expressJwtSecret = expressJwtSecret;
module.exports.hapiJwt2Key = hapiJwt2Key;
module.exports.hapiJwt2KeyAsync = hapiJwt2KeyAsync;
module.exports.koaJwtSecret = koaJwtSecret;
module.exports.passportJwtSecret = passportJwtSecret;
