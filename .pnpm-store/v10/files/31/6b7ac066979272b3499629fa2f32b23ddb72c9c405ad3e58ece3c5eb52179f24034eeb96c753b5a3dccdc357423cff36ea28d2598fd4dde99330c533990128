/*
  TODO:
    * Replace `buffer._pos` usage in keyParser.js and elsewhere
    * Utilize optional "writev" support when writing packets from
      cipher.encrypt()
    * Built-in support for automatic re-keying, on by default
    * Revisit receiving unexpected/unknown packets
      * Error (fatal or otherwise) or ignore or pass on to user (in some or all
        cases)?
      * Including server/client check for single directional packet types?
      * Check packets for validity or bail as early as possible?
    * Automatic re-key every 2**31 packets after the last key exchange (sent or
      received), as suggested by RFC4344. OpenSSH currently does this.
    * Automatic re-key every so many blocks depending on cipher. RFC4344:
         Because of a birthday property of block ciphers and some modes of
         operation, implementations must be careful not to encrypt too many
         blocks with the same encryption key.

         Let L be the block length (in bits) of an SSH encryption method's
         block cipher (e.g., 128 for AES).  If L is at least 128, then, after
         rekeying, an SSH implementation SHOULD NOT encrypt more than 2**(L/4)
         blocks before rekeying again.  If L is at least 128, then SSH
         implementations should also attempt to force a rekey before receiving
         more than 2**(L/4) blocks.  If L is less than 128 (which is the case
         for older ciphers such as 3DES, Blowfish, CAST-128, and IDEA), then,
         although it may be too expensive to rekey every 2**(L/4) blocks, it
         is still advisable for SSH implementations to follow the original
         recommendation in [RFC4253]: rekey at least once for every gigabyte
         of transmitted data.

         Note that if L is less than or equal to 128, then the recommendation
         in this subsection supersedes the recommendation in Section 3.1.  If
         an SSH implementation uses a block cipher with a larger block size
         (e.g., Rijndael with 256-bit blocks), then the recommendations in
         Section 3.1 may supersede the recommendations in this subsection
         (depending on the lengths of the packets).
*/

'use strict';

const { inspect } = require('util');

const { bindingAvailable, NullCipher, NullDecipher } = require('./crypto.js');
const {
  COMPAT_CHECKS,
  DISCONNECT_REASON,
  eddsaSupported,
  MESSAGE,
  SIGNALS,
  TERMINAL_MODE,
} = require('./constants.js');
const {
  DEFAULT_KEXINIT_CLIENT,
  DEFAULT_KEXINIT_SERVER,
  KexInit,
  kexinit,
  onKEXPayload,
} = require('./kex.js');
const {
  parseKey,
} = require('./keyParser.js');
const MESSAGE_HANDLERS = require('./handlers.js');
const {
  bufferCopy,
  bufferFill,
  bufferSlice,
  convertSignature,
  sendPacket,
  writeUInt32BE,
} = require('./utils.js');
const {
  PacketReader,
  PacketWriter,
  ZlibPacketReader,
  ZlibPacketWriter,
} = require('./zlib.js');

const MODULE_VER = require('../../package.json').version;

const VALID_DISCONNECT_REASONS = new Map(
  Object.values(DISCONNECT_REASON).map((n) => [n, 1])
);
const IDENT_RAW = Buffer.from(`SSH-2.0-ssh2js${MODULE_VER}`);
const IDENT = Buffer.from(`${IDENT_RAW}\r\n`);
const MAX_LINE_LEN = 8192;
const MAX_LINES = 1024;
const PING_PAYLOAD = Buffer.from([
  MESSAGE.GLOBAL_REQUEST,
  // "keepalive@openssh.com"
  0, 0, 0, 21,
    107, 101, 101, 112, 97, 108, 105, 118, 101, 64, 111, 112, 101, 110, 115,
    115, 104, 46, 99, 111, 109,
  // Request a reply
  1,
]);
const NO_TERMINAL_MODES_BUFFER = Buffer.from([ TERMINAL_MODE.TTY_OP_END ]);

function noop() {}

