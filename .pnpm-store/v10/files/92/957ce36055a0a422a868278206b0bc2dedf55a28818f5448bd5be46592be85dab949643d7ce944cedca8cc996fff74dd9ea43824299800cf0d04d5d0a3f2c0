// This file was modified by Oracle on September 21, 2021.
// The changes involve saving additional authentication factor passwords
// in the command scope and enabling multi-factor authentication in the
// client-side when the server supports it.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

'use strict';

const Command = require('./command.js');
const Packets = require('../packets/index.js');
const ClientConstants = require('../constants/client');
const ClientHandshake = require('./client_handshake.js');
const CharsetToEncoding = require('../constants/charset_encodings.js');

class ChangeUser extends Command {
  constructor(options, callback) {
    super();
    this.onResult = callback;
    this.user = options.user;
    this.password = options.password;
    // "password1" is an alias of "password"
    this.password1 = options.password;
    this.password2 = options.password2;
    this.password3 = options.password3;
    this.database = options.database;
    this.passwordSha1 = options.passwordSha1;
    this.charsetNumber = options.charsetNumber;
    this.currentConfig = options.currentConfig;
    this.authenticationFactor = 0;
  }
  start(packet, connection) {
    const newPacket = new Packets.ChangeUser({
      flags: connection.config.clientFlags,
      user: this.user,
      database: this.database,
      charsetNumber: this.charsetNumber,
      password: this.password,
      passwordSha1: this.passwordSha1,
      authPluginData1: connection._handshakePacket.authPluginData1,
      authPluginData2: connection._handshakePacket.authPluginData2,
    });
    this.currentConfig.user = this.user;
    this.currentConfig.password = this.password;
    this.currentConfig.database = this.database;
    this.currentConfig.charsetNumber = this.charsetNumber;
    connection.clientEncoding = CharsetToEncoding[this.charsetNumber];
    // clear prepared statements cache as all statements become invalid after changeUser
    connection._statements.clear();
    connection.writePacket(newPacket.toPacket());
    // check if the server supports multi-factor authentication
    const multiFactorAuthentication =
      connection.serverCapabilityFlags &
      ClientConstants.MULTI_FACTOR_AUTHENTICATION;
    if (multiFactorAuthentication) {
      // if the server supports multi-factor authentication, we enable it in
      // the client
      this.authenticationFactor = 1;
    }
    return ChangeUser.prototype.handshakeResult;
  }
}

ChangeUser.prototype.handshakeResult =
  ClientHandshake.prototype.handshakeResult;
ChangeUser.prototype.calculateNativePasswordAuthToken =
  ClientHandshake.prototype.calculateNativePasswordAuthToken;

module.exports = ChangeUser;
