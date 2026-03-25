const util = require('../util');
const rest = require('../global_config').rest;
const Logger = require('../logger');

/**
 * Creates an okta authenticator.
 *
 * @param {Object} connectionConfig
 * @param {HttpClient} httpClient
 *
 * @returns {Object}
 * @constructor
 */
function AuthOkta(connectionConfig, httpClient) {
  const password = connectionConfig.password;
  const region = connectionConfig.region;
  const account = connectionConfig.account;
  const clientAppId = connectionConfig.getClientType();
  const clientAppVersion = connectionConfig.getClientVersion();
  const host = util.constructHostname(region, account);
  const port = rest.HTTPS_PORT;
  const protocol = rest.HTTPS_PROTOCOL;
  let user;
  let ssoUrl;
  let tokenUrl;
  let samlResponse;

  /**
   * Update JSON body with saml response.
   *
   * @param {JSON} body
   *
   * @returns {null}
   */
  this.updateBody = function (body) {
    body['data']['RAW_SAML_RESPONSE'] = samlResponse;
  };

  /**
  * Obtain saml response from Okta.
  *
  * @param {String} authenticator
  * @param {String} serviceName
  * @param {String} account
  * @param {String} username
  *
  * @returns {null}
  */
  this.authenticate = async function (authenticator, serviceName, account, username) {
    const response = await getAuthURLs(authenticator, serviceName, account, username);
    const responseData = response['data'];
    const success = responseData['success'];
    const errorCode = responseData['code'];
    const errorMessage = responseData['message'];
    user = username;

    if (typeof success === 'undefined' || errorCode === 'undefined' || errorMessage === 'undefined') {
      throw new Error('Unable to use provided Okta address as an authenticator. Is the authenticator URL correct?');
    }

    if (success !== true) {
      throw new Error(`Unable to use provided Okta address as an authenticator. Error code: ${errorCode}, error message: ${errorMessage}`);
    }

    ssoUrl = responseData['data']['ssoUrl'];
    tokenUrl = responseData['data']['tokenUrl'];

    this.validateURLs(authenticator, ssoUrl, tokenUrl);
    
    const responseHtml = await getSAMLResponse( await createAccessToken(tokenUrl, username, password), ssoUrl);

    validateSAML(responseHtml);
  };

  this.reauthenticate = async function (body, retryOption) {
    const maxRetryTimeout = connectionConfig.getRetryTimeout();
    const maxRetryCount = connectionConfig.getRetrySfMaxLoginRetries();
    const remainingTimeout =  (maxRetryTimeout - retryOption.totalElapsedTime) * 1000;

    const startTime = Date.now();
    const authRetryOption = {
      maxRetryCount,
      numRetries: retryOption.numRetries, 
      startTime,
      remainingTimeout,
      maxRetryTimeout,
    };

    let responseHtml;

    while (util.shouldRetryOktaAuth(authRetryOption)) {
      try { 
        responseHtml = await getSAMLResponse( await createAccessToken(tokenUrl, user, password), ssoUrl);
        break;
      } catch (err) {   
        Logger.getInstance().debug('getSAMLResponse: refresh token for re-authentication');
        authRetryOption.numRetries++;
      }
    }
    if (remainingTimeout !== 0 && startTime + remainingTimeout  < Date.now()) {
      Logger.getInstance().warn(`getSAMLResponse: Fail to get SAML response, timeout reached: ${remainingTimeout} miliseconds`);
      throw new Error('Reached out to the Login Timeout');
    }

    if (maxRetryCount < authRetryOption.numRetries){
      Logger.getInstance().warn(`getSAMLResponse: Fail to get SAML response, max retry reached: ${maxRetryCount} time`);
      throw new Error('Reached out to the max retry count');
    }
    retryOption.totalElapsedTime += ((Date.now() - startTime) / 1000);
    retryOption.numRetries = authRetryOption.numRetries;
    validateSAML(responseHtml);

    this.updateBody(body);
  }; 

  /**
  *
  * @param {String} authenticator
  * @param {String} serviceName
  * @param {String} account
  * @param {String} username
  *
  * @returns {Object}
  */
  async function getAuthURLs(authenticator, serviceName, account, username) {
    // Create URL to send POST request to
    const url = protocol + '://' + host + '/session/authenticator-request';

    let header;
    if (serviceName) {
      header = {
        'HTTP_HEADER_SERVICE_NAME': serviceName
      };
    }

    // JSON body to send with POST request
    const body = {
      'data': {
        'ACCOUNT_NAME': account,
        'LOGIN_NAME': username,
        'PORT': port,
        'PROTOCOL': protocol,
        'AUTHENTICATOR': authenticator,
        'CLIENT_APP_ID': clientAppId,
        'CLIENT_APP_VERSION': clientAppVersion
      }
    };

    // POST request to get SSO URL and token URL
    return await httpClient.post(url, body, {
      headers: header
    });
  }

  /**
  *
  * @param {String} authenticator
  * @param {String} ssoUrl
  * @param {String} tokenUrl
  *
  * @returns {null}
  */
  this.validateURLs = function (authenticator, ssoUrl, tokenUrl) {
    const compareUrlsByProtocolAndHost =  (firstUrl, secondUrl) => firstUrl.protocol === secondUrl.protocol && firstUrl.host === secondUrl.host;

    try {
      const aUrl = new URL(authenticator);
      const sUrl = new URL(ssoUrl);
      const tUrl = new URL(tokenUrl);
      if (!(compareUrlsByProtocolAndHost(aUrl, sUrl) && compareUrlsByProtocolAndHost(aUrl, tUrl))) {
        throw new Error('The prefix of the SSO/token URL and the specified authenticator do not match.');
      }
    } catch (err) {
      // we did not get a valid URL to test
      if (err instanceof TypeError) {
        throw new Error('Authenticator, SSO, or token URL is invalid.');
      } else {
        throw err;
      }
    }
  };

  /**
  *
  * @param {String} tokenUrl
  * @param {String} username
  * @param {String} password
  *
  * @returns {Object}
  */
  async function createAccessToken(tokenUrl, username, password) {
    // JSON body to send with POST request
    const body = {
      'username': username,
      'password': password
    };

    // Query IDP token url to authenticate and retrieve access token
    const response = await httpClient.post(tokenUrl, body);
    const data = response['data'];
    let oneTimeToken;
  
    if (data['sessionToken']) {
      oneTimeToken = data['sessionToken'];
    } else {
      oneTimeToken = data['cookieToken'];
    }
    return oneTimeToken;
  }

  /**
  *
  * @param {String} oneTimeToken
  * @param {String} ssoUrl
  *
  * @returns {Object}
  */
  async function getSAMLResponse(oneTimeToken, ssoUrl) {
    // Query IDP URL to get SAML response
    const response = await httpClient.get(ssoUrl, {
      params: {
        'RelayState': '/some/deep/link',
        'onetimetoken': oneTimeToken,
      } }
    );

    return response['data'];
  }

  /**
  *
  * @param {String} responseHtml
  *
  * @returns {null}
  */
  function validateSAML(responseHtml) {
    const postBackUrl = getPostBackUrlFromHtml(responseHtml);
    const fullUrl = util.format('%s://%s:%s', protocol, host, port);    

    // Validate the post back url come back with the SAML response
    // contains the same prefix as the Snowflake's server url, which is the
    // intended destination url to Snowflake.
    if (!connectionConfig.getDisableSamlURLCheck()) {
      if (postBackUrl.substring(0, 20) !== fullUrl.substring(0, 20)) {
        throw new Error(util.format('The specified authenticator and destination URL ' +
          'in the SAML assertion do not match: expected: %s postback: %s', fullUrl, postBackUrl));      
      }
    }
    samlResponse = responseHtml;
  }

  /**
  * Extract the postback URL from the HTML response.
  *
  * @param {String} html
  *
  * @returns {String}
  */
  function getPostBackUrlFromHtml(html) {
    const index = html.search('<form');
    const startIndex = html.indexOf('action="', index);
    const endIndex = html.indexOf('"', startIndex + 8);

    return unescapeHtml(html.substring(startIndex + 8, endIndex));
  }

  /**
  * Unescape the HTML hex characters in the string.
  *
  * @param {String} html
  *
  * @returns {String}
  */
  function unescapeHtml(html) {
    return html
      .replace(/&#x3a;/g, ':')
      .replace(/&#x2f;/g, '/');
  }
}

module.exports = AuthOkta;
