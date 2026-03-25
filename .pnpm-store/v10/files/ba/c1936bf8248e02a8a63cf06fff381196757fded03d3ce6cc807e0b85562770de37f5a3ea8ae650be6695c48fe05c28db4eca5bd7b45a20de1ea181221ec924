const net = require('net');
const querystring = require('querystring');

const { exists,  format, escapeHTML, buildCredentialCacheKey } = require('../util');
const Logger = require('../logger');
const GlobalConfig = require('../global_config');

const responseHeadersAsString = 'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n';
const successResponse = 'Your identity was confirmed and propagated to Snowflake Node.js driver. You can close this window now and go back where you started from.';

const SNOWFLAKE_DOMAIN_REGEX = /(^|\.)snowflakecomputing\.(com|cn)/;

/**
 * Create server to retrieve SAML token.
 *
 * @param {Function} resolve
 * @param {Function} reject
 *
 * @returns {Server}
 */
function createServer(resolve, reject) {
  const server = net.createServer(function (socket) {
    socket.on('data', function (chunk) {

      // Receive the data and split by line
      const data = chunk.toString().split('\r\n');

      if (data[0].includes('?error=')) {
        // Error d credentials
        const error = prepareError(data[0]);
        socket.write(`${responseHeadersAsString} ${escapeHTML(error)}`, 'utf8');
        socket.destroy();
        server.close();
        Logger.getInstance().trace(`Error during authorization: ${error}`);
        reject(error);
      } else {
        // User successfully entered credentials
        socket.write(`${responseHeadersAsString} ${escapeHTML(successResponse)}`, 'utf8');
        socket.destroy();
        server.close();
        Logger.getInstance().trace('User successfully entered authorization code');
        resolve(data[0]);
      }

    });
    socket.on('error', (socketErr) => {
      if (socketErr['code'] === 'ECONNRESET') {
        socket.end();
      } else {
        throw socketErr;
      }
    });
  });
  return server;
}

const withBrowserActionTimeout = (millis, promise) => {
  const timeout = new Promise((resolve, reject) =>
    setTimeout(
      () => reject(`Browser action timed out after ${millis} ms.`),
      millis));
  return Promise.race([
    promise,
    timeout
  ]);
};

function prepareError(rejected) {
  const errorResponse = querystring.parse(rejected.substring(rejected.indexOf('?') + 1));
  const error = errorResponse['error'];
  const errorDescription = errorResponse['error_description'].replace(new RegExp('\\sHTTP/.*'), '');
  return format('Error while getting oauth authorization code. ErrorCode %s. Message: %s', error, errorDescription);
}


function getTokenUrl(options) {
  const tokenUrl = options.getOauthTokenRequestUrl();
  Logger.getInstance().debug(
    `Url used for receiving token: ${tokenUrl}`);
  return new URL(tokenUrl);
}


async function prepareScope(options) {
  const scope = exists(options.getOauthScope())
    ? options.getOauthScope()
    : `session:role:${options.getRole()}`;
  Logger.getInstance().debug(
    `Prepared scope used for receiving authorization code: ${scope}`);
  return scope;
}

const readCache = async (key) => {
  if ( exists(GlobalConfig.getCredentialManager()) ) {
    return GlobalConfig.getCredentialManager().read(key);
  } else {
    return null;
  }
};

const writeToCache = async (key, value) => {
  if ( exists(GlobalConfig.getCredentialManager()) ) {
    return GlobalConfig.getCredentialManager().write(key, value);
  }
};

const removeFromCache = async (key) => {
  if ( exists(GlobalConfig.getCredentialManager()) ) {
    return GlobalConfig.getCredentialManager().remove(key);
  }
};

const buildOauthAccessTokenCacheKey = (host, username, authenticationType) => buildCredentialCacheKey(host,
  username, authenticationType + '_access_token');
const buildOauthRefreshTokenCacheKey = (host, username, authenticationType) => buildCredentialCacheKey(host,
  username, authenticationType + '_refresh_token');

const isSnowflakeHost = (url) => {
  return SNOWFLAKE_DOMAIN_REGEX.test(url);
};

exports.createServer = createServer;
exports.withBrowserActionTimeout = withBrowserActionTimeout;
exports.getTokenUrl = getTokenUrl;
exports.prepareScope = prepareScope;
exports.readCache = readCache;
exports.writeToCache = writeToCache;
exports.removeFromCache = removeFromCache;
exports.buildOauthAccessTokenCacheKey = buildOauthAccessTokenCacheKey;
exports.buildOauthRefreshTokenCacheKey = buildOauthRefreshTokenCacheKey;
exports.isSnowflakeHost = isSnowflakeHost;
