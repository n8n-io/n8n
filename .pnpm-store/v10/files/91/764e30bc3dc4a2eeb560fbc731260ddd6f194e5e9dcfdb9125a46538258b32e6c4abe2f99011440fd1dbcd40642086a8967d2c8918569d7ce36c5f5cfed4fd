const Util = require('../util');
const Errors = require('../errors');
const { rest } = require('../global_config');

/**
 * Creates a new instance of an SsoUrlProvider.
 *
 * @param {Object} httpClient
 * @constructor
 */
function SsoUrlProvider(httpClient) {

  Errors.assertInternal(Util.isObject(httpClient));

  const port = rest.HTTPS_PORT;
  const protocol = rest.HTTPS_PROTOCOL;

  /**
   * Get SSO URL through POST request.
   *
   * @param {String} authenticator
   * @param {String} serviceName
   * @param {String} account
   * @param {Number} callbackPort
   * @param {String} user
   * @param {String} host
   *
   * @returns {String} the SSO URL.
   */
  this.getSSOURL = function (authenticator, serviceName, account, callbackPort, user, host) {
    // Create URL to send POST request to
    const url = protocol + '://' + host + '/session/authenticator-request';

    let header;
    if (serviceName) {
      header = {
        'HTTP_HEADER_SERVICE_NAME': serviceName
      };
    }
    const body = {
      'data': {
        'ACCOUNT_NAME': account,
        'LOGIN_NAME': user,
        'PORT': port,
        'PROTOCOL': protocol,
        'AUTHENTICATOR': authenticator,
        'BROWSER_MODE_REDIRECT_PORT': callbackPort.toString()
      }
    };

    const requestOptions =
      {
        method: 'post',
        url: url,
        headers: header,
        data: body,
        responseType: 'json'
      };

    // Post request to get the SSO URL
    return httpClient.requestAsync(requestOptions)
      .then((response) => {
        const data = response['data']['data'];
        return data;
      })
      .catch(requestErr => {
        throw requestErr;
      });
  };
}

module.exports = SsoUrlProvider;
