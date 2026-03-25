'use strict';

// https://mysqlserverteam.com/mysql-8-0-4-new-default-authentication-plugin-caching_sha2_password/

const PLUGIN_NAME = 'caching_sha2_password';
const crypto = require('crypto');
const { xor, xorRotating } = require('../auth_41');

const REQUEST_SERVER_KEY_PACKET = Buffer.from([2]);
const FAST_AUTH_SUCCESS_PACKET = Buffer.from([3]);
const PERFORM_FULL_AUTHENTICATION_PACKET = Buffer.from([4]);

const STATE_INITIAL = 0;
const STATE_TOKEN_SENT = 1;
const STATE_WAIT_SERVER_KEY = 2;
const STATE_FINAL = -1;

function sha256(msg) {
  const hash = crypto.createHash('sha256');
  hash.update(msg);
  return hash.digest();
}

function calculateToken(password, scramble) {
  if (!password) {
    return Buffer.alloc(0);
  }
  const stage1 = sha256(Buffer.from(password));
  const stage2 = sha256(stage1);
  const stage3 = sha256(Buffer.concat([stage2, scramble]));
  return xor(stage1, stage3);
}

function encrypt(password, scramble, key) {
  const stage1 = xorRotating(Buffer.from(`${password}\0`, 'utf8'), scramble);
  return crypto.publicEncrypt(
    {
      key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    stage1
  );
}

module.exports =
  (pluginOptions = {}) =>
  ({ connection }) => {
    let state = 0;
    let scramble = null;

    const password = connection.config.password;

    const authWithKey = (serverKey) => {
      const _password = encrypt(password, scramble, serverKey);
      state = STATE_FINAL;
      return _password;
    };

    return (data) => {
      switch (state) {
        case STATE_INITIAL:
          scramble = data.slice(0, 20);
          state = STATE_TOKEN_SENT;
          return calculateToken(password, scramble);

        case STATE_TOKEN_SENT:
          if (FAST_AUTH_SUCCESS_PACKET.equals(data)) {
            state = STATE_FINAL;
            return null;
          }

          if (PERFORM_FULL_AUTHENTICATION_PACKET.equals(data)) {
            const isSecureConnection =
              typeof pluginOptions.overrideIsSecure === 'undefined'
                ? connection.config.ssl || connection.config.socketPath
                : pluginOptions.overrideIsSecure;
            if (isSecureConnection) {
              state = STATE_FINAL;
              return Buffer.from(`${password}\0`, 'utf8');
            }

            // if client provides key we can save one extra roundrip on first connection
            if (pluginOptions.serverPublicKey) {
              return authWithKey(pluginOptions.serverPublicKey);
            }

            state = STATE_WAIT_SERVER_KEY;
            return REQUEST_SERVER_KEY_PACKET;
          }
          throw new Error(
            `Invalid AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_TOKEN_SENT state.`
          );
        case STATE_WAIT_SERVER_KEY:
          if (pluginOptions.onServerPublicKey) {
            pluginOptions.onServerPublicKey(data);
          }
          return authWithKey(data);
        case STATE_FINAL:
          throw new Error(
            `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_FINAL state.`
          );
      }

      throw new Error(
        `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in state ${state}`
      );
    };
  };
