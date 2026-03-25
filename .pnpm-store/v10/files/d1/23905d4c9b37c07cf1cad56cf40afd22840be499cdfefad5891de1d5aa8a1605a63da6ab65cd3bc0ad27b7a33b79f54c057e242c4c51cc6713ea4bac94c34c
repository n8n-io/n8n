// This file was modified by Oracle on June 17, 2021.
// Handshake errors are now maked as fatal and the corresponding events are
// emitted in the command instance itself.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

// This file was modified by Oracle on September 21, 2021.
// Handshake workflow now supports additional authentication factors requested
// by the server.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

'use strict';

const Command = require('./command.js');
const Packets = require('../packets/index.js');
const ClientConstants = require('../constants/client.js');
const CharsetToEncoding = require('../constants/charset_encodings.js');
const auth41 = require('../auth_41.js');

function flagNames(flags) {
  const res = [];
  for (const c in ClientConstants) {
    if (flags & ClientConstants[c]) {
      res.push(c.replace(/_/g, ' ').toLowerCase());
    }
  }
  return res;
}

class ClientHandshake extends Command {
  constructor(clientFlags) {
    super();
    this.handshake = null;
    this.clientFlags = clientFlags;
    this.authenticationFactor = 0;
  }

  start() {
    return ClientHandshake.prototype.handshakeInit;
  }

  sendSSLRequest(connection) {
    const sslRequest = new Packets.SSLRequest(
      this.clientFlags,
      connection.config.charsetNumber
    );
    connection.writePacket(sslRequest.toPacket());
  }

  sendCredentials(connection) {
    if (connection.config.debug) {
      console.log(
        'Sending handshake packet: flags:%d=(%s)',
        this.clientFlags,
        flagNames(this.clientFlags).join(', ')
      );
    }
    this.user = connection.config.user;
    this.password = connection.config.password;
    // "password1" is an alias to the original "password" value
    // to make it easier to integrate multi-factor authentication
    this.password1 = connection.config.password;
    // "password2" and "password3" are the 2nd and 3rd factor authentication
    // passwords, which can be undefined depending on the authentication
    // plugin being used
    this.password2 = connection.config.password2;
    this.password3 = connection.config.password3;
    this.passwordSha1 = connection.config.passwordSha1;
    this.database = connection.config.database;
    this.authPluginName = this.handshake.authPluginName;
    const handshakeResponse = new Packets.HandshakeResponse({
      flags: this.clientFlags,
      user: this.user,
      database: this.database,
      password: this.password,
      passwordSha1: this.passwordSha1,
      charsetNumber: connection.config.charsetNumber,
      authPluginData1: this.handshake.authPluginData1,
      authPluginData2: this.handshake.authPluginData2,
      compress: connection.config.compress,
      connectAttributes: connection.config.connectAttributes,
    });
    connection.writePacket(handshakeResponse.toPacket());
  }

  calculateNativePasswordAuthToken(authPluginData) {
    // TODO: dont split into authPluginData1 and authPluginData2, instead join when 1 & 2 received
    const authPluginData1 = authPluginData.slice(0, 8);
    const authPluginData2 = authPluginData.slice(8, 20);
    let authToken;
    if (this.passwordSha1) {
      authToken = auth41.calculateTokenFromPasswordSha(
        this.passwordSha1,
        authPluginData1,
        authPluginData2
      );
    } else {
      authToken = auth41.calculateToken(
        this.password,
        authPluginData1,
        authPluginData2
      );
    }
    return authToken;
  }

