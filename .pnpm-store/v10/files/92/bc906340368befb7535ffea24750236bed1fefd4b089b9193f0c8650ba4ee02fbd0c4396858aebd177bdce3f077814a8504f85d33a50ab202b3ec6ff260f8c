'use strict';

const PLUGIN_NAME = 'sha256_password';
const crypto = require('crypto');
const { xorRotating } = require('../auth_41');
const Tls = require('tls');

const REQUEST_SERVER_KEY_PACKET = Buffer.from([1]);

const STATE_INITIAL = 0;
const STATE_WAIT_SERVER_KEY = 1;
const STATE_FINAL = -1;

function encrypt(password, scramble, key) {
  const stage1 = xorRotating(Buffer.from(`${password}\0`, 'utf8'), scramble);
  return crypto.publicEncrypt(key, stage1);
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
          if (
            connection.stream instanceof Tls.TLSSocket &&
            connection.stream.encrypted === true
          ) {
            // We don't need to encrypt passwords over TLS connection
            return Buffer.from(`${password}\0`, 'utf8');
          }

          scramble = data.slice(0, 20);
          // if client provides key we can save one extra roundrip on first connection
          if (pluginOptions.serverPublicKey) {
            return authWithKey(pluginOptions.serverPublicKey);
          }

          state = STATE_WAIT_SERVER_KEY;
          return REQUEST_SERVER_KEY_PACKET;

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
