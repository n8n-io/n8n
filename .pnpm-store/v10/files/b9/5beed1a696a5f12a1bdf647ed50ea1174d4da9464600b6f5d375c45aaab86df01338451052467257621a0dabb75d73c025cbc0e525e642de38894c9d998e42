const util = require('../util');
const querystring = require('querystring');
const URLUtil = require('./../../lib/url_util');
const Util = require('./../../lib/util');
const SsoUrlProvider = require('../authentication/sso_url_provider');
const crypto = require('crypto');
const { rest } = require('../global_config');
const { createServer } = require('./authentication_util');

/**
 * Creates an external browser authenticator.
 *
 * @param {Object} connectionConfig
 * @param {Object} httpClient
 * @param {module} webbrowser
 *
 * @returns {Object}
 * @constructor
 */
function AuthWeb(connectionConfig, httpClient, webbrowser) {

  const host = connectionConfig.host;
  const browserActionTimeout = connectionConfig.getBrowserActionTimeout();
  const ssoUrlProvider = new SsoUrlProvider(httpClient);

  if (!Util.exists(host)) {
    throw new Error(`Invalid value for host: ${host}`);
  }
  if (!Util.number.isPositiveInteger(browserActionTimeout)) {
    throw new Error(`Invalid value for browser action timeout: ${browserActionTimeout}`);
  }

  const open = typeof webbrowser !== 'undefined' ? webbrowser : require('open');

  let proofKey;
  let token;


  /**
   * Update JSON body with token and proof_key.
   *
   * @param {JSON} body
   *
   * @returns {null}
   */
  this.updateBody = function (body) {
    body['data']['TOKEN'] = token;
    body['data']['PROOF_KEY'] = proofKey;
    body['data']['AUTHENTICATOR'] = 'EXTERNALBROWSER';
  };

  /**
   * Obtain SAML token through SSO URL.
   *
   * @param {String} authenticator
   * @param {String} serviceName
   * @param {String} account
   * @param {String} username
   *
   * @returns {null}
   */
  this.authenticate = async function (authenticator, serviceName, account, username) {
    let server;
    let loginUrl;

    const receiveData = new Promise( (resolve) => {
      // Server to receive SAML token
      server = createServer(resolve);
    }).then((result) => {
      return result;
    });

    // Use a free random port and set to no backlog
    server.listen(0, 0);

    if (connectionConfig.getDisableConsoleLogin()) {
      // Step 1: query Snowflake to obtain SSO url
      const ssoData = await ssoUrlProvider.getSSOURL(authenticator,
        serviceName,
        account,
        server.address().port,
        username,
        host);

      proofKey = ssoData['proofKey'];
      loginUrl = ssoData['ssoUrl'];
    } else {
      proofKey = this.generateProofKey();
      loginUrl = this.getLoginUrl(username, proofKey, server.address().port);
    }
   
    // Step 2: validate URL
    if (!URLUtil.isValidURL(loginUrl)) {
      throw new Error(util.format('Invalid SSO URL found - %s ', loginUrl));
    }

    // Step 3: open browser
    open(loginUrl);

    // Step 4: get SAML token
    const tokenGetHttpLine = await withBrowserActionTimeout(browserActionTimeout, receiveData).catch((rejected) => {
      server.close();
      throw new Error(util.format('Error while getting SAML token: %s', rejected));
    });
    processGet(tokenGetHttpLine);
  };
  
  this.generateProofKey = function () {
    const randomness = crypto.randomBytes(32);
    return Buffer.from(randomness, 'utf8').toString('base64');
  };

  this.getLoginUrl = function (username, proofKey, port) {
    const url = new URL(rest.HTTPS_PROTOCOL + '://' + host + '/console/login');
    url.searchParams.append('login_name', username);
    url.searchParams.append('proof_key', proofKey);
    url.searchParams.append('browser_mode_redirect_port', port);
    return url.toString();
  };


  /**
   * Parse the GET request and get token parameter value.
   *
   * @param {String} tokenHttpGetLine
   *    
   * @returns {null}
   */
  function processGet(tokenHttpGetLine) {
    // Split the GET request line
    const data = tokenHttpGetLine.split(' ');

    // Get value of the "token" query parameter
    token = querystring.parse(data[1])['/?token'];
  }

  const withBrowserActionTimeout = (millis, promise) => {
    const timeout = new Promise((resolve, reject) =>
      setTimeout(
        () => reject(`Browser action timed out after ${browserActionTimeout} ms.`),
        millis));
    return Promise.race([
      promise,
      timeout
    ]);
  };
}

module.exports = AuthWeb;