/*
  Inbound:
    * kexinit payload (needed only until exchange hash is generated)
    * raw ident
    * rekey packet queue
    * expected packet (implemented as separate _parse() function?)
  Outbound:
    * kexinit payload (needed only until exchange hash is generated)
    * rekey packet queue
    * kex secret (needed only until NEWKEYS)
    * exchange hash (needed only until NEWKEYS)
    * session ID (set to exchange hash from initial handshake)
*/
class Protocol {
  constructor(config) {
    const onWrite = config.onWrite;
    if (typeof onWrite !== 'function')
      throw new Error('Missing onWrite function');
    this._onWrite = (data) => { onWrite(data); };

    const onError = config.onError;
    if (typeof onError !== 'function')
      throw new Error('Missing onError function');
    this._onError = (err) => { onError(err); };

    const debug = config.debug;
    this._debug = (typeof debug === 'function'
                   ? (msg) => { debug(msg); }
                   : undefined);

    const onHeader = config.onHeader;
    this._onHeader = (typeof onHeader === 'function'
                      ? (...args) => { onHeader(...args); }
                      : noop);

    const onPacket = config.onPacket;
    this._onPacket = (typeof onPacket === 'function'
                      ? () => { onPacket(); }
                      : noop);

    let onHandshakeComplete = config.onHandshakeComplete;
    if (typeof onHandshakeComplete !== 'function')
      onHandshakeComplete = noop;
    let firstHandshake;
    this._onHandshakeComplete = (...args) => {
      this._debug && this._debug('Handshake completed');
      if (firstHandshake === undefined)
        firstHandshake = true;
      else
        firstHandshake = false;

      // Process packets queued during a rekey where necessary
      const oldQueue = this._queue;
      if (oldQueue) {
        this._queue = undefined;
        this._debug && this._debug(
          `Draining outbound queue (${oldQueue.length}) ...`
        );
        for (let i = 0; i < oldQueue.length; ++i) {
          const data = oldQueue[i];
          // data === payload only

          // XXX: hacky
          let finalized = this._packetRW.write.finalize(data);
          if (finalized === data) {
            const packet = this._cipher.allocPacket(data.length);
            packet.set(data, 5);
            finalized = packet;
          }

          sendPacket(this, finalized);
        }
        this._debug && this._debug('... finished draining outbound queue');
      }

      if (firstHandshake && this._server && this._kex.remoteExtInfoEnabled)
        sendExtInfo(this);

      onHandshakeComplete(...args);
    };
    this._queue = undefined;

    const messageHandlers = config.messageHandlers;
    if (typeof messageHandlers === 'object' && messageHandlers !== null)
      this._handlers = messageHandlers;
    else
      this._handlers = {};

    this._onPayload = onPayload.bind(this);

    this._server = !!config.server;
    this._banner = undefined;
    let greeting;
    if (this._server) {
      if (typeof config.hostKeys !== 'object' || config.hostKeys === null)
        throw new Error('Missing server host key(s)');
      this._hostKeys = config.hostKeys;

      // Greeting displayed before the ssh identification string is sent, this
      // is usually ignored by most clients
      if (typeof config.greeting === 'string' && config.greeting.length) {
        greeting = (config.greeting.slice(-2) === '\r\n'
                    ? config.greeting
                    : `${config.greeting}\r\n`);
      }

      // Banner shown after the handshake completes, but before user
      // authentication begins
      if (typeof config.banner === 'string' && config.banner.length) {
        this._banner = (config.banner.slice(-2) === '\r\n'
                        ? config.banner
                        : `${config.banner}\r\n`);
      }
    } else {
      this._hostKeys = undefined;
    }

    let offer = config.offer;
    if (typeof offer !== 'object' || offer === null) {
      offer = (this._server ? DEFAULT_KEXINIT_SERVER : DEFAULT_KEXINIT_CLIENT);
    } else if (offer.constructor !== KexInit) {
      if (this._server) {
        offer.kex = offer.kex.concat(['kex-strict-s-v00@openssh.com']);
      } else {
        offer.kex = offer.kex.concat([
          'ext-info-c',
          'kex-strict-c-v00@openssh.com',
        ]);
      }
      offer = new KexInit(offer);
    }
    this._kex = undefined;
    this._strictMode = undefined;
    this._kexinit = undefined;
    this._offer = offer;
    this._cipher = new NullCipher(0, this._onWrite);
    this._decipher = undefined;
    this._skipNextInboundPacket = false;
    this._packetRW = {
      read: new PacketReader(),
      write: new PacketWriter(this),
    };
    this._hostVerifier = (!this._server
                           && typeof config.hostVerifier === 'function'
                          ? config.hostVerifier
                          : undefined);

    this._parse = parseHeader;
    this._buffer = undefined;
    this._authsQueue = [];
    this._authenticated = false;
    this._remoteIdentRaw = undefined;
    let sentIdent;
    if (typeof config.ident === 'string') {
      this._identRaw = Buffer.from(`SSH-2.0-${config.ident}`);

      sentIdent = Buffer.allocUnsafe(this._identRaw.length + 2);
      sentIdent.set(this._identRaw, 0);
      sentIdent[sentIdent.length - 2] = 13; // '\r'
      sentIdent[sentIdent.length - 1] = 10; // '\n'
    } else if (Buffer.isBuffer(config.ident)) {
      const fullIdent = Buffer.allocUnsafe(8 + config.ident.length);
      fullIdent.latin1Write('SSH-2.0-', 0, 8);
      fullIdent.set(config.ident, 8);
      this._identRaw = fullIdent;

      sentIdent = Buffer.allocUnsafe(fullIdent.length + 2);
      sentIdent.set(fullIdent, 0);
      sentIdent[sentIdent.length - 2] = 13; // '\r'
      sentIdent[sentIdent.length - 1] = 10; // '\n'
    } else {
      this._identRaw = IDENT_RAW;
      sentIdent = IDENT;
    }
    this._compatFlags = 0;

    if (this._debug) {
      if (bindingAvailable)
        this._debug('Custom crypto binding available');
      else
        this._debug('Custom crypto binding not available');
    }

    this._debug && this._debug(
      `Local ident: ${inspect(this._identRaw.toString())}`
    );
    this.start = () => {
      this.start = undefined;
      if (greeting)
        this._onWrite(greeting);
      this._onWrite(sentIdent);
    };
  }
  _destruct(reason) {
    this._packetRW.read.cleanup();
    this._packetRW.write.cleanup();
    this._cipher && this._cipher.free();
    this._decipher && this._decipher.free();
    if (typeof reason !== 'string' || reason.length === 0)
      reason = 'fatal error';
    this.parse = () => {
      throw new Error(`Instance unusable after ${reason}`);
    };
    this._onWrite = () => {
      throw new Error(`Instance unusable after ${reason}`);
    };
    this._destruct = undefined;
  }
  cleanup() {
    this._destruct && this._destruct();
  }
  parse(chunk, i, len) {
    while (i < len)
      i = this._parse(chunk, i, len);
  }

  // Protocol message API

  // ===========================================================================
  // Common/Shared =============================================================
  // ===========================================================================

