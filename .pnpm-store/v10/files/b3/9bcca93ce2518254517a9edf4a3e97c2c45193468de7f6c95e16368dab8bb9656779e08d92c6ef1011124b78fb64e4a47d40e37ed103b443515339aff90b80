/**
 * Creates an oauth authenticator.
 *
 * @param {String} token
 *
 * @returns {Object}
 * @constructor
 */
function AuthOauth(token) {
  /**
   * Update JSON body with token.
   *
   * @param {JSON} body
   *
   * @returns {null}
   */
  this.updateBody = function (body) {
    body['data']['TOKEN'] = token;
  };

  this.authenticate = async function () {};
}

module.exports = AuthOauth;
