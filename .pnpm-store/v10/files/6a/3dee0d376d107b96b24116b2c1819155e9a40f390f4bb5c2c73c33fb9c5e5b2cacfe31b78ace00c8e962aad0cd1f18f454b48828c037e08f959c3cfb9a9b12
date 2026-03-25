const mfaAuthenticator = require ('./authentication_types.js').USER_PWD_MFA_AUTHENTICATOR;

/**
 * Creates a default authenticator.
 *
 * @param {String} password
 *
 * @returns {Object}
 * @constructor
 */
function AuthDefault(connectionConfig) {
  const password = connectionConfig.password;
  const mfaToken = connectionConfig.mfaToken;
  const passcode = connectionConfig.getPasscode();
  const isPasscodeInPassword = connectionConfig.getPasscodeInPassword();

  /**
     * Update JSON body with password or token.
     *
     * @param {JSON} body
     *
     * @returns {null}
     */
  this.updateBody = function (body) {
    body['data']['PASSWORD'] = password;

    if (isMFAAuth()) {
      setMFASessionParams(body);
    }
  };

  function isMFAAuth() {
    return ( connectionConfig.getAuthenticator() === mfaAuthenticator || mfaToken || passcode || isPasscodeInPassword);
  }

  function setMFASessionParams(body) {
    body['data']['TOKEN'] = mfaToken;
    body['data']['AUTHENTICATOR'] = mfaAuthenticator;
    
    if (isPasscodeInPassword) {
      body['data']['EXT_AUTHN_DUO_METHOD'] = 'passcode';
      body['data']['passcodeInPassword'] = true;
    } else if (passcode) {
      body['data']['EXT_AUTHN_DUO_METHOD'] = 'passcode';
      body['data']['PASSCODE'] = passcode;
    } else {
      body['data']['EXT_AUTHN_DUO_METHOD'] = 'push';
    }
  }
    
  this.authenticate = async function () {
    return;
  };

  this.reauthenticate = async function () {
    return;
  };
}

module.exports = AuthDefault;
