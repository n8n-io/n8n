const AuthDefault = require('./auth_default');
const AuthWeb = require('./auth_web');
const AuthKeypair = require('./auth_keypair');
const AuthOauth = require('./auth_oauth');
const AuthOauthPAT = require('./auth_oauth_pat');
const AuthOkta = require('./auth_okta');
const AuthIDToken = require('./auth_idtoken');
const Logger = require('../logger');
const AuthenticationTypes = require('./authentication_types');
const AuthOauthAuthorizationCode = require('./auth_oauth_authorization_code');
const AuthOauthClientCredentials = require('./auth_oauth_client_credentials');

/**
 * Returns the JSON body to be sent when connecting.
 *
 * @param {String} authenticator
 * @param {String} account
 * @param {String} username
 * @param {String} clientType
 * @param {String} clientVersion
 * @param {Object} clientEnv
 *
 * @returns {JSON}
 */
exports.formAuthJSON = function formAuthJSON(
  authenticator,
  account,
  username,
  clientType,
  clientVersion,
  clientEnv
) {
  const body = {
    data: {
      ACCOUNT_NAME: account,
      CLIENT_APP_ID: clientType,
      CLIENT_APP_VERSION: clientVersion,
      CLIENT_ENVIRONMENT:
        {
          OS: clientEnv.OS,
          OS_VERSION: clientEnv.OS_VERSION,
          OCSP_MODE: clientEnv.OCSP_MODE
        }
    }
  };
  if (!this.isOktaAuth(authenticator)) {
    body['data']['AUTHENTICATOR'] = authenticator;
    body['data']['LOGIN_NAME'] = username;
  }

  return body;
};

/**
 * Returns the authenticator to use base on the connection configuration.
 *
 * @param {Object} connectionConfig
 * @param httpClient
 *
 * @returns {Object} the authenticator.
 */
exports.getAuthenticator = function getAuthenticator(connectionConfig, httpClient) {
  const authType = connectionConfig.getAuthenticator();
  const openExternalBrowserCallback = connectionConfig.openExternalBrowserCallback; // Important for SSO in the Snowflake VS Code extension
  let auth;
  if (authType === AuthenticationTypes.DEFAULT_AUTHENTICATOR || authType === AuthenticationTypes.USER_PWD_MFA_AUTHENTICATOR) {
    auth = new AuthDefault(connectionConfig);
  } else if (authType === AuthenticationTypes.EXTERNAL_BROWSER_AUTHENTICATOR) {
    if (connectionConfig.getClientStoreTemporaryCredential() && !!connectionConfig.idToken) {
      auth = new AuthIDToken(connectionConfig, httpClient, openExternalBrowserCallback);
    } else {
      auth = new AuthWeb(connectionConfig, httpClient, openExternalBrowserCallback);
    }
  } else if (authType === AuthenticationTypes.KEY_PAIR_AUTHENTICATOR) {
    auth = new AuthKeypair(connectionConfig);
  } else if (authType === AuthenticationTypes.OAUTH_AUTHENTICATOR ) {
    auth = new AuthOauth(connectionConfig.getToken());
  } else if (authType === AuthenticationTypes.PROGRAMMATIC_ACCESS_TOKEN ) {
    auth = new AuthOauthPAT(connectionConfig.getToken(), connectionConfig.password);
  } else if (authType === AuthenticationTypes.OAUTH_AUTHORIZATION_CODE ) {
    auth = new AuthOauthAuthorizationCode(connectionConfig, httpClient);
  } else if (authType === AuthenticationTypes.OAUTH_CLIENT_CREDENTIALS ) {
    auth = new AuthOauthClientCredentials(connectionConfig, httpClient);
  } else if (this.isOktaAuth(authType)) {
    auth = new AuthOkta(connectionConfig, httpClient);
  } else {
    // Authenticator specified does not exist
    Logger.getInstance().warn(`No authenticator found for '${authType}'. Using default authenticator as a fallback`);
    auth = new AuthDefault(connectionConfig);
  }
  return auth;
};

/**
 * Returns the boolean describing if the provided authenticator is okta or not.
 *
 * @param {String} authenticator
 * @returns {boolean}
 */
exports.isOktaAuth = function isOktaAuth(authenticator) {
  return authenticator.toUpperCase().startsWith('HTTPS://');
};