  // Global
  // ------
  disconnect(reason) {
    const pktLen = 1 + 4 + 4 + 4;
    // We don't use _packetRW.write.* here because we need to make sure that
    // we always get a full packet allocated because this message can be sent
    // at any time -- even during a key exchange
    let p = this._packetRW.write.allocStartKEX;
    const packet = this._packetRW.write.alloc(pktLen, true);
    const end = p + pktLen;

    if (!VALID_DISCONNECT_REASONS.has(reason))
      reason = DISCONNECT_REASON.PROTOCOL_ERROR;

    packet[p] = MESSAGE.DISCONNECT;
    writeUInt32BE(packet, reason, ++p);
    packet.fill(0, p += 4, end);

    this._debug && this._debug(`Outbound: Sending DISCONNECT (${reason})`);
    sendPacket(this, this._packetRW.write.finalize(packet, true), true);
  }
  ping() {
    const p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(PING_PAYLOAD.length);

    packet.set(PING_PAYLOAD, p);

    this._debug && this._debug(
      'Outbound: Sending ping (GLOBAL_REQUEST: keepalive@openssh.com)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  rekey() {
    if (this._kexinit === undefined) {
      this._debug && this._debug('Outbound: Initiated explicit rekey');
      this._queue = [];
      kexinit(this);
    } else {
      this._debug && this._debug('Outbound: Ignoring rekey during handshake');
    }
  }

  // 'ssh-connection' service-specific
  // ---------------------------------
  requestSuccess(data) {
    let p = this._packetRW.write.allocStart;
    let packet;
    if (Buffer.isBuffer(data)) {
      packet = this._packetRW.write.alloc(1 + data.length);

      packet[p] = MESSAGE.REQUEST_SUCCESS;

      packet.set(data, ++p);
    } else {
      packet = this._packetRW.write.alloc(1);

      packet[p] = MESSAGE.REQUEST_SUCCESS;
    }

    this._debug && this._debug('Outbound: Sending REQUEST_SUCCESS');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  requestFailure() {
    const p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1);

    packet[p] = MESSAGE.REQUEST_FAILURE;

    this._debug && this._debug('Outbound: Sending REQUEST_FAILURE');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelSuccess(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_SUCCESS;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_SUCCESS (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelFailure(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_FAILURE;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_FAILURE (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelEOF(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_EOF;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_EOF (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelClose(chan) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4);

    packet[p] = MESSAGE.CHANNEL_CLOSE;

    writeUInt32BE(packet, chan, ++p);

    this._debug && this._debug(`Outbound: Sending CHANNEL_CLOSE (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelWindowAdjust(chan, amount) {
    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_WINDOW_ADJUST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, amount, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_WINDOW_ADJUST (r:${chan}, ${amount})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelData(chan, data) {
    const isBuffer = Buffer.isBuffer(data);
    const dataLen = (isBuffer ? data.length : Buffer.byteLength(data));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + dataLen);

    packet[p] = MESSAGE.CHANNEL_DATA;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, dataLen, p += 4);

    if (isBuffer)
      packet.set(data, p += 4);
    else
      packet.utf8Write(data, p += 4, dataLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_DATA (r:${chan}, ${dataLen})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelExtData(chan, data, type) {
    const isBuffer = Buffer.isBuffer(data);
    const dataLen = (isBuffer ? data.length : Buffer.byteLength(data));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + dataLen);

    packet[p] = MESSAGE.CHANNEL_EXTENDED_DATA;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, type, p += 4);

    writeUInt32BE(packet, dataLen, p += 4);

    if (isBuffer)
      packet.set(data, p += 4);
    else
      packet.utf8Write(data, p += 4, dataLen);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_EXTENDED_DATA (r:${chan})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelOpenConfirm(remote, local, initWindow, maxPacket) {
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN_CONFIRMATION;

    writeUInt32BE(packet, remote, ++p);

    writeUInt32BE(packet, local, p += 4);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN_CONFIRMATION (r:${remote}, l:${local})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  channelOpenFail(remote, reason, desc) {
    if (typeof desc !== 'string')
      desc = '';

    const descLen = Buffer.byteLength(desc);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + descLen + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN_FAILURE;

    writeUInt32BE(packet, remote, ++p);

    writeUInt32BE(packet, reason, p += 4);

    writeUInt32BE(packet, descLen, p += 4);

    p += 4;
    if (descLen) {
      packet.utf8Write(desc, p, descLen);
      p += descLen;
    }

    writeUInt32BE(packet, 0, p); // Empty language tag

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_OPEN_FAILURE (r:${remote})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // ===========================================================================
  // Client-specific ===========================================================
  // ===========================================================================

  // Global
  // ------
  service(name) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const nameLen = Buffer.byteLength(name);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + nameLen);

    packet[p] = MESSAGE.SERVICE_REQUEST;

    writeUInt32BE(packet, nameLen, ++p);
    packet.utf8Write(name, p += 4, nameLen);

    this._debug && this._debug(`Outbound: Sending SERVICE_REQUEST (${name})`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // 'ssh-userauth' service-specific
  // -------------------------------
  authPassword(username, password, newPassword) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const userLen = Buffer.byteLength(username);
    const passLen = Buffer.byteLength(password);
    const newPassLen = (newPassword ? Buffer.byteLength(newPassword) : 0);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + userLen + 4 + 14 + 4 + 8 + 1 + 4 + passLen
        + (newPassword ? 4 + newPassLen : 0)
    );

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 8, p += 14);
    packet.utf8Write('password', p += 4, 8);

    packet[p += 8] = (newPassword ? 1 : 0);

    writeUInt32BE(packet, passLen, ++p);
    if (Buffer.isBuffer(password))
      bufferCopy(password, packet, 0, passLen, p += 4);
    else
      packet.utf8Write(password, p += 4, passLen);

    if (newPassword) {
      writeUInt32BE(packet, newPassLen, p += passLen);
      if (Buffer.isBuffer(newPassword))
        bufferCopy(newPassword, packet, 0, newPassLen, p += 4);
      else
        packet.utf8Write(newPassword, p += 4, newPassLen);
      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (changed password)'
      );
    } else {
      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (password)'
      );
    }

    this._authsQueue.push('password');

    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authPK(username, pubKey, keyAlgo, cbSign) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    pubKey = parseKey(pubKey);
    if (pubKey instanceof Error)
      throw new Error('Invalid key');

    const keyType = pubKey.type;
    pubKey = pubKey.getPublicSSH();

    if (typeof keyAlgo === 'function') {
      cbSign = keyAlgo;
      keyAlgo = undefined;
    }
    if (!keyAlgo)
      keyAlgo = keyType;

    const userLen = Buffer.byteLength(username);
    const algoLen = Buffer.byteLength(keyAlgo);
    const pubKeyLen = pubKey.length;
    const sessionID = this._kex.sessionID;
    const sesLen = sessionID.length;
    const payloadLen =
      (cbSign ? 4 + sesLen : 0)
        + 1 + 4 + userLen + 4 + 14 + 4 + 9 + 1 + 4 + algoLen + 4 + pubKeyLen;
    let packet;
    let p;
    if (cbSign) {
      packet = Buffer.allocUnsafe(payloadLen);
      p = 0;
      writeUInt32BE(packet, sesLen, p);
      packet.set(sessionID, p += 4);
      p += sesLen;
    } else {
      packet = this._packetRW.write.alloc(payloadLen);
      p = this._packetRW.write.allocStart;
    }

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 9, p += 14);
    packet.utf8Write('publickey', p += 4, 9);

    packet[p += 9] = (cbSign ? 1 : 0);

    writeUInt32BE(packet, algoLen, ++p);
    packet.utf8Write(keyAlgo, p += 4, algoLen);

    writeUInt32BE(packet, pubKeyLen, p += algoLen);
    packet.set(pubKey, p += 4);

    if (!cbSign) {
      this._authsQueue.push('publickey');

      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (publickey -- check)'
      );
      sendPacket(this, this._packetRW.write.finalize(packet));
      return;
    }

    cbSign(packet, (signature) => {
      signature = convertSignature(signature, keyType);
      if (signature === false)
        throw new Error('Error while converting handshake signature');

      const sigLen = signature.length;
      p = this._packetRW.write.allocStart;
      packet = this._packetRW.write.alloc(
        1 + 4 + userLen + 4 + 14 + 4 + 9 + 1 + 4 + algoLen + 4 + pubKeyLen + 4
          + 4 + algoLen + 4 + sigLen
      );

      // TODO: simply copy from original "packet" to new `packet` to avoid
      // having to write each individual field a second time?
      packet[p] = MESSAGE.USERAUTH_REQUEST;

      writeUInt32BE(packet, userLen, ++p);
      packet.utf8Write(username, p += 4, userLen);

      writeUInt32BE(packet, 14, p += userLen);
      packet.utf8Write('ssh-connection', p += 4, 14);

      writeUInt32BE(packet, 9, p += 14);
      packet.utf8Write('publickey', p += 4, 9);

      packet[p += 9] = 1;

      writeUInt32BE(packet, algoLen, ++p);
      packet.utf8Write(keyAlgo, p += 4, algoLen);

      writeUInt32BE(packet, pubKeyLen, p += algoLen);
      packet.set(pubKey, p += 4);

      writeUInt32BE(packet, 4 + algoLen + 4 + sigLen, p += pubKeyLen);

      writeUInt32BE(packet, algoLen, p += 4);
      packet.utf8Write(keyAlgo, p += 4, algoLen);

      writeUInt32BE(packet, sigLen, p += algoLen);
      packet.set(signature, p += 4);

      // Servers shouldn't send packet type 60 in response to signed publickey
      // attempts, but if they do, interpret as type 60.
      this._authsQueue.push('publickey');

      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (publickey)'
      );
      sendPacket(this, this._packetRW.write.finalize(packet));
    });
  }
  authHostbased(username, pubKey, hostname, userlocal, keyAlgo, cbSign) {
    // TODO: Make DRY by sharing similar code with authPK()
    if (this._server)
      throw new Error('Client-only method called in server mode');

    pubKey = parseKey(pubKey);
    if (pubKey instanceof Error)
      throw new Error('Invalid key');

    const keyType = pubKey.type;
    pubKey = pubKey.getPublicSSH();

    if (typeof keyAlgo === 'function') {
      cbSign = keyAlgo;
      keyAlgo = undefined;
    }
    if (!keyAlgo)
      keyAlgo = keyType;

    const userLen = Buffer.byteLength(username);
    const algoLen = Buffer.byteLength(keyAlgo);
    const pubKeyLen = pubKey.length;
    const sessionID = this._kex.sessionID;
    const sesLen = sessionID.length;
    const hostnameLen = Buffer.byteLength(hostname);
    const userlocalLen = Buffer.byteLength(userlocal);
    const data = Buffer.allocUnsafe(
      4 + sesLen + 1 + 4 + userLen + 4 + 14 + 4 + 9 + 4 + algoLen
        + 4 + pubKeyLen + 4 + hostnameLen + 4 + userlocalLen
    );
    let p = 0;

    writeUInt32BE(data, sesLen, p);
    data.set(sessionID, p += 4);

    data[p += sesLen] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(data, userLen, ++p);
    data.utf8Write(username, p += 4, userLen);

    writeUInt32BE(data, 14, p += userLen);
    data.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(data, 9, p += 14);
    data.utf8Write('hostbased', p += 4, 9);

    writeUInt32BE(data, algoLen, p += 9);
    data.utf8Write(keyAlgo, p += 4, algoLen);

    writeUInt32BE(data, pubKeyLen, p += algoLen);
    data.set(pubKey, p += 4);

    writeUInt32BE(data, hostnameLen, p += pubKeyLen);
    data.utf8Write(hostname, p += 4, hostnameLen);

    writeUInt32BE(data, userlocalLen, p += hostnameLen);
    data.utf8Write(userlocal, p += 4, userlocalLen);

    cbSign(data, (signature) => {
      signature = convertSignature(signature, keyType);
      if (!signature)
        throw new Error('Error while converting handshake signature');

      const sigLen = signature.length;
      const reqDataLen = (data.length - sesLen - 4);
      p = this._packetRW.write.allocStart;
      const packet = this._packetRW.write.alloc(
        reqDataLen + 4 + 4 + algoLen + 4 + sigLen
      );

      bufferCopy(data, packet, 4 + sesLen, data.length, p);

      writeUInt32BE(packet, 4 + algoLen + 4 + sigLen, p += reqDataLen);
      writeUInt32BE(packet, algoLen, p += 4);
      packet.utf8Write(keyAlgo, p += 4, algoLen);
      writeUInt32BE(packet, sigLen, p += algoLen);
      packet.set(signature, p += 4);

      this._authsQueue.push('hostbased');

      this._debug && this._debug(
        'Outbound: Sending USERAUTH_REQUEST (hostbased)'
      );
      sendPacket(this, this._packetRW.write.finalize(packet));
    });
  }
  authKeyboard(username) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const userLen = Buffer.byteLength(username);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + userLen + 4 + 14 + 4 + 20 + 4 + 4
    );

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 20, p += 14);
    packet.utf8Write('keyboard-interactive', p += 4, 20);

    writeUInt32BE(packet, 0, p += 20);

    writeUInt32BE(packet, 0, p += 4);

    this._authsQueue.push('keyboard-interactive');

    this._debug && this._debug(
      'Outbound: Sending USERAUTH_REQUEST (keyboard-interactive)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authNone(username) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const userLen = Buffer.byteLength(username);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + userLen + 4 + 14 + 4 + 4);

    packet[p] = MESSAGE.USERAUTH_REQUEST;

    writeUInt32BE(packet, userLen, ++p);
    packet.utf8Write(username, p += 4, userLen);

    writeUInt32BE(packet, 14, p += userLen);
    packet.utf8Write('ssh-connection', p += 4, 14);

    writeUInt32BE(packet, 4, p += 14);
    packet.utf8Write('none', p += 4, 4);

    this._authsQueue.push('none');

    this._debug && this._debug('Outbound: Sending USERAUTH_REQUEST (none)');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authInfoRes(responses) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    let responsesTotalLen = 0;
    let responseLens;

    if (responses) {
      responseLens = new Array(responses.length);
      for (let i = 0; i < responses.length; ++i) {
        const len = Buffer.byteLength(responses[i]);
        responseLens[i] = len;
        responsesTotalLen += 4 + len;
      }
    }

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + responsesTotalLen);

    packet[p] = MESSAGE.USERAUTH_INFO_RESPONSE;

    if (responses) {
      writeUInt32BE(packet, responses.length, ++p);
      p += 4;
      for (let i = 0; i < responses.length; ++i) {
        const len = responseLens[i];
        writeUInt32BE(packet, len, p);
        p += 4;
        if (len) {
          packet.utf8Write(responses[i], p, len);
          p += len;
        }
      }
    } else {
      writeUInt32BE(packet, 0, ++p);
    }

    this._debug && this._debug('Outbound: Sending USERAUTH_INFO_RESPONSE');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // 'ssh-connection' service-specific
  // ---------------------------------
  tcpipForward(bindAddr, bindPort, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const addrLen = Buffer.byteLength(bindAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 13 + 1 + 4 + addrLen + 4);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 13, ++p);
    packet.utf8Write('tcpip-forward', p += 4, 13);

    packet[p += 13] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, addrLen, ++p);
    packet.utf8Write(bindAddr, p += 4, addrLen);

    writeUInt32BE(packet, bindPort, p += addrLen);

    this._debug
      && this._debug('Outbound: Sending GLOBAL_REQUEST (tcpip-forward)');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  cancelTcpipForward(bindAddr, bindPort, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const addrLen = Buffer.byteLength(bindAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 20 + 1 + 4 + addrLen + 4);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 20, ++p);
    packet.utf8Write('cancel-tcpip-forward', p += 4, 20);

    packet[p += 20] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, addrLen, ++p);
    packet.utf8Write(bindAddr, p += 4, addrLen);

    writeUInt32BE(packet, bindPort, p += addrLen);

    this._debug
      && this._debug('Outbound: Sending GLOBAL_REQUEST (cancel-tcpip-forward)');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_streamLocalForward(socketPath, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const socketPathLen = Buffer.byteLength(socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 31 + 1 + 4 + socketPathLen
    );

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 31, ++p);
    packet.utf8Write('streamlocal-forward@openssh.com', p += 4, 31);

    packet[p += 31] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, socketPathLen, ++p);
    packet.utf8Write(socketPath, p += 4, socketPathLen);

    this._debug && this._debug(
      'Outbound: Sending GLOBAL_REQUEST (streamlocal-forward@openssh.com)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_cancelStreamLocalForward(socketPath, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const socketPathLen = Buffer.byteLength(socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 38 + 1 + 4 + socketPathLen
    );

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 38, ++p);
    packet.utf8Write('cancel-streamlocal-forward@openssh.com', p += 4, 38);

    packet[p += 38] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, socketPathLen, ++p);
    packet.utf8Write(socketPath, p += 4, socketPathLen);

    if (this._debug) {
      this._debug(
        'Outbound: Sending GLOBAL_REQUEST '
          + '(cancel-streamlocal-forward@openssh.com)'
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  directTcpip(chan, initWindow, maxPacket, cfg) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const srcLen = Buffer.byteLength(cfg.srcIP);
    const dstLen = Buffer.byteLength(cfg.dstIP);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 12 + 4 + 4 + 4 + 4 + srcLen + 4 + 4 + dstLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 12, ++p);
    packet.utf8Write('direct-tcpip', p += 4, 12);

    writeUInt32BE(packet, chan, p += 12);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, dstLen, p += 4);
    packet.utf8Write(cfg.dstIP, p += 4, dstLen);

    writeUInt32BE(packet, cfg.dstPort, p += dstLen);

    writeUInt32BE(packet, srcLen, p += 4);
    packet.utf8Write(cfg.srcIP, p += 4, srcLen);

    writeUInt32BE(packet, cfg.srcPort, p += srcLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, direct-tcpip)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_directStreamLocal(chan, initWindow, maxPacket, cfg) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    const pathLen = Buffer.byteLength(cfg.socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 30 + 4 + 4 + 4 + 4 + pathLen + 4 + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 30, ++p);
    packet.utf8Write('direct-streamlocal@openssh.com', p += 4, 30);

    writeUInt32BE(packet, chan, p += 30);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, pathLen, p += 4);
    packet.utf8Write(cfg.socketPath, p += 4, pathLen);

    // zero-fill reserved fields (string and uint32)
    bufferFill(packet, 0, p += pathLen, p + 8);

    if (this._debug) {
      this._debug(
        'Outbound: Sending CHANNEL_OPEN '
          + `(r:${chan}, direct-streamlocal@openssh.com)`
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_noMoreSessions(wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 28 + 1);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 28, ++p);
    packet.utf8Write('no-more-sessions@openssh.com', p += 4, 28);

    packet[p += 28] = (wantReply === undefined || wantReply === true ? 1 : 0);

    this._debug && this._debug(
      'Outbound: Sending GLOBAL_REQUEST (no-more-sessions@openssh.com)'
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  session(chan, initWindow, maxPacket) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 7 + 4 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 7, ++p);
    packet.utf8Write('session', p += 4, 7);

    writeUInt32BE(packet, chan, p += 7);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_OPEN (r:${chan}, session)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  windowChange(chan, rows, cols, height, width) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 13 + 1 + 4 + 4 + 4 + 4
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 13, p += 4);
    packet.utf8Write('window-change', p += 4, 13);

    packet[p += 13] = 0;

    writeUInt32BE(packet, cols, ++p);

    writeUInt32BE(packet, rows, p += 4);

    writeUInt32BE(packet, width, p += 4);

    writeUInt32BE(packet, height, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, window-change)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  pty(chan, rows, cols, height, width, term, modes, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    if (!term || !term.length)
      term = 'vt100';
    if (modes
        && !Buffer.isBuffer(modes)
        && !Array.isArray(modes)
        && typeof modes === 'object'
        && modes !== null) {
      modes = modesToBytes(modes);
    }
    if (!modes || !modes.length)
      modes = NO_TERMINAL_MODES_BUFFER;

    const termLen = term.length;
    const modesLen = modes.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 7 + 1 + 4 + termLen + 4 + 4 + 4 + 4 + 4 + modesLen
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 7, p += 4);
    packet.utf8Write('pty-req', p += 4, 7);

    packet[p += 7] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, termLen, ++p);
    packet.utf8Write(term, p += 4, termLen);

    writeUInt32BE(packet, cols, p += termLen);

    writeUInt32BE(packet, rows, p += 4);

    writeUInt32BE(packet, width, p += 4);

    writeUInt32BE(packet, height, p += 4);

    writeUInt32BE(packet, modesLen, p += 4);
    p += 4;
    if (Array.isArray(modes)) {
      for (let i = 0; i < modesLen; ++i)
        packet[p++] = modes[i];
    } else if (Buffer.isBuffer(modes)) {
      packet.set(modes, p);
    }

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_REQUEST (r:${chan}, pty-req)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  shell(chan, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 5 + 1);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 5, p += 4);
    packet.utf8Write('shell', p += 4, 5);

    packet[p += 5] = (wantReply === undefined || wantReply === true ? 1 : 0);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_REQUEST (r:${chan}, shell)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  exec(chan, cmd, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const isBuf = Buffer.isBuffer(cmd);
    const cmdLen = (isBuf ? cmd.length : Buffer.byteLength(cmd));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 4 + 1 + 4 + cmdLen);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 4, p += 4);
    packet.utf8Write('exec', p += 4, 4);

    packet[p += 4] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, cmdLen, ++p);
    if (isBuf)
      packet.set(cmd, p += 4);
    else
      packet.utf8Write(cmd, p += 4, cmdLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, exec: ${cmd})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  signal(chan, signal) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const origSignal = signal;

    signal = signal.toUpperCase();
    if (signal.slice(0, 3) === 'SIG')
      signal = signal.slice(3);

    if (SIGNALS[signal] !== 1)
      throw new Error(`Invalid signal: ${origSignal}`);

    const signalLen = signal.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 6 + 1 + 4 + signalLen
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 6, p += 4);
    packet.utf8Write('signal', p += 4, 6);

    packet[p += 6] = 0;

    writeUInt32BE(packet, signalLen, ++p);
    packet.utf8Write(signal, p += 4, signalLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, signal: ${signal})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  env(chan, key, val, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const keyLen = Buffer.byteLength(key);
    const isBuf = Buffer.isBuffer(val);
    const valLen = (isBuf ? val.length : Buffer.byteLength(val));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 3 + 1 + 4 + keyLen + 4 + valLen
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 3, p += 4);
    packet.utf8Write('env', p += 4, 3);

    packet[p += 3] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, keyLen, ++p);
    packet.utf8Write(key, p += 4, keyLen);

    writeUInt32BE(packet, valLen, p += keyLen);
    if (isBuf)
      packet.set(val, p += 4);
    else
      packet.utf8Write(val, p += 4, valLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, env: ${key}=${val})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  x11Forward(chan, cfg, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    const protocol = cfg.protocol;
    const cookie = cfg.cookie;
    const isBufProto = Buffer.isBuffer(protocol);
    const protoLen = (isBufProto
                      ? protocol.length
                      : Buffer.byteLength(protocol));
    const isBufCookie = Buffer.isBuffer(cookie);
    const cookieLen = (isBufCookie
                       ? cookie.length
                       : Buffer.byteLength(cookie));
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 7 + 1 + 1 + 4 + protoLen + 4 + cookieLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 7, p += 4);
    packet.utf8Write('x11-req', p += 4, 7);

    packet[p += 7] = (wantReply === undefined || wantReply === true ? 1 : 0);

    packet[++p] = (cfg.single ? 1 : 0);

    writeUInt32BE(packet, protoLen, ++p);
    if (isBufProto)
      packet.set(protocol, p += 4);
    else
      packet.utf8Write(protocol, p += 4, protoLen);

    writeUInt32BE(packet, cookieLen, p += protoLen);
    if (isBufCookie)
      packet.set(cookie, p += 4);
    else
      packet.latin1Write(cookie, p += 4, cookieLen);

    writeUInt32BE(packet, (cfg.screen || 0), p += cookieLen);

    this._debug
      && this._debug(`Outbound: Sending CHANNEL_REQUEST (r:${chan}, x11-req)`);
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  subsystem(chan, name, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space
    const nameLen = Buffer.byteLength(name);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 9 + 1 + 4 + nameLen);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 9, p += 4);
    packet.utf8Write('subsystem', p += 4, 9);

    packet[p += 9] = (wantReply === undefined || wantReply === true ? 1 : 0);

    writeUInt32BE(packet, nameLen, ++p);
    packet.utf8Write(name, p += 4, nameLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, subsystem: ${name})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_agentForward(chan, wantReply) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    // Does not consume window space

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 26 + 1);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 26, p += 4);
    packet.utf8Write('auth-agent-req@openssh.com', p += 4, 26);

    packet[p += 26] = (wantReply === undefined || wantReply === true ? 1 : 0);

    if (this._debug) {
      this._debug(
        'Outbound: Sending CHANNEL_REQUEST '
          + `(r:${chan}, auth-agent-req@openssh.com)`
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_hostKeysProve(keys) {
    if (this._server)
      throw new Error('Client-only method called in server mode');

    let keysTotal = 0;
    const publicKeys = [];
    for (const key of keys) {
      const publicKey = key.getPublicSSH();
      keysTotal += 4 + publicKey.length;
      publicKeys.push(publicKey);
    }

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 29 + 1 + keysTotal);

    packet[p] = MESSAGE.GLOBAL_REQUEST;

    writeUInt32BE(packet, 29, ++p);
    packet.utf8Write('hostkeys-prove-00@openssh.com', p += 4, 29);

    packet[p += 29] = 1; // want reply

    ++p;
    for (const buf of publicKeys) {
      writeUInt32BE(packet, buf.length, p);
      bufferCopy(buf, packet, 0, buf.length, p += 4);
      p += buf.length;
    }

    if (this._debug) {
      this._debug(
        'Outbound: Sending GLOBAL_REQUEST (hostkeys-prove-00@openssh.com)'
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }

  // ===========================================================================
  // Server-specific ===========================================================
  // ===========================================================================

  // Global
  // ------
  serviceAccept(svcName) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const svcNameLen = Buffer.byteLength(svcName);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + svcNameLen);

    packet[p] = MESSAGE.SERVICE_ACCEPT;

    writeUInt32BE(packet, svcNameLen, ++p);
    packet.utf8Write(svcName, p += 4, svcNameLen);

    this._debug && this._debug(`Outbound: Sending SERVICE_ACCEPT (${svcName})`);
    sendPacket(this, this._packetRW.write.finalize(packet));

    if (this._server && this._banner && svcName === 'ssh-userauth') {
      const banner = this._banner;
      this._banner = undefined; // Prevent banner from being displayed again
      const bannerLen = Buffer.byteLength(banner);
      p = this._packetRW.write.allocStart;
      const packet = this._packetRW.write.alloc(1 + 4 + bannerLen + 4);

      packet[p] = MESSAGE.USERAUTH_BANNER;

      writeUInt32BE(packet, bannerLen, ++p);
      packet.utf8Write(banner, p += 4, bannerLen);

      writeUInt32BE(packet, 0, p += bannerLen); // Empty language tag

      this._debug && this._debug('Outbound: Sending USERAUTH_BANNER');
      sendPacket(this, this._packetRW.write.finalize(packet));
    }
  }
  // 'ssh-connection' service-specific
  forwardedTcpip(chan, initWindow, maxPacket, cfg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const boundAddrLen = Buffer.byteLength(cfg.boundAddr);
    const remoteAddrLen = Buffer.byteLength(cfg.remoteAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 15 + 4 + 4 + 4 + 4 + boundAddrLen + 4 + 4 + remoteAddrLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 15, ++p);
    packet.utf8Write('forwarded-tcpip', p += 4, 15);

    writeUInt32BE(packet, chan, p += 15);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, boundAddrLen, p += 4);
    packet.utf8Write(cfg.boundAddr, p += 4, boundAddrLen);

    writeUInt32BE(packet, cfg.boundPort, p += boundAddrLen);

    writeUInt32BE(packet, remoteAddrLen, p += 4);
    packet.utf8Write(cfg.remoteAddr, p += 4, remoteAddrLen);

    writeUInt32BE(packet, cfg.remotePort, p += remoteAddrLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, forwarded-tcpip)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  x11(chan, initWindow, maxPacket, cfg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const addrLen = Buffer.byteLength(cfg.originAddr);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 3 + 4 + 4 + 4 + 4 + addrLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 3, ++p);
    packet.utf8Write('x11', p += 4, 3);

    writeUInt32BE(packet, chan, p += 3);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, addrLen, p += 4);
    packet.utf8Write(cfg.originAddr, p += 4, addrLen);

    writeUInt32BE(packet, cfg.originPort, p += addrLen);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, x11)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_authAgent(chan, initWindow, maxPacket) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 22 + 4 + 4 + 4);

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 22, ++p);
    packet.utf8Write('auth-agent@openssh.com', p += 4, 22);

    writeUInt32BE(packet, chan, p += 22);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_OPEN (r:${chan}, auth-agent@openssh.com)`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  openssh_forwardedStreamLocal(chan, initWindow, maxPacket, cfg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const pathLen = Buffer.byteLength(cfg.socketPath);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 33 + 4 + 4 + 4 + 4 + pathLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_OPEN;

    writeUInt32BE(packet, 33, ++p);
    packet.utf8Write('forwarded-streamlocal@openssh.com', p += 4, 33);

    writeUInt32BE(packet, chan, p += 33);

    writeUInt32BE(packet, initWindow, p += 4);

    writeUInt32BE(packet, maxPacket, p += 4);

    writeUInt32BE(packet, pathLen, p += 4);
    packet.utf8Write(cfg.socketPath, p += 4, pathLen);

    writeUInt32BE(packet, 0, p += pathLen);

    if (this._debug) {
      this._debug(
        'Outbound: Sending CHANNEL_OPEN '
          + `(r:${chan}, forwarded-streamlocal@openssh.com)`
      );
    }
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  exitStatus(chan, status) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    // Does not consume window space
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + 4 + 11 + 1 + 4);

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 11, p += 4);
    packet.utf8Write('exit-status', p += 4, 11);

    packet[p += 11] = 0;

    writeUInt32BE(packet, status, ++p);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, exit-status: ${status})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  exitSignal(chan, name, coreDumped, msg) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    // Does not consume window space

    const origSignal = name;

    if (typeof origSignal !== 'string' || !origSignal)
      throw new Error(`Invalid signal: ${origSignal}`);

    let signal = name.toUpperCase();
    if (signal.slice(0, 3) === 'SIG')
      signal = signal.slice(3);

    if (SIGNALS[signal] !== 1)
      throw new Error(`Invalid signal: ${origSignal}`);

    const nameLen = Buffer.byteLength(signal);
    const msgLen = (msg ? Buffer.byteLength(msg) : 0);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + 4 + 11 + 1 + 4 + nameLen + 1 + 4 + msgLen + 4
    );

    packet[p] = MESSAGE.CHANNEL_REQUEST;

    writeUInt32BE(packet, chan, ++p);

    writeUInt32BE(packet, 11, p += 4);
    packet.utf8Write('exit-signal', p += 4, 11);

    packet[p += 11] = 0;

    writeUInt32BE(packet, nameLen, ++p);
    packet.utf8Write(signal, p += 4, nameLen);

    packet[p += nameLen] = (coreDumped ? 1 : 0);

    writeUInt32BE(packet, msgLen, ++p);

    p += 4;
    if (msgLen) {
      packet.utf8Write(msg, p, msgLen);
      p += msgLen;
    }

    writeUInt32BE(packet, 0, p);

    this._debug && this._debug(
      `Outbound: Sending CHANNEL_REQUEST (r:${chan}, exit-signal: ${name})`
    );
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  // 'ssh-userauth' service-specific
  authFailure(authMethods, isPartial) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    if (this._authsQueue.length === 0)
      throw new Error('No auth in progress');

    let methods;

    if (typeof authMethods === 'boolean') {
      isPartial = authMethods;
      authMethods = undefined;
    }

    if (authMethods) {
      methods = [];
      for (let i = 0; i < authMethods.length; ++i) {
        if (authMethods[i].toLowerCase() === 'none')
          continue;
        methods.push(authMethods[i]);
      }
      methods = methods.join(',');
    } else {
      methods = '';
    }

    const methodsLen = methods.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + methodsLen + 1);

    packet[p] = MESSAGE.USERAUTH_FAILURE;

    writeUInt32BE(packet, methodsLen, ++p);
    packet.utf8Write(methods, p += 4, methodsLen);

    packet[p += methodsLen] = (isPartial === true ? 1 : 0);

    this._authsQueue.shift();

    this._debug && this._debug('Outbound: Sending USERAUTH_FAILURE');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authSuccess() {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    if (this._authsQueue.length === 0)
      throw new Error('No auth in progress');

    const p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1);

    packet[p] = MESSAGE.USERAUTH_SUCCESS;

    this._authsQueue.shift();
    this._authenticated = true;

    this._debug && this._debug('Outbound: Sending USERAUTH_SUCCESS');
    sendPacket(this, this._packetRW.write.finalize(packet));

    if (this._kex.negotiated.cs.compress === 'zlib@openssh.com')
      this._packetRW.read = new ZlibPacketReader();
    if (this._kex.negotiated.sc.compress === 'zlib@openssh.com')
      this._packetRW.write = new ZlibPacketWriter(this);
  }
  authPKOK(keyAlgo, key) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    if (this._authsQueue.length === 0 || this._authsQueue[0] !== 'publickey')
      throw new Error('"publickey" auth not in progress');

    // TODO: support parsed key for `key`

    const keyAlgoLen = Buffer.byteLength(keyAlgo);
    const keyLen = key.length;
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + keyAlgoLen + 4 + keyLen);

    packet[p] = MESSAGE.USERAUTH_PK_OK;

    writeUInt32BE(packet, keyAlgoLen, ++p);
    packet.utf8Write(keyAlgo, p += 4, keyAlgoLen);

    writeUInt32BE(packet, keyLen, p += keyAlgoLen);
    packet.set(key, p += 4);

    this._authsQueue.shift();

    this._debug && this._debug('Outbound: Sending USERAUTH_PK_OK');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authPasswdChg(prompt) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    const promptLen = Buffer.byteLength(prompt);
    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(1 + 4 + promptLen + 4);

    packet[p] = MESSAGE.USERAUTH_PASSWD_CHANGEREQ;

    writeUInt32BE(packet, promptLen, ++p);
    packet.utf8Write(prompt, p += 4, promptLen);

    writeUInt32BE(packet, 0, p += promptLen); // Empty language tag

    this._debug && this._debug('Outbound: Sending USERAUTH_PASSWD_CHANGEREQ');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
  authInfoReq(name, instructions, prompts) {
    if (!this._server)
      throw new Error('Server-only method called in client mode');

    let promptsLen = 0;
    const nameLen = name ? Buffer.byteLength(name) : 0;
    const instrLen = instructions ? Buffer.byteLength(instructions) : 0;

    for (let i = 0; i < prompts.length; ++i)
      promptsLen += 4 + Buffer.byteLength(prompts[i].prompt) + 1;

    let p = this._packetRW.write.allocStart;
    const packet = this._packetRW.write.alloc(
      1 + 4 + nameLen + 4 + instrLen + 4 + 4 + promptsLen
    );

    packet[p] = MESSAGE.USERAUTH_INFO_REQUEST;

    writeUInt32BE(packet, nameLen, ++p);
    p += 4;
    if (name) {
      packet.utf8Write(name, p, nameLen);
      p += nameLen;
    }

    writeUInt32BE(packet, instrLen, p);
    p += 4;
    if (instructions) {
      packet.utf8Write(instructions, p, instrLen);
      p += instrLen;
    }

    writeUInt32BE(packet, 0, p);

    writeUInt32BE(packet, prompts.length, p += 4);
    p += 4;
    for (let i = 0; i < prompts.length; ++i) {
      const prompt = prompts[i];
      const promptLen = Buffer.byteLength(prompt.prompt);

      writeUInt32BE(packet, promptLen, p);
      p += 4;
      if (promptLen) {
        packet.utf8Write(prompt.prompt, p, promptLen);
        p += promptLen;
      }
      packet[p++] = (prompt.echo ? 1 : 0);
    }

    this._debug && this._debug('Outbound: Sending USERAUTH_INFO_REQUEST');
    sendPacket(this, this._packetRW.write.finalize(packet));
  }
}

// SSH-protoversion-softwareversion (SP comments) CR LF
const RE_IDENT = /^SSH-(2\.0|1\.99)-([^ ]+)(?: (.*))?$/;

// TODO: optimize this by starting n bytes from the end of this._buffer instead
// of the beginning
function parseHeader(chunk, p, len) {
  let data;
  let chunkOffset;
  if (this._buffer) {
    data = Buffer.allocUnsafe(this._buffer.length + (len - p));
    data.set(this._buffer, 0);
    if (p === 0) {
      data.set(chunk, this._buffer.length);
    } else {
      data.set(new Uint8Array(chunk.buffer,
                              chunk.byteOffset + p,
                              (len - p)),
               this._buffer.length);
    }
    chunkOffset = this._buffer.length;
    p = 0;
  } else {
    data = chunk;
    chunkOffset = 0;
  }
  const op = p;
  let start = p;
  let end = p;
  let needNL = false;
  let lineLen = 0;
  let lines = 0;
  for (; p < data.length; ++p) {
    const ch = data[p];

    if (ch === 13 /* '\r' */) {
      needNL = true;
      continue;
    }

    if (ch === 10 /* '\n' */) {
      if (end > start
          && end - start > 4
          && data[start] === 83 /* 'S' */
          && data[start + 1] === 83 /* 'S' */
          && data[start + 2] === 72 /* 'H' */
          && data[start + 3] === 45 /* '-' */) {

        const full = data.latin1Slice(op, end + 1);
        const identRaw = (start === op ? full : full.slice(start - op));
        const m = RE_IDENT.exec(identRaw);
        if (!m)
          throw new Error('Invalid identification string');

        const header = {
          greeting: (start === op ? '' : full.slice(0, start - op)),
          identRaw,
          versions: {
            protocol: m[1],
            software: m[2],
          },
          comments: m[3]
        };

        // Needed during handshake
        this._remoteIdentRaw = Buffer.from(identRaw);

        this._debug && this._debug(`Remote ident: ${inspect(identRaw)}`);
        this._compatFlags = getCompatFlags(header);

        this._buffer = undefined;
        this._decipher =
          new NullDecipher(0, onKEXPayload.bind(this, { firstPacket: true }));
        this._parse = parsePacket;

        this._onHeader(header);
        if (!this._destruct) {
          // We disconnected inside _onHeader
          return len;
        }

        kexinit(this);

        return p + 1 - chunkOffset;
      }

      // Only allow pre-ident greetings when we're a client
      if (this._server)
        throw new Error('Greetings from clients not permitted');

      if (++lines > MAX_LINES)
        throw new Error('Max greeting lines exceeded');

      needNL = false;
      start = p + 1;
      lineLen = 0;
    } else if (needNL) {
      throw new Error('Invalid header: expected newline');
    } else if (++lineLen >= MAX_LINE_LEN) {
      throw new Error('Header line too long');
    }

    end = p;
  }
  if (!this._buffer)
    this._buffer = bufferSlice(data, op);

  return p - chunkOffset;
}

function parsePacket(chunk, p, len) {
  return this._decipher.decrypt(chunk, p, len);
}

function onPayload(payload) {
  // XXX: move this to the Decipher implementations?

  this._onPacket();

  if (payload.length === 0) {
    this._debug && this._debug('Inbound: Skipping empty packet payload');
    return;
  }

  payload = this._packetRW.read.read(payload);

  const type = payload[0];
  if (type === MESSAGE.USERAUTH_SUCCESS
      && !this._server
      && !this._authenticated) {
    this._authenticated = true;
    if (this._kex.negotiated.cs.compress === 'zlib@openssh.com')
      this._packetRW.write = new ZlibPacketWriter(this);
    if (this._kex.negotiated.sc.compress === 'zlib@openssh.com')
      this._packetRW.read = new ZlibPacketReader();
  }
  const handler = MESSAGE_HANDLERS[type];
  if (handler === undefined) {
    this._debug && this._debug(`Inbound: Unsupported message type: ${type}`);
    return;
  }

  return handler(this, payload);
}

function getCompatFlags(header) {
  const software = header.versions.software;

  let flags = 0;

  for (const rule of COMPAT_CHECKS) {
    if (typeof rule[0] === 'string') {
      if (software === rule[0])
        flags |= rule[1];
    } else if (rule[0].test(software)) {
      flags |= rule[1];
    }
  }

  return flags;
}

function modesToBytes(modes) {
  const keys = Object.keys(modes);
  const bytes = Buffer.allocUnsafe((5 * keys.length) + 1);
  let b = 0;

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    if (key === 'TTY_OP_END')
      continue;

    const opcode = TERMINAL_MODE[key];
    if (opcode === undefined)
      continue;

    const val = modes[key];
    if (typeof val === 'number' && isFinite(val)) {
      bytes[b++] = opcode;
      bytes[b++] = val >>> 24;
      bytes[b++] = val >>> 16;
      bytes[b++] = val >>> 8;
      bytes[b++] = val;
    }
  }

  bytes[b++] = TERMINAL_MODE.TTY_OP_END;

  if (b < bytes.length)
    return bufferSlice(bytes, 0, b);

  return bytes;
}

function sendExtInfo(proto) {
  let serverSigAlgs =
    'ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521'
      + 'rsa-sha2-512,rsa-sha2-256,ssh-rsa,ssh-dss';
  if (eddsaSupported)
    serverSigAlgs = `ssh-ed25519,${serverSigAlgs}`;
  const algsLen = Buffer.byteLength(serverSigAlgs);

  let p = proto._packetRW.write.allocStart;
  const packet = proto._packetRW.write.alloc(1 + 4 + 4 + 15 + 4 + algsLen);

  packet[p] = MESSAGE.EXT_INFO;

  writeUInt32BE(packet, 1, ++p);

  writeUInt32BE(packet, 15, p += 4);
  packet.utf8Write('server-sig-algs', p += 4, 15);

  writeUInt32BE(packet, algsLen, p += 15);
  packet.utf8Write(serverSigAlgs, p += 4, algsLen);

  proto._debug && proto._debug('Outbound: Sending EXT_INFO');
  sendPacket(proto, proto._packetRW.write.finalize(packet));
}

module.exports = Protocol;