  handshakeInit(helloPacket, connection) {
    this.on('error', (e) => {
      connection._fatalError = e;
      connection._protocolError = e;
    });
    this.handshake = Packets.Handshake.fromPacket(helloPacket);
    if (connection.config.debug) {
      console.log(
        'Server hello packet: capability flags:%d=(%s)',
        this.handshake.capabilityFlags,
        flagNames(this.handshake.capabilityFlags).join(', ')
      );
    }
    connection.serverCapabilityFlags = this.handshake.capabilityFlags;
    connection.serverEncoding = CharsetToEncoding[this.handshake.characterSet];
    connection.connectionId = this.handshake.connectionId;
    const serverSSLSupport =
      this.handshake.capabilityFlags & ClientConstants.SSL;
    // multi factor authentication is enabled with the
    // "MULTI_FACTOR_AUTHENTICATION" capability and should only be used if it
    // is supported by the server
    const multiFactorAuthentication =
      this.handshake.capabilityFlags &
      ClientConstants.MULTI_FACTOR_AUTHENTICATION;
    this.clientFlags = this.clientFlags | multiFactorAuthentication;
    // use compression only if requested by client and supported by server
    connection.config.compress =
      connection.config.compress &&
      this.handshake.capabilityFlags & ClientConstants.COMPRESS;
    this.clientFlags = this.clientFlags | connection.config.compress;
    if (connection.config.ssl) {
      // client requires SSL but server does not support it
      if (!serverSSLSupport) {
        const err = new Error('Server does not support secure connection');
        err.code = 'HANDSHAKE_NO_SSL_SUPPORT';
        err.fatal = true;
        this.emit('error', err);
        return false;
      }
      // send ssl upgrade request and immediately upgrade connection to secure
      this.clientFlags |= ClientConstants.SSL;
      this.sendSSLRequest(connection);
      connection.startTLS((err) => {
        // after connection is secure
        if (err) {
          // SSL negotiation error are fatal
          err.code = 'HANDSHAKE_SSL_ERROR';
          err.fatal = true;
          this.emit('error', err);
          return;
        }
        // rest of communication is encrypted
        this.sendCredentials(connection);
      });
    } else {
      this.sendCredentials(connection);
    }
    if (multiFactorAuthentication) {
      // if the server supports multi-factor authentication, we enable it in
      // the client
      this.authenticationFactor = 1;
    }
    return ClientHandshake.prototype.handshakeResult;
  }

  handshakeResult(packet, connection) {
    const marker = packet.peekByte();
    // packet can be OK_Packet, ERR_Packet, AuthSwitchRequest, AuthNextFactor
    // or AuthMoreData
    if (marker === 0xfe || marker === 1 || marker === 0x02) {
      const authSwitch = require('./auth_switch');
      try {
        if (marker === 1) {
          authSwitch.authSwitchRequestMoreData(packet, connection, this);
        } else {
          // if authenticationFactor === 0, it means the server does not support
          // the multi-factor authentication capability
          if (this.authenticationFactor !== 0) {
            // if we are past the first authentication factor, we should use the
            // corresponding password (if there is one)
            connection.config.password =
              this[`password${this.authenticationFactor}`];
            // update the current authentication factor
            this.authenticationFactor += 1;
          }
          // if marker === 0x02, it means it is an AuthNextFactor packet,
          // which is similar in structure to an AuthSwitchRequest packet,
          // so, we can use it directly
          authSwitch.authSwitchRequest(packet, connection, this);
        }
        return ClientHandshake.prototype.handshakeResult;
      } catch (err) {
        // Authentication errors are fatal
        err.code = 'AUTH_SWITCH_PLUGIN_ERROR';
        err.fatal = true;

        if (this.onResult) {
          this.onResult(err);
        } else {
          this.emit('error', err);
        }
        return null;
      }
    }
    if (marker !== 0) {
      const err = new Error('Unexpected packet during handshake phase');
      // Unknown handshake errors are fatal
      err.code = 'HANDSHAKE_UNKNOWN_ERROR';
      err.fatal = true;

      if (this.onResult) {
        this.onResult(err);
      } else {
        this.emit('error', err);
      }
      return null;
    }
    // this should be called from ClientHandshake command only
    // and skipped when called from ChangeUser command
    if (!connection.authorized) {
      connection.authorized = true;
      if (connection.config.compress) {
        const enableCompression =
          require('../compressed_protocol.js').enableCompression;
        enableCompression(connection);
      }
    }
    if (this.onResult) {
      this.onResult(null);
    }
    return null;
  }
}
module.exports = ClientHandshake;
