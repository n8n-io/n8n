const Logger = require('./../logger');
const authUtil = require('../authentication/authentication_util');
const { getFreePort, exists, format } = require('../util');
const { withBrowserActionTimeout, writeToCache, removeFromCache, readCache } = require('./authentication_util');
const querystring = require('querystring');
const GlobalConfig = require('../global_config');
const open = require('open');
const Util = require('../util');
const AuthenticationTypes = require('./authentication_types');

/**
 * Creates an oauth authenticator.
 *
 * @param {Object} connectionConfig
 * @param {Object} httpClient
 *
 * @returns {Object}
 * @constructor
 */
function AuthOauthAuthorizationCode(connectionConfig, httpClient) {
  const DEFAULT_REDIRECT_HOST = 'http://127.0.0.1';
  const DEFAULT_REDIRECT_URI_ENDPOINT = '/';
  const browserActionTimeout = connectionConfig.getBrowserActionTimeout();

  let oauth;
  let token;
  const clientId = connectionConfig.getOauthClientId();
  const clientSecret = connectionConfig.getOauthClientSecret();
  const authorizationUrl = getAuthorizationUrl(connectionConfig);
  const tokenUrl = authUtil.getTokenUrl(connectionConfig);

  const accessTokenKey = authUtil.buildOauthAccessTokenCacheKey(authorizationUrl.host,
    connectionConfig.username, AuthenticationTypes.OAUTH_AUTHORIZATION_CODE);
  const refreshTokenKey = authUtil.buildOauthRefreshTokenCacheKey(tokenUrl.host,
    connectionConfig.username, AuthenticationTypes.OAUTH_AUTHORIZATION_CODE);

  /**
   * Update JSON body with token.
   * @param {JSON} body
   * @returns {null}
   */
  this.updateBody = function (body) {
    if (exists(token)) {
      body['data']['TOKEN'] = token;
    }
    body['data']['AUTHENTICATOR'] = AuthenticationTypes.OAUTH_AUTHENTICATOR;
    body['data']['OAUTH_TYPE'] = AuthenticationTypes.OAUTH_AUTHORIZATION_CODE;
  };

  this.loadOauth4webapi = async function () {
    if (!oauth) {
      oauth = await import('oauth4webapi');
    }
  };

  this.authenticate = async function () {
    globalThis.crypto ??= require('node:crypto').webcrypto;

    //verify that there is access token in the cache
    const accessTokenFromCache = await readCache(accessTokenKey);
    //verify that there is refresh token in the cache
    const refreshTokenFromCache = await readCache(refreshTokenKey);
    if (exists(accessTokenFromCache) && connectionConfig.getClientStoreTemporaryCredential()) {
      token = accessTokenFromCache;
    } else if (exists(refreshTokenFromCache) && connectionConfig.getClientStoreTemporaryCredential()) {
      token = await this.getAccessTokenUsingRefreshToken(refreshTokenFromCache);
    } else {
      token = await this.executeFullAuthorizationCodeFlow();
    }
  };

  this.reauthenticate = async function (body) {

    await removeFromCache(accessTokenKey);

    const refreshToken = await readCache(refreshTokenKey);

    if (refreshToken) {
      try {
        await this.getAccessTokenUsingRefreshToken(refreshToken);
        this.updateBody(body);
      } catch (error) {
        await removeFromCache(refreshTokenKey);
        Logger.getInstance().warn(format('Error while getting access token using refresh token. Message: %s. The refresh token is removed form cache - authentication must be proceed from the beginning', error.message));
        await this.authenticate();
        this.updateBody(body);
      }
    } else {
      await this.authenticate();
      this.updateBody(body);
    }
  };

  this.executeFullAuthorizationCodeFlow = async function (){
    await this.loadOauth4webapi(); // import module using the dynamic import
    const codeChallengeMethod = connectionConfig.getOauthChallengeMethod() || 'S256'; // TODO: should be verified with "discovery" response
    //An issuer is a obligatory parameter in validation processed by oauth4webapi library, even when it isn't used
    const issuer = connectionConfig.issuer || 'UNKNOWN';
    const codeVerifier = oauth.generateRandomCodeVerifier();
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
    const as = { issuer: issuer };

    // eslint-disable-next-line camelcase
    const client = { client_id: clientId };
    const clientAuth = oauth.ClientSecretPost(clientSecret);

    const redirectUri = await buildRedirectUri(connectionConfig);
    const scope = await authUtil.prepareScope(connectionConfig);

    const authorizationUrlWithParams = await prepareAuthorizationUrl(authorizationUrl, client, redirectUri, codeChallenge, codeChallengeMethod, as, scope);

    const authorizationCodeResponse = await requestAuthorizationCode(authorizationUrlWithParams, browserActionTimeout);
    const params = oauth.validateAuthResponse(as, client, authorizationUrlWithParams, authorizationCodeResponse.state);

    params.set('code', authorizationCodeResponse.code);
    Logger.getInstance().trace('Requesting token');
    const token = await requestToken(as, tokenUrl, client, clientAuth, params, redirectUri, codeVerifier);
    return token;
  };

  this.getAccessTokenUsingRefreshToken = async function (refreshToken){
    globalThis.crypto ??= require('node:crypto').webcrypto;

    await this.loadOauth4webapi(); // import module using the dynamic import
    const issuer = connectionConfig.issuer || 'UNKNOWN';
    const as = { issuer: issuer };
    const clientId = connectionConfig.getOauthClientId();
    const clientSecret = connectionConfig.getOauthClientSecret();
    // eslint-disable-next-line camelcase
    const client = { client_id: clientId };
    const clientAuth = oauth.ClientSecretPost(clientSecret);

    // Refresh Token Grant Request & Response
    const tokenUrl = authUtil.getTokenUrl(connectionConfig);
    Logger.getInstance().trace(
      `Receiving new OAuth access token from: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
    as['token_endpoint'] = tokenUrl.href;
    const response = await oauth.refreshTokenGrantRequest(as, client, clientAuth, refreshToken, {
      [oauth.allowInsecureRequests]: connectionConfig.getOauthHttpAllowed(),
      [oauth.customFetch]: async (url, options) => await convertToResponseType(httpClient, url, options)
    });

    const result = await oauth.processRefreshTokenResponse(as, client, response);

    if (result.access_token) {
      //cache access token
      Logger.getInstance().debug(
        `Received new OAuth access token from: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
      await writeToCache(accessTokenKey, result.access_token);
      //cache refreshToken if exists
      if (result.refresh_token) {
        //cache refresh token
        Logger.getInstance().debug(
          `Received new OAuth refresh token from: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
        await writeToCache(refreshTokenKey, result.refresh_token);
      } else {
        Logger.getInstance().warn('There is no refresh_token value to write to cache. Clearing refresh token in cache');
        await removeFromCache(refreshTokenKey);
      }
    } else {
      throw Error(`Response doesn't contain OAuth access token. Requested URI: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
    }

    return result.access_token;
  };

  async function prepareAuthorizationUrl(authorizationUrl, client, redirectUri, codeChallenge, codeChallengeMethod, as, scope) {
    authorizationUrl.searchParams.set('client_id', client.client_id);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', scope);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', codeChallengeMethod);

    /**
     * We cannot be sure PKCE is supported then the state should be used.
     */
    if (as.code_challenge_methods_supported?.includes('S256') !== true) {
      const state = oauth.generateRandomState();
      authorizationUrl.searchParams.set('state', state);
    }
    return authorizationUrl;
  }

  async function verifyPortIsAvailable(server, redirectPort) {
    return Util.isPortOpen(redirectPort).catch((rejected) => {
      server.close();
      throw new Error(`Cannot run server using provided redirect url. ${rejected}`);
    });
  }

  async function requestAuthorizationCode(authorizationUrl, browserActionTimeout) {
    if (!Util.number.isPositiveInteger(browserActionTimeout)) {
      throw new Error(`Invalid value for browser action timeout: ${browserActionTimeout}`);
    }
    let server;
    const receiveData = new Promise((resolve, reject) => {
      server = authUtil.createServer(resolve, reject);
    }).then((result) => {
      return result;
    });

    const redirectUri = new URL(authorizationUrl.searchParams.get('redirect_uri'));
    await verifyPortIsAvailable(server, redirectUri.port);
    server.listen(redirectUri.port || 0, 0);

    const authorizationCodeProvider = GlobalConfig.getCustomRedirectingClient();
    const codeProvider = authorizationCodeProvider ? authorizationCodeProvider : browserAuthorizationCodeProvider;

    await codeProvider(authorizationUrl);

    const codeResponse = await withBrowserActionTimeout(browserActionTimeout, receiveData)
      .catch((rejected) => {
        server.close();
        throw new Error(rejected);
      });

    const autorizationCodeResponseParameters = querystring.parse(codeResponse.substring(codeResponse.indexOf('?') + 1));
    const code = autorizationCodeResponseParameters['code'];
    const state = autorizationCodeResponseParameters['state'].replace(new RegExp('\\sHTTP/.*'), '');

    Logger.getInstance().debug(
      `Received new OAuth authorization code from: Host: ${authorizationUrl.host} Path: ${authorizationUrl.pathname}`);

    return { code: code, state: state };
  }

  async function convertToResponseType(httpClient, url, options) {
    function asResponseType(response) {
      return new Response(response.json, {
        staus: response.statusCode,
        statusText: response.statusText,
        headers: response.headers
      });
    }

    options.url = url;
    return asResponseType(await httpClient.requestAsync(options));
  }

  async function requestToken(as, tokenUrl, client, clientAuth, params, redirectUri, codeVerifier) {
    try {
      Logger.getInstance().trace(
        `Receiving new OAuth access token from: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
      as['token_endpoint'] = tokenUrl.href;
      const response = await oauth.authorizationCodeGrantRequest(
        as,
        client,
        clientAuth,
        params,
        redirectUri,
        codeVerifier,
        {
          [oauth.allowInsecureRequests]: connectionConfig.getOauthHttpAllowed(),
          [oauth.customFetch]: async (url, options) => await convertToResponseType(httpClient, url, options)
        }
      );

      const result = await oauth.processAuthorizationCodeResponse(as, client, response);
      if (result.access_token) {
        //cache access token
        Logger.getInstance().debug(
          `Received new OAuth access token from: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
        await writeToCache(accessTokenKey, result.access_token);
        //cache refreshToken if exists
        if (result.refresh_token) {
          //cache refresh token
          Logger.getInstance().debug(
            `Received new OAuth refresh token from: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
          await writeToCache(refreshTokenKey, result.refresh_token);
        }
      } else {
        throw Error(`Response doesn't contain OAuth access token. Requested URI: Host: ${tokenUrl.host} Path: ${tokenUrl.pathname}`);
      }
      return result.access_token;
    } catch (error) {
      throw new Error(format('Error while getting access token. Message: %s', error.message));
    }
  }

  function getAuthorizationUrl(options) {
    const authCodeUrl = options.getOauthAuthorizationUrl();
    Logger.getInstance().debug(
      `Url used for receiving authorization code: ${authCodeUrl}`);
    return new URL(authCodeUrl);
  }

  async function buildRedirectUri(options) {
    const redirectUri = exists(options.getOauthRedirectUri())
      ? options.getOauthRedirectUri()
      : await createDefaultRedirectUri();
    Logger.getInstance().debug(
      `Authorization code redirect URL: ${redirectUri}`);
    return redirectUri;
  }

  async function createDefaultRedirectUri() {
    const redirectPort = await getFreePort();
    return `${DEFAULT_REDIRECT_HOST}:${redirectPort}${DEFAULT_REDIRECT_URI_ENDPOINT}`;
  }

  async function browserAuthorizationCodeProvider(authorizationUrl) {
    Logger.getInstance().debug(`Opening your browser to obtain the authorization code: ${authorizationUrl}`);
    return open(authorizationUrl.href);
  }

}

module.exports = AuthOauthAuthorizationCode;

