const util = require('../util');

/**
 * Creates a key-pair authenticator.
 *
 * @param {String} privateKey
 * @param {String} privateKeyPath
 * @param {String} privateKeyPass
 * @param {module} cryptomod
 * @param {module} jwtmod
 * @param {module} filesystem
 *
 * @returns {Object}
 * @constructor
 */
function AuthKeypair(connectionConfig, cryptomod, jwtmod, filesystem) {
  const crypto = typeof cryptomod !== 'undefined' ? cryptomod : require('crypto');
  const jwt = typeof jwtmod !== 'undefined' ? jwtmod : require('jsonwebtoken');
  const fs = typeof filesystem !== 'undefined' ? filesystem : require('fs');
  let privateKey = connectionConfig.getPrivateKey();
  const privateKeyPath = connectionConfig.getPrivateKeyPath();
  const privateKeyPass =  connectionConfig.getPrivateKeyPass();

  let jwtToken;

  const LIFETIME = 120; // seconds
  const ALGORITHM = 'RS256';
  const ISSUER = 'iss';
  const SUBJECT = 'sub';
  const EXPIRE_TIME = 'exp';
  const ISSUE_TIME = 'iat';

  /**
   * Update JSON body with token.
   *
   * @param {JSON} body
   *
   * @returns {null}
   */
  this.updateBody = function (body) {
    body['data']['TOKEN'] = jwtToken;
  };

  /**
   * Load private key from specified file location.
   *
   * @param {String} privateKeyPath
   * @param {String} privateKeyPass
   *
   * @returns {String} the private key.
   */
  function loadPrivateKey(privateKeyPath, privateKeyPass) {
    // Load private key file
    const privateKeyFile = fs.readFileSync(privateKeyPath);

    let privateKeyObject;

    // For encrypted private key
    if (privateKeyPass) {
      // Get private key with passphrase
      privateKeyObject = crypto.createPrivateKey({
        key: privateKeyFile,
        format: 'pem',
        passphrase: privateKeyPass
      });

    } else { // For unencrypted private key
      privateKeyObject = crypto.createPrivateKey({
        key: privateKeyFile,
        format: 'pem'
      });
    }

    const privateKey = privateKeyObject.export({
      format: 'pem',
      type: 'pkcs8'
    });

    return privateKey;
  }

  /**
   * Get public key fingerprint from private key.
   *
   * @param {String} privateKey
   *
   * @returns {String} the public key fingerprint.
   */
  function calculatePublicKeyFingerprint(privateKey) {
    // Extract public key object from private key
    const pubKeyObject = crypto.createPublicKey({
      key: privateKey,
      format: 'pem'
    });

    // Obtain public key string
    const publicKey = pubKeyObject.export({
      format: 'der',
      type: 'spki'
    });

    // Generate SHA256 hash of public key and encode in base64
    const publicKeyFingerprint = 'SHA256:' +
      crypto.createHash('sha256')
        .update(publicKey, 'utf8')
        .digest('base64');

    return publicKeyFingerprint;
  }

  /**
   * Generate JWT token using RS256 algorithm.
   *
   * @param {String} authenticator
   * @param {String} serviceName
   * @param {String} account
   * @param {String} username
   *
   * @returns {null}
   */
  this.authenticate = async function (authenticator, serviceName, account, username) {
    let publicKeyFingerprint;

    // Use private key if already set in connection string, otherwise use private key file location
    if (privateKey) {
      // Get public key fingerprint
      publicKeyFingerprint = calculatePublicKeyFingerprint(privateKey);
    } else if (privateKeyPath) {
      // Extract private key and get fingerprint
      privateKey = loadPrivateKey(privateKeyPath, privateKeyPass);
      publicKeyFingerprint = calculatePublicKeyFingerprint(privateKey);
    }

    // Current time + 120 seconds
    const currentTime = Date.now();
    const jwtTokenExp = currentTime + (LIFETIME * 1000);

    // Create payload containing jwt token and lifetime span
    const payload = {
      [ISSUER]: util.format('%s.%s.%s', account.toUpperCase(), username.toUpperCase(), publicKeyFingerprint),
      [SUBJECT]: util.format('%s.%s', account.toUpperCase(), username.toUpperCase()),
      [ISSUE_TIME]: currentTime,
      [EXPIRE_TIME]: jwtTokenExp
    };

    // Sign payload with RS256 algorithm
    jwtToken = jwt.sign(payload, privateKey, { algorithm: ALGORITHM });
  };

  this.reauthenticate = async function (body) {
    this.authenticate(connectionConfig.getAuthenticator(),
      connectionConfig.getServiceName(),
      connectionConfig.account,
      connectionConfig.username);

    this.updateBody(body);
  };
}

module.exports = AuthKeypair;
