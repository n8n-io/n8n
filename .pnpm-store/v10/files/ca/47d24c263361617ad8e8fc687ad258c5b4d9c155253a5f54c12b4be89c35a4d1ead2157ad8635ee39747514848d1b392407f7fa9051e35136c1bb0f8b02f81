'use strict';

const {
  createDiffieHellman,
  createDiffieHellmanGroup,
  createECDH,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomFillSync,
} = require('crypto');

const { Ber } = require('asn1');

const {
  COMPAT,
  curve25519Supported,
  DEFAULT_KEX,
  DEFAULT_SERVER_HOST_KEY,
  DEFAULT_CIPHER,
  DEFAULT_MAC,
  DEFAULT_COMPRESSION,
  DISCONNECT_REASON,
  MESSAGE,
} = require('./constants.js');
const {
  CIPHER_INFO,
  createCipher,
  createDecipher,
  MAC_INFO,
} = require('./crypto.js');
const { parseDERKey } = require('./keyParser.js');
const {
  bufferFill,
  bufferParser,
  convertSignature,
  doFatalError,
  FastBuffer,
  sigSSHToASN1,
  writeUInt32BE,
} = require('./utils.js');
const {
  PacketReader,
  PacketWriter,
  ZlibPacketReader,
  ZlibPacketWriter,
} = require('./zlib.js');

let MESSAGE_HANDLERS;

const GEX_MIN_BITS = 2048; // RFC 8270
const GEX_MAX_BITS = 8192; // RFC 8270

const EMPTY_BUFFER = Buffer.alloc(0);

// Client/Server
function kexinit(self) {
  /*
    byte         SSH_MSG_KEXINIT
    byte[16]     cookie (random bytes)
    name-list    kex_algorithms
    name-list    server_host_key_algorithms
    name-list    encryption_algorithms_client_to_server
    name-list    encryption_algorithms_server_to_client
    name-list    mac_algorithms_client_to_server
    name-list    mac_algorithms_server_to_client
    name-list    compression_algorithms_client_to_server
    name-list    compression_algorithms_server_to_client
    name-list    languages_client_to_server
    name-list    languages_server_to_client
    boolean      first_kex_packet_follows
    uint32       0 (reserved for future extension)
  */

  let payload;
  if (self._compatFlags & COMPAT.BAD_DHGEX) {
    const entry = self._offer.lists.kex;
    let kex = entry.array;
    let found = false;
    for (let i = 0; i < kex.length; ++i) {
      if (kex[i].includes('group-exchange')) {
        if (!found) {
          found = true;
          // Copy array lazily
          kex = kex.slice();
        }
        kex.splice(i--, 1);
      }
    }
    if (found) {
      let len = 1 + 16 + self._offer.totalSize + 1 + 4;
      const newKexBuf = Buffer.from(kex.join(','));
      len -= (entry.buffer.length - newKexBuf.length);

      const all = self._offer.lists.all;
      const rest = new Uint8Array(
        all.buffer,
        all.byteOffset + 4 + entry.buffer.length,
        all.length - (4 + entry.buffer.length)
      );

      payload = Buffer.allocUnsafe(len);
      writeUInt32BE(payload, newKexBuf.length, 17);
      payload.set(newKexBuf, 17 + 4);
      payload.set(rest, 17 + 4 + newKexBuf.length);
    }
  }

  if (payload === undefined) {
    payload = Buffer.allocUnsafe(1 + 16 + self._offer.totalSize + 1 + 4);
    self._offer.copyAllTo(payload, 17);
  }

  self._debug && self._debug('Outbound: Sending KEXINIT');

  payload[0] = MESSAGE.KEXINIT;
  randomFillSync(payload, 1, 16);

  // Zero-fill first_kex_packet_follows and reserved bytes
  bufferFill(payload, 0, payload.length - 5);

  self._kexinit = payload;

  // Needed to correct the starting position in allocated "packets" when packets
  // will be buffered due to active key exchange
  self._packetRW.write.allocStart = 0;

  // TODO: only create single buffer and set _kexinit as slice of packet instead
  {
    const p = self._packetRW.write.allocStartKEX;
    const packet = self._packetRW.write.alloc(payload.length, true);
    packet.set(payload, p);
    self._cipher.encrypt(self._packetRW.write.finalize(packet, true));
  }
}

function handleKexInit(self, payload) {
  /*
    byte         SSH_MSG_KEXINIT
    byte[16]     cookie (random bytes)
    name-list    kex_algorithms
    name-list    server_host_key_algorithms
    name-list    encryption_algorithms_client_to_server
    name-list    encryption_algorithms_server_to_client
    name-list    mac_algorithms_client_to_server
    name-list    mac_algorithms_server_to_client
    name-list    compression_algorithms_client_to_server
    name-list    compression_algorithms_server_to_client
    name-list    languages_client_to_server
    name-list    languages_server_to_client
    boolean      first_kex_packet_follows
    uint32       0 (reserved for future extension)
  */
  const init = {
    kex: undefined,
    serverHostKey: undefined,
    cs: {
      cipher: undefined,
      mac: undefined,
      compress: undefined,
      lang: undefined,
    },
    sc: {
      cipher: undefined,
      mac: undefined,
      compress: undefined,
      lang: undefined,
    },
  };

  bufferParser.init(payload, 17);

  if ((init.kex = bufferParser.readList()) === undefined
      || (init.serverHostKey = bufferParser.readList()) === undefined
      || (init.cs.cipher = bufferParser.readList()) === undefined
      || (init.sc.cipher = bufferParser.readList()) === undefined
      || (init.cs.mac = bufferParser.readList()) === undefined
      || (init.sc.mac = bufferParser.readList()) === undefined
      || (init.cs.compress = bufferParser.readList()) === undefined
      || (init.sc.compress = bufferParser.readList()) === undefined
      || (init.cs.lang = bufferParser.readList()) === undefined
      || (init.sc.lang = bufferParser.readList()) === undefined) {
    bufferParser.clear();
    return doFatalError(
      self,
      'Received malformed KEXINIT',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }

  const pos = bufferParser.pos();
  const firstFollows = (pos < payload.length && payload[pos] === 1);
  bufferParser.clear();

  const local = self._offer;
  const remote = init;

  let localKex = local.lists.kex.array;
  if (self._compatFlags & COMPAT.BAD_DHGEX) {
    let found = false;
    for (let i = 0; i < localKex.length; ++i) {
      if (localKex[i].indexOf('group-exchange') !== -1) {
        if (!found) {
          found = true;
          // Copy array lazily
          localKex = localKex.slice();
        }
        localKex.splice(i--, 1);
      }
    }
  }

  let clientList;
  let serverList;
  let i;
  const debug = self._debug;

  debug && debug('Inbound: Handshake in progress');

  // Key exchange method =======================================================
  debug && debug(`Handshake: (local) KEX method: ${localKex}`);
  debug && debug(`Handshake: (remote) KEX method: ${remote.kex}`);
  let remoteExtInfoEnabled;
  if (self._server) {
    serverList = localKex;
    clientList = remote.kex;
    remoteExtInfoEnabled = (clientList.indexOf('ext-info-c') !== -1);
  } else {
    serverList = remote.kex;
    clientList = localKex;
    remoteExtInfoEnabled = (serverList.indexOf('ext-info-s') !== -1);
  }
  if (self._strictMode === undefined) {
    if (self._server) {
      self._strictMode =
        (clientList.indexOf('kex-strict-c-v00@openssh.com') !== -1);
    } else {
      self._strictMode =
        (serverList.indexOf('kex-strict-s-v00@openssh.com') !== -1);
    }
    // Note: We check for seqno of 1 instead of 0 since we increment before
    //       calling the packet handler
    if (self._strictMode) {
      debug && debug('Handshake: strict KEX mode enabled');
      if (self._decipher.inSeqno !== 1) {
        if (debug)
          debug('Handshake: KEXINIT not first packet in strict KEX mode');
        return doFatalError(
          self,
          'Handshake failed: KEXINIT not first packet in strict KEX mode',
          'handshake',
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }
    }
  }
  // Check for agreeable key exchange algorithm
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: no matching key exchange algorithm');
    return doFatalError(
      self,
      'Handshake failed: no matching key exchange algorithm',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.kex = clientList[i];
  debug && debug(`Handshake: KEX algorithm: ${clientList[i]}`);
  if (firstFollows && (!remote.kex.length || clientList[i] !== remote.kex[0])) {
    // Ignore next inbound packet, it was a wrong first guess at KEX algorithm
    self._skipNextInboundPacket = true;
  }


  // Server host key format ====================================================
  const localSrvHostKey = local.lists.serverHostKey.array;
  debug && debug(`Handshake: (local) Host key format: ${localSrvHostKey}`);
  debug && debug(
    `Handshake: (remote) Host key format: ${remote.serverHostKey}`
  );
  if (self._server) {
    serverList = localSrvHostKey;
    clientList = remote.serverHostKey;
  } else {
    serverList = remote.serverHostKey;
    clientList = localSrvHostKey;
  }
  // Check for agreeable server host key format
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching host key format');
    return doFatalError(
      self,
      'Handshake failed: no matching host key format',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.serverHostKey = clientList[i];
  debug && debug(`Handshake: Host key format: ${clientList[i]}`);


  // Client->Server cipher =====================================================
  const localCSCipher = local.lists.cs.cipher.array;
  debug && debug(`Handshake: (local) C->S cipher: ${localCSCipher}`);
  debug && debug(`Handshake: (remote) C->S cipher: ${remote.cs.cipher}`);
  if (self._server) {
    serverList = localCSCipher;
    clientList = remote.cs.cipher;
  } else {
    serverList = remote.cs.cipher;
    clientList = localCSCipher;
  }
  // Check for agreeable client->server cipher
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching C->S cipher');
    return doFatalError(
      self,
      'Handshake failed: no matching C->S cipher',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.cs.cipher = clientList[i];
  debug && debug(`Handshake: C->S Cipher: ${clientList[i]}`);


  // Server->Client cipher =====================================================
  const localSCCipher = local.lists.sc.cipher.array;
  debug && debug(`Handshake: (local) S->C cipher: ${localSCCipher}`);
  debug && debug(`Handshake: (remote) S->C cipher: ${remote.sc.cipher}`);
  if (self._server) {
    serverList = localSCCipher;
    clientList = remote.sc.cipher;
  } else {
    serverList = remote.sc.cipher;
    clientList = localSCCipher;
  }
  // Check for agreeable server->client cipher
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching S->C cipher');
    return doFatalError(
      self,
      'Handshake failed: no matching S->C cipher',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.sc.cipher = clientList[i];
  debug && debug(`Handshake: S->C cipher: ${clientList[i]}`);


  // Client->Server MAC ========================================================
  const localCSMAC = local.lists.cs.mac.array;
  debug && debug(`Handshake: (local) C->S MAC: ${localCSMAC}`);
  debug && debug(`Handshake: (remote) C->S MAC: ${remote.cs.mac}`);
  if (CIPHER_INFO[init.cs.cipher].authLen > 0) {
    init.cs.mac = '';
    debug && debug('Handshake: C->S MAC: <implicit>');
  } else {
    if (self._server) {
      serverList = localCSMAC;
      clientList = remote.cs.mac;
    } else {
      serverList = remote.cs.mac;
      clientList = localCSMAC;
    }
    // Check for agreeable client->server hmac algorithm
    for (i = 0;
         i < clientList.length && serverList.indexOf(clientList[i]) === -1;
         ++i);
    if (i === clientList.length) {
      // No suitable match found!
      debug && debug('Handshake: No matching C->S MAC');
      return doFatalError(
        self,
        'Handshake failed: no matching C->S MAC',
        'handshake',
        DISCONNECT_REASON.KEY_EXCHANGE_FAILED
      );
    }
    init.cs.mac = clientList[i];
    debug && debug(`Handshake: C->S MAC: ${clientList[i]}`);
  }


  // Server->Client MAC ========================================================
  const localSCMAC = local.lists.sc.mac.array;
  debug && debug(`Handshake: (local) S->C MAC: ${localSCMAC}`);
  debug && debug(`Handshake: (remote) S->C MAC: ${remote.sc.mac}`);
  if (CIPHER_INFO[init.sc.cipher].authLen > 0) {
    init.sc.mac = '';
    debug && debug('Handshake: S->C MAC: <implicit>');
  } else {
    if (self._server) {
      serverList = localSCMAC;
      clientList = remote.sc.mac;
    } else {
      serverList = remote.sc.mac;
      clientList = localSCMAC;
    }
    // Check for agreeable server->client hmac algorithm
    for (i = 0;
         i < clientList.length && serverList.indexOf(clientList[i]) === -1;
         ++i);
    if (i === clientList.length) {
      // No suitable match found!
      debug && debug('Handshake: No matching S->C MAC');
      return doFatalError(
        self,
        'Handshake failed: no matching S->C MAC',
        'handshake',
        DISCONNECT_REASON.KEY_EXCHANGE_FAILED
      );
    }
    init.sc.mac = clientList[i];
    debug && debug(`Handshake: S->C MAC: ${clientList[i]}`);
  }


  // Client->Server compression ================================================
  const localCSCompress = local.lists.cs.compress.array;
  debug && debug(`Handshake: (local) C->S compression: ${localCSCompress}`);
  debug && debug(`Handshake: (remote) C->S compression: ${remote.cs.compress}`);
  if (self._server) {
    serverList = localCSCompress;
    clientList = remote.cs.compress;
  } else {
    serverList = remote.cs.compress;
    clientList = localCSCompress;
  }
  // Check for agreeable client->server compression algorithm
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching C->S compression');
    return doFatalError(
      self,
      'Handshake failed: no matching C->S compression',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.cs.compress = clientList[i];
  debug && debug(`Handshake: C->S compression: ${clientList[i]}`);


  // Server->Client compression ================================================
  const localSCCompress = local.lists.sc.compress.array;
  debug && debug(`Handshake: (local) S->C compression: ${localSCCompress}`);
  debug && debug(`Handshake: (remote) S->C compression: ${remote.sc.compress}`);
  if (self._server) {
    serverList = localSCCompress;
    clientList = remote.sc.compress;
  } else {
    serverList = remote.sc.compress;
    clientList = localSCCompress;
  }
  // Check for agreeable server->client compression algorithm
  for (i = 0;
       i < clientList.length && serverList.indexOf(clientList[i]) === -1;
       ++i);
  if (i === clientList.length) {
    // No suitable match found!
    debug && debug('Handshake: No matching S->C compression');
    return doFatalError(
      self,
      'Handshake failed: no matching S->C compression',
      'handshake',
      DISCONNECT_REASON.KEY_EXCHANGE_FAILED
    );
  }
  init.sc.compress = clientList[i];
  debug && debug(`Handshake: S->C compression: ${clientList[i]}`);

  init.cs.lang = '';
  init.sc.lang = '';

  // XXX: hack -- find a better way to do this
  if (self._kex) {
    if (!self._kexinit) {
      // We received a rekey request, but we haven't sent a KEXINIT in response
      // yet
      kexinit(self);
    }
    self._decipher._onPayload = onKEXPayload.bind(self, { firstPacket: false });
  }

  self._kex = createKeyExchange(init, self, payload);
  self._kex.remoteExtInfoEnabled = remoteExtInfoEnabled;
  self._kex.start();
}

const createKeyExchange = (() => {
  function convertToMpint(buf) {
    let idx = 0;
    let length = buf.length;
    while (buf[idx] === 0x00) {
      ++idx;
      --length;
    }
    let newBuf;
    if (buf[idx] & 0x80) {
      newBuf = Buffer.allocUnsafe(1 + length);
      newBuf[0] = 0;
      buf.copy(newBuf, 1, idx);
      buf = newBuf;
    } else if (length !== buf.length) {
      newBuf = Buffer.allocUnsafe(length);
      buf.copy(newBuf, 0, idx);
      buf = newBuf;
    }
    return buf;
  }

  class KeyExchange {
    constructor(negotiated, protocol, remoteKexinit) {
      this._protocol = protocol;

      this.sessionID = (protocol._kex ? protocol._kex.sessionID : undefined);
      this.negotiated = negotiated;
      this.remoteExtInfoEnabled = false;
      this._step = 1;
      this._public = null;
      this._dh = null;
      this._sentNEWKEYS = false;
      this._receivedNEWKEYS = false;
      this._finished = false;
      this._hostVerified = false;

      // Data needed for initializing cipher/decipher/etc.
      this._kexinit = protocol._kexinit;
      this._remoteKexinit = remoteKexinit;
      this._identRaw = protocol._identRaw;
      this._remoteIdentRaw = protocol._remoteIdentRaw;
      this._hostKey = undefined;
      this._dhData = undefined;
      this._sig = undefined;
    }
    finish(scOnly) {
      if (this._finished)
        return false;
      this._finished = true;

      const isServer = this._protocol._server;
      const negotiated = this.negotiated;

      const pubKey = this.convertPublicKey(this._dhData);
      let secret = this.computeSecret(this._dhData);
      if (secret instanceof Error) {
        secret.message =
          `Error while computing DH secret (${this.type}): ${secret.message}`;
        secret.level = 'handshake';
        return doFatalError(
          this._protocol,
          secret,
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }

      const hash = createHash(this.hashName);
      // V_C
      hashString(hash, (isServer ? this._remoteIdentRaw : this._identRaw));
      // "V_S"
      hashString(hash, (isServer ? this._identRaw : this._remoteIdentRaw));
      // "I_C"
      hashString(hash, (isServer ? this._remoteKexinit : this._kexinit));
      // "I_S"
      hashString(hash, (isServer ? this._kexinit : this._remoteKexinit));
      // "K_S"
      const serverPublicHostKey = (isServer
                                   ? this._hostKey.getPublicSSH()
                                   : this._hostKey);
      hashString(hash, serverPublicHostKey);

      if (this.type === 'groupex') {
        // Group exchange-specific
        const params = this.getDHParams();
        const num = Buffer.allocUnsafe(4);
        // min (uint32)
        writeUInt32BE(num, this._minBits, 0);
        hash.update(num);
        // preferred (uint32)
        writeUInt32BE(num, this._prefBits, 0);
        hash.update(num);
        // max (uint32)
        writeUInt32BE(num, this._maxBits, 0);
        hash.update(num);
        // prime
        hashString(hash, params.prime);
        // generator
        hashString(hash, params.generator);
      }

      // method-specific data sent by client
      hashString(hash, (isServer ? pubKey : this.getPublicKey()));
      // method-specific data sent by server
      const serverPublicKey = (isServer ? this.getPublicKey() : pubKey);
      hashString(hash, serverPublicKey);
      // shared secret ("K")
      hashString(hash, secret);

      // "H"
      const exchangeHash = hash.digest();

      if (!isServer) {
        bufferParser.init(this._sig, 0);
        const sigType = bufferParser.readString(true);

        if (!sigType) {
          return doFatalError(
            this._protocol,
            'Malformed packet while reading signature',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        if (sigType !== negotiated.serverHostKey) {
          return doFatalError(
            this._protocol,
            `Wrong signature type: ${sigType}, `
              + `expected: ${negotiated.serverHostKey}`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        // "s"
        let sigValue = bufferParser.readString();

        bufferParser.clear();

        if (sigValue === undefined) {
          return doFatalError(
            this._protocol,
            'Malformed packet while reading signature',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        if (!(sigValue = sigSSHToASN1(sigValue, sigType))) {
          return doFatalError(
            this._protocol,
            'Malformed signature',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        let parsedHostKey;
        {
          bufferParser.init(this._hostKey, 0);
          const name = bufferParser.readString(true);
          const hostKey = this._hostKey.slice(bufferParser.pos());
          bufferParser.clear();
          parsedHostKey = parseDERKey(hostKey, name);
          if (parsedHostKey instanceof Error) {
            parsedHostKey.level = 'handshake';
            return doFatalError(
              this._protocol,
              parsedHostKey,
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
        }

        let hashAlgo;
        // Check if we need to override the default hash algorithm
        switch (this.negotiated.serverHostKey) {
          case 'rsa-sha2-256': hashAlgo = 'sha256'; break;
          case 'rsa-sha2-512': hashAlgo = 'sha512'; break;
        }

        this._protocol._debug
          && this._protocol._debug('Verifying signature ...');

        const verified = parsedHostKey.verify(exchangeHash, sigValue, hashAlgo);
        if (verified !== true) {
          if (verified instanceof Error) {
            this._protocol._debug && this._protocol._debug(
              `Signature verification failed: ${verified.stack}`
            );
          } else {
            this._protocol._debug && this._protocol._debug(
              'Signature verification failed'
            );
          }
          return doFatalError(
            this._protocol,
            'Handshake failed: signature verification failed',
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }
        this._protocol._debug && this._protocol._debug('Verified signature');
      } else {
        // Server

        let hashAlgo;
        // Check if we need to override the default hash algorithm
        switch (this.negotiated.serverHostKey) {
          case 'rsa-sha2-256': hashAlgo = 'sha256'; break;
          case 'rsa-sha2-512': hashAlgo = 'sha512'; break;
        }

        this._protocol._debug && this._protocol._debug(
          'Generating signature ...'
        );

        let signature = this._hostKey.sign(exchangeHash, hashAlgo);
        if (signature instanceof Error) {
          return doFatalError(
            this._protocol,
            'Handshake failed: signature generation failed for '
              + `${this._hostKey.type} host key: ${signature.message}`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        signature = convertSignature(signature, this._hostKey.type);
        if (signature === false) {
          return doFatalError(
            this._protocol,
            'Handshake failed: signature conversion failed for '
              + `${this._hostKey.type} host key`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
        }

        // Send KEX reply
        /*
          byte      SSH_MSG_KEXDH_REPLY
                      / SSH_MSG_KEX_DH_GEX_REPLY
                      / SSH_MSG_KEX_ECDH_REPLY
          string    server public host key and certificates (K_S)
          string    <method-specific data>
          string    signature of H
        */
        const sigType = this.negotiated.serverHostKey;
        const sigTypeLen = Buffer.byteLength(sigType);
        const sigLen = 4 + sigTypeLen + 4 + signature.length;
        let p = this._protocol._packetRW.write.allocStartKEX;
        const packet = this._protocol._packetRW.write.alloc(
          1
            + 4 + serverPublicHostKey.length
            + 4 + serverPublicKey.length
            + 4 + sigLen,
          true
        );

        packet[p] = MESSAGE.KEXDH_REPLY;

        writeUInt32BE(packet, serverPublicHostKey.length, ++p);
        packet.set(serverPublicHostKey, p += 4);

        writeUInt32BE(packet,
                      serverPublicKey.length,
                      p += serverPublicHostKey.length);
        packet.set(serverPublicKey, p += 4);

        writeUInt32BE(packet, sigLen, p += serverPublicKey.length);

        writeUInt32BE(packet, sigTypeLen, p += 4);
        packet.utf8Write(sigType, p += 4, sigTypeLen);

        writeUInt32BE(packet, signature.length, p += sigTypeLen);
        packet.set(signature, p += 4);

        if (this._protocol._debug) {
          let type;
          switch (this.type) {
            case 'group':
              type = 'KEXDH_REPLY';
              break;
            case 'groupex':
              type = 'KEXDH_GEX_REPLY';
              break;
            default:
              type = 'KEXECDH_REPLY';
          }
          this._protocol._debug(`Outbound: Sending ${type}`);
        }
        this._protocol._cipher.encrypt(
          this._protocol._packetRW.write.finalize(packet, true)
        );
      }

      if (isServer || !scOnly)
        trySendNEWKEYS(this);

      let hsCipherConfig;
      let hsWrite;
      const completeHandshake = (partial) => {
        if (hsCipherConfig) {
          trySendNEWKEYS(this);
          hsCipherConfig.outbound.seqno = this._protocol._cipher.outSeqno;
          this._protocol._cipher.free();
          this._protocol._cipher = createCipher(hsCipherConfig);
          this._protocol._packetRW.write = hsWrite;
          hsCipherConfig = undefined;
          hsWrite = undefined;
          this._protocol._onHandshakeComplete(negotiated);

          return false;
        }

        if (!this.sessionID)
          this.sessionID = exchangeHash;

        {
          const newSecret = Buffer.allocUnsafe(4 + secret.length);
          writeUInt32BE(newSecret, secret.length, 0);
          newSecret.set(secret, 4);
          secret = newSecret;
        }

        // Initialize new ciphers, deciphers, etc.

        const csCipherInfo = CIPHER_INFO[negotiated.cs.cipher];
        const scCipherInfo = CIPHER_INFO[negotiated.sc.cipher];

        const csIV = generateKEXVal(csCipherInfo.ivLen,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'A');
        const scIV = generateKEXVal(scCipherInfo.ivLen,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'B');
        const csKey = generateKEXVal(csCipherInfo.keyLen,
                                     this.hashName,
                                     secret,
                                     exchangeHash,
                                     this.sessionID,
                                     'C');
        const scKey = generateKEXVal(scCipherInfo.keyLen,
                                     this.hashName,
                                     secret,
                                     exchangeHash,
                                     this.sessionID,
                                     'D');
        let csMacInfo;
        let csMacKey;
        if (!csCipherInfo.authLen) {
          csMacInfo = MAC_INFO[negotiated.cs.mac];
          csMacKey = generateKEXVal(csMacInfo.len,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'E');
        }
        let scMacInfo;
        let scMacKey;
        if (!scCipherInfo.authLen) {
          scMacInfo = MAC_INFO[negotiated.sc.mac];
          scMacKey = generateKEXVal(scMacInfo.len,
                                    this.hashName,
                                    secret,
                                    exchangeHash,
                                    this.sessionID,
                                    'F');
        }

        const config = {
          inbound: {
            onPayload: this._protocol._onPayload,
            seqno: this._protocol._decipher.inSeqno,
            decipherInfo: (!isServer ? scCipherInfo : csCipherInfo),
            decipherIV: (!isServer ? scIV : csIV),
            decipherKey: (!isServer ? scKey : csKey),
            macInfo: (!isServer ? scMacInfo : csMacInfo),
            macKey: (!isServer ? scMacKey : csMacKey),
          },
          outbound: {
            onWrite: this._protocol._onWrite,
            seqno: this._protocol._cipher.outSeqno,
            cipherInfo: (isServer ? scCipherInfo : csCipherInfo),
            cipherIV: (isServer ? scIV : csIV),
            cipherKey: (isServer ? scKey : csKey),
            macInfo: (isServer ? scMacInfo : csMacInfo),
            macKey: (isServer ? scMacKey : csMacKey),
          },
        };
        this._protocol._decipher.free();
        hsCipherConfig = config;
        this._protocol._decipher = createDecipher(config);

        const rw = {
          read: undefined,
          write: undefined,
        };
        switch (negotiated.cs.compress) {
          case 'zlib': // starts immediately
            if (isServer)
              rw.read = new ZlibPacketReader();
            else
              rw.write = new ZlibPacketWriter(this._protocol);
            break;
          case 'zlib@openssh.com':
            // Starts after successful user authentication

            if (this._protocol._authenticated) {
              // If a rekey happens and this compression method is selected and
              // we already authenticated successfully, we need to start
              // immediately instead
              if (isServer)
                rw.read = new ZlibPacketReader();
              else
                rw.write = new ZlibPacketWriter(this._protocol);
              break;
            }
          // FALLTHROUGH
          default:
            // none -- never any compression/decompression

            if (isServer)
              rw.read = new PacketReader();
            else
              rw.write = new PacketWriter(this._protocol);
        }
        switch (negotiated.sc.compress) {
          case 'zlib': // starts immediately
            if (isServer)
              rw.write = new ZlibPacketWriter(this._protocol);
            else
              rw.read = new ZlibPacketReader();
            break;
          case 'zlib@openssh.com':
            // Starts after successful user authentication

            if (this._protocol._authenticated) {
              // If a rekey happens and this compression method is selected and
              // we already authenticated successfully, we need to start
              // immediately instead
              if (isServer)
                rw.write = new ZlibPacketWriter(this._protocol);
              else
                rw.read = new ZlibPacketReader();
              break;
            }
          // FALLTHROUGH
          default:
            // none -- never any compression/decompression

            if (isServer)
              rw.write = new PacketWriter(this._protocol);
            else
              rw.read = new PacketReader();
        }
        this._protocol._packetRW.read.cleanup();
        this._protocol._packetRW.write.cleanup();
        this._protocol._packetRW.read = rw.read;
        hsWrite = rw.write;

        // Cleanup/reset various state
        this._public = null;
        this._dh = null;
        this._kexinit = this._protocol._kexinit = undefined;
        this._remoteKexinit = undefined;
        this._identRaw = undefined;
        this._remoteIdentRaw = undefined;
        this._hostKey = undefined;
        this._dhData = undefined;
        this._sig = undefined;

        if (!partial)
          return completeHandshake();
        return false;
      };

      if (isServer || scOnly)
        this.finish = completeHandshake;

      if (!isServer)
        return completeHandshake(scOnly);
    }

    start() {
      if (!this._protocol._server) {
        if (this._protocol._debug) {
          let type;
          switch (this.type) {
            case 'group':
              type = 'KEXDH_INIT';
              break;
            default:
              type = 'KEXECDH_INIT';
          }
          this._protocol._debug(`Outbound: Sending ${type}`);
        }

        const pubKey = this.getPublicKey();

        let p = this._protocol._packetRW.write.allocStartKEX;
        const packet = this._protocol._packetRW.write.alloc(
          1 + 4 + pubKey.length,
          true
        );
        packet[p] = MESSAGE.KEXDH_INIT;
        writeUInt32BE(packet, pubKey.length, ++p);
        packet.set(pubKey, p += 4);
        this._protocol._cipher.encrypt(
          this._protocol._packetRW.write.finalize(packet, true)
        );
      }
    }
    getPublicKey() {
      this.generateKeys();

      const key = this._public;

      if (key)
        return this.convertPublicKey(key);
    }
    convertPublicKey(key) {
      let newKey;
      let idx = 0;
      let len = key.length;
      while (key[idx] === 0x00) {
        ++idx;
        --len;
      }

      if (key[idx] & 0x80) {
        newKey = Buffer.allocUnsafe(1 + len);
        newKey[0] = 0;
        key.copy(newKey, 1, idx);
        return newKey;
      }

      if (len !== key.length) {
        newKey = Buffer.allocUnsafe(len);
        key.copy(newKey, 0, idx);
        key = newKey;
      }
      return key;
    }
    computeSecret(otherPublicKey) {
      this.generateKeys();

      try {
        return convertToMpint(this._dh.computeSecret(otherPublicKey));
      } catch (ex) {
        return ex;
      }
    }
    parse(payload) {
      const type = payload[0];
      switch (this._step) {
        case 1:
          if (this._protocol._server) {
            // Server
            if (type !== MESSAGE.KEXDH_INIT) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of ${MESSAGE.KEXDH_INIT}`,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Received DH Init'
            );
            /*
              byte     SSH_MSG_KEXDH_INIT
                         / SSH_MSG_KEX_ECDH_INIT
              string   <method-specific data>
            */
            bufferParser.init(payload, 1);
            const dhData = bufferParser.readString();
            bufferParser.clear();
            if (dhData === undefined) {
              return doFatalError(
                this._protocol,
                'Received malformed KEX*_INIT',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }

            // Client public key
            this._dhData = dhData;

            let hostKey =
              this._protocol._hostKeys[this.negotiated.serverHostKey];
            if (Array.isArray(hostKey))
              hostKey = hostKey[0];
            this._hostKey = hostKey;

            this.finish();
          } else {
            // Client
            if (type !== MESSAGE.KEXDH_REPLY) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of ${MESSAGE.KEXDH_REPLY}`,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Received DH Reply'
            );
            /*
              byte      SSH_MSG_KEXDH_REPLY
                          / SSH_MSG_KEX_DH_GEX_REPLY
                          / SSH_MSG_KEX_ECDH_REPLY
              string    server public host key and certificates (K_S)
              string    <method-specific data>
              string    signature of H
            */
            bufferParser.init(payload, 1);
            let hostPubKey;
            let dhData;
            let sig;
            if ((hostPubKey = bufferParser.readString()) === undefined
                || (dhData = bufferParser.readString()) === undefined
                || (sig = bufferParser.readString()) === undefined) {
              bufferParser.clear();
              return doFatalError(
                this._protocol,
                'Received malformed KEX*_REPLY',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            bufferParser.clear();

            // Check that the host public key type matches what was negotiated
            // during KEXINIT swap
            bufferParser.init(hostPubKey, 0);
            const hostPubKeyType = bufferParser.readString(true);
            bufferParser.clear();
            if (hostPubKeyType === undefined) {
              return doFatalError(
                this._protocol,
                'Received malformed host public key',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            if (hostPubKeyType !== this.negotiated.serverHostKey) {
              // Check if we need to make an exception
              switch (this.negotiated.serverHostKey) {
                case 'rsa-sha2-256':
                case 'rsa-sha2-512':
                  if (hostPubKeyType === 'ssh-rsa')
                    break;
                // FALLTHROUGH
                default:
                  return doFatalError(
                    this._protocol,
                    'Host key does not match negotiated type',
                    'handshake',
                    DISCONNECT_REASON.KEY_EXCHANGE_FAILED
                  );
              }
            }

            this._hostKey = hostPubKey;
            this._dhData = dhData;
            this._sig = sig;

            let checked = false;
            let ret;
            if (this._protocol._hostVerifier === undefined) {
              ret = true;
              this._protocol._debug && this._protocol._debug(
                'Host accepted by default (no verification)'
              );
            } else {
              ret = this._protocol._hostVerifier(hostPubKey, (permitted) => {
                if (checked)
                  return;
                checked = true;
                if (permitted === false) {
                  this._protocol._debug && this._protocol._debug(
                    'Host denied (verification failed)'
                  );
                  return doFatalError(
                    this._protocol,
                    'Host denied (verification failed)',
                    'handshake',
                    DISCONNECT_REASON.KEY_EXCHANGE_FAILED
                  );
                }
                this._protocol._debug && this._protocol._debug(
                  'Host accepted (verified)'
                );
                this._hostVerified = true;
                if (this._receivedNEWKEYS)
                  this.finish();
                else
                  trySendNEWKEYS(this);
              });
            }
            if (ret === undefined) {
              // Async host verification
              ++this._step;
              return;
            }
            checked = true;
            if (ret === false) {
              this._protocol._debug && this._protocol._debug(
                'Host denied (verification failed)'
              );
              return doFatalError(
                this._protocol,
                'Host denied (verification failed)',
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Host accepted (verified)'
            );
            this._hostVerified = true;
            trySendNEWKEYS(this);
          }
          ++this._step;
          break;
        case 2:
          if (type !== MESSAGE.NEWKEYS) {
            return doFatalError(
              this._protocol,
              `Received packet ${type} instead of ${MESSAGE.NEWKEYS}`,
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
          this._protocol._debug && this._protocol._debug(
            'Inbound: NEWKEYS'
          );
          this._receivedNEWKEYS = true;
          if (this._protocol._strictMode)
            this._protocol._decipher.inSeqno = 0;
          ++this._step;

          return this.finish(!this._protocol._server && !this._hostVerified);
        default:
          return doFatalError(
            this._protocol,
            `Received unexpected packet ${type} after NEWKEYS`,
            'handshake',
            DISCONNECT_REASON.KEY_EXCHANGE_FAILED
          );
      }
    }
  }

  class Curve25519Exchange extends KeyExchange {
    constructor(hashName, ...args) {
      super(...args);

      this.type = '25519';
      this.hashName = hashName;
      this._keys = null;
    }
    generateKeys() {
      if (!this._keys)
        this._keys = generateKeyPairSync('x25519');
    }
    getPublicKey() {
      this.generateKeys();

      const key = this._keys.publicKey.export({ type: 'spki', format: 'der' });
      return key.slice(-32); // HACK: avoids parsing DER/BER header
    }
    convertPublicKey(key) {
      let newKey;
      let idx = 0;
      let len = key.length;
      while (key[idx] === 0x00) {
        ++idx;
        --len;
      }

      if (key.length === 32)
        return key;

      if (len !== key.length) {
        newKey = Buffer.allocUnsafe(len);
        key.copy(newKey, 0, idx);
        key = newKey;
      }
      return key;
    }
    computeSecret(otherPublicKey) {
      this.generateKeys();

      try {
        const asnWriter = new Ber.Writer();
        asnWriter.startSequence();
          // algorithm
          asnWriter.startSequence();
            asnWriter.writeOID('1.3.101.110'); // id-X25519
          asnWriter.endSequence();

          // PublicKey
          asnWriter.startSequence(Ber.BitString);
            asnWriter.writeByte(0x00);
            // XXX: hack to write a raw buffer without a tag -- yuck
            asnWriter._ensure(otherPublicKey.length);
            otherPublicKey.copy(asnWriter._buf,
                                asnWriter._offset,
                                0,
                                otherPublicKey.length);
            asnWriter._offset += otherPublicKey.length;
          asnWriter.endSequence();
        asnWriter.endSequence();

        return convertToMpint(diffieHellman({
          privateKey: this._keys.privateKey,
          publicKey: createPublicKey({
            key: asnWriter.buffer,
            type: 'spki',
            format: 'der',
          }),
        }));
      } catch (ex) {
        return ex;
      }
    }
  }

  class ECDHExchange extends KeyExchange {
    constructor(curveName, hashName, ...args) {
      super(...args);

      this.type = 'ecdh';
      this.curveName = curveName;
      this.hashName = hashName;
    }
    generateKeys() {
      if (!this._dh) {
        this._dh = createECDH(this.curveName);
        this._public = this._dh.generateKeys();
      }
    }
  }

  class DHGroupExchange extends KeyExchange {
    constructor(hashName, ...args) {
      super(...args);

      this.type = 'groupex';
      this.hashName = hashName;
      this._prime = null;
      this._generator = null;
      this._minBits = GEX_MIN_BITS;
      this._prefBits = dhEstimate(this.negotiated);
      if (this._protocol._compatFlags & COMPAT.BUG_DHGEX_LARGE)
        this._prefBits = Math.min(this._prefBits, 4096);
      this._maxBits = GEX_MAX_BITS;
    }
    start() {
      if (this._protocol._server)
        return;
      this._protocol._debug && this._protocol._debug(
        'Outbound: Sending KEXDH_GEX_REQUEST'
      );
      let p = this._protocol._packetRW.write.allocStartKEX;
      const packet = this._protocol._packetRW.write.alloc(
        1 + 4 + 4 + 4,
        true
      );
      packet[p] = MESSAGE.KEXDH_GEX_REQUEST;
      writeUInt32BE(packet, this._minBits, ++p);
      writeUInt32BE(packet, this._prefBits, p += 4);
      writeUInt32BE(packet, this._maxBits, p += 4);
      this._protocol._cipher.encrypt(
        this._protocol._packetRW.write.finalize(packet, true)
      );
    }
    generateKeys() {
      if (!this._dh && this._prime && this._generator) {
        this._dh = createDiffieHellman(this._prime, this._generator);
        this._public = this._dh.generateKeys();
      }
    }
    setDHParams(prime, generator) {
      if (!Buffer.isBuffer(prime))
        throw new Error('Invalid prime value');
      if (!Buffer.isBuffer(generator))
        throw new Error('Invalid generator value');
      this._prime = prime;
      this._generator = generator;
    }
    getDHParams() {
      if (this._dh) {
        return {
          prime: convertToMpint(this._dh.getPrime()),
          generator: convertToMpint(this._dh.getGenerator()),
        };
      }
    }
    parse(payload) {
      const type = payload[0];
      switch (this._step) {
        case 1: {
          if (this._protocol._server) {
            if (type !== MESSAGE.KEXDH_GEX_REQUEST) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of `
                  + MESSAGE.KEXDH_GEX_REQUEST,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            // TODO: allow user implementation to provide safe prime and
            // generator on demand to support group exchange on server side
            return doFatalError(
              this._protocol,
              'Group exchange not implemented for server',
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }

          if (type !== MESSAGE.KEXDH_GEX_GROUP) {
            return doFatalError(
              this._protocol,
              `Received packet ${type} instead of ${MESSAGE.KEXDH_GEX_GROUP}`,
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }

          this._protocol._debug && this._protocol._debug(
            'Received DH GEX Group'
          );

          /*
            byte    SSH_MSG_KEX_DH_GEX_GROUP
            mpint   p, safe prime
            mpint   g, generator for subgroup in GF(p)
          */
          bufferParser.init(payload, 1);
          let prime;
          let gen;
          if ((prime = bufferParser.readString()) === undefined
              || (gen = bufferParser.readString()) === undefined) {
            bufferParser.clear();
            return doFatalError(
              this._protocol,
              'Received malformed KEXDH_GEX_GROUP',
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
          bufferParser.clear();

          // TODO: validate prime
          this.setDHParams(prime, gen);
          this.generateKeys();
          const pubkey = this.getPublicKey();

          this._protocol._debug && this._protocol._debug(
            'Outbound: Sending KEXDH_GEX_INIT'
          );

          let p = this._protocol._packetRW.write.allocStartKEX;
          const packet =
            this._protocol._packetRW.write.alloc(1 + 4 + pubkey.length, true);
          packet[p] = MESSAGE.KEXDH_GEX_INIT;
          writeUInt32BE(packet, pubkey.length, ++p);
          packet.set(pubkey, p += 4);
          this._protocol._cipher.encrypt(
            this._protocol._packetRW.write.finalize(packet, true)
          );

          ++this._step;
          break;
        }
        case 2:
          if (this._protocol._server) {
            if (type !== MESSAGE.KEXDH_GEX_INIT) {
              return doFatalError(
                this._protocol,
                `Received packet ${type} instead of ${MESSAGE.KEXDH_GEX_INIT}`,
                'handshake',
                DISCONNECT_REASON.KEY_EXCHANGE_FAILED
              );
            }
            this._protocol._debug && this._protocol._debug(
              'Received DH GEX Init'
            );
            return doFatalError(
              this._protocol,
              'Group exchange not implemented for server',
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          } else if (type !== MESSAGE.KEXDH_GEX_REPLY) {
            return doFatalError(
              this._protocol,
              `Received packet ${type} instead of ${MESSAGE.KEXDH_GEX_REPLY}`,
              'handshake',
              DISCONNECT_REASON.KEY_EXCHANGE_FAILED
            );
          }
          this._protocol._debug && this._protocol._debug(
            'Received DH GEX Reply'
          );
          this._step = 1;
          payload[0] = MESSAGE.KEXDH_REPLY;
          this.parse = KeyExchange.prototype.parse;
          this.parse(payload);
      }
    }
  }

  class DHExchange extends KeyExchange {
    constructor(groupName, hashName, ...args) {
      super(...args);

      this.type = 'group';
      this.groupName = groupName;
      this.hashName = hashName;
    }
    start() {
      if (!this._protocol._server) {
        this._protocol._debug && this._protocol._debug(
          'Outbound: Sending KEXDH_INIT'
        );
        const pubKey = this.getPublicKey();
        let p = this._protocol._packetRW.write.allocStartKEX;
        const packet =
          this._protocol._packetRW.write.alloc(1 + 4 + pubKey.length, true);
        packet[p] = MESSAGE.KEXDH_INIT;
        writeUInt32BE(packet, pubKey.length, ++p);
        packet.set(pubKey, p += 4);
        this._protocol._cipher.encrypt(
          this._protocol._packetRW.write.finalize(packet, true)
        );
      }
    }
    generateKeys() {
      if (!this._dh) {
        this._dh = createDiffieHellmanGroup(this.groupName);
        this._public = this._dh.generateKeys();
      }
    }
    getDHParams() {
      if (this._dh) {
        return {
          prime: convertToMpint(this._dh.getPrime()),
          generator: convertToMpint(this._dh.getGenerator()),
        };
      }
    }
  }

  return (negotiated, ...args) => {
    if (typeof negotiated !== 'object' || negotiated === null)
      throw new Error('Invalid negotiated argument');
    const kexType = negotiated.kex;
    if (typeof kexType === 'string') {
      args = [negotiated, ...args];
      switch (kexType) {
        case 'curve25519-sha256':
        case 'curve25519-sha256@libssh.org':
          if (!curve25519Supported)
            break;
          return new Curve25519Exchange('sha256', ...args);

        case 'ecdh-sha2-nistp256':
          return new ECDHExchange('prime256v1', 'sha256', ...args);
        case 'ecdh-sha2-nistp384':
          return new ECDHExchange('secp384r1', 'sha384', ...args);
        case 'ecdh-sha2-nistp521':
          return new ECDHExchange('secp521r1', 'sha512', ...args);

        case 'diffie-hellman-group1-sha1':
          return new DHExchange('modp2', 'sha1', ...args);
        case 'diffie-hellman-group14-sha1':
          return new DHExchange('modp14', 'sha1', ...args);
        case 'diffie-hellman-group14-sha256':
          return new DHExchange('modp14', 'sha256', ...args);
        case 'diffie-hellman-group15-sha512':
          return new DHExchange('modp15', 'sha512', ...args);
        case 'diffie-hellman-group16-sha512':
          return new DHExchange('modp16', 'sha512', ...args);
        case 'diffie-hellman-group17-sha512':
          return new DHExchange('modp17', 'sha512', ...args);
        case 'diffie-hellman-group18-sha512':
          return new DHExchange('modp18', 'sha512', ...args);

        case 'diffie-hellman-group-exchange-sha1':
          return new DHGroupExchange('sha1', ...args);
        case 'diffie-hellman-group-exchange-sha256':
          return new DHGroupExchange('sha256', ...args);
      }
      throw new Error(`Unsupported key exchange algorithm: ${kexType}`);
    }
    throw new Error(`Invalid key exchange type: ${kexType}`);
  };
})();

const KexInit = (() => {
  const KEX_PROPERTY_NAMES = [
    'kex',
    'serverHostKey',
    ['cs', 'cipher' ],
    ['sc', 'cipher' ],
    ['cs', 'mac' ],
    ['sc', 'mac' ],
    ['cs', 'compress' ],
    ['sc', 'compress' ],
    ['cs', 'lang' ],
    ['sc', 'lang' ],
  ];
  return class KexInit {
    constructor(obj) {
      if (typeof obj !== 'object' || obj === null)
        throw new TypeError('Argument must be an object');

      const lists = {
        kex: undefined,
        serverHostKey: undefined,
        cs: {
          cipher: undefined,
          mac: undefined,
          compress: undefined,
          lang: undefined,
        },
        sc: {
          cipher: undefined,
          mac: undefined,
          compress: undefined,
          lang: undefined,
        },

        all: undefined,
      };
      let totalSize = 0;
      for (const prop of KEX_PROPERTY_NAMES) {
        let base;
        let val;
        let desc;
        let key;
        if (typeof prop === 'string') {
          base = lists;
          val = obj[prop];
          desc = key = prop;
        } else {
          const parent = prop[0];
          base = lists[parent];
          key = prop[1];
          val = obj[parent][key];
          desc = `${parent}.${key}`;
        }
        const entry = { array: undefined, buffer: undefined };
        if (Buffer.isBuffer(val)) {
          entry.array = ('' + val).split(',');
          entry.buffer = val;
          totalSize += 4 + val.length;
        } else {
          if (typeof val === 'string')
            val = val.split(',');
          if (Array.isArray(val)) {
            entry.array = val;
            entry.buffer = Buffer.from(val.join(','));
          } else {
            throw new TypeError(`Invalid \`${desc}\` type: ${typeof val}`);
          }
          totalSize += 4 + entry.buffer.length;
        }
        base[key] = entry;
      }

      const all = Buffer.allocUnsafe(totalSize);
      lists.all = all;

      let allPos = 0;
      for (const prop of KEX_PROPERTY_NAMES) {
        let data;
        if (typeof prop === 'string')
          data = lists[prop].buffer;
        else
          data = lists[prop[0]][prop[1]].buffer;
        allPos = writeUInt32BE(all, data.length, allPos);
        all.set(data, allPos);
        allPos += data.length;
      }

      this.totalSize = totalSize;
      this.lists = lists;
    }
    copyAllTo(buf, offset) {
      const src = this.lists.all;
      if (typeof offset !== 'number')
        throw new TypeError(`Invalid offset value: ${typeof offset}`);
      if (buf.length - offset < src.length)
        throw new Error('Insufficient space to copy list');
      buf.set(src, offset);
      return src.length;
    }
  };
})();

const hashString = (() => {
  const LEN = Buffer.allocUnsafe(4);
  return (hash, buf) => {
    writeUInt32BE(LEN, buf.length, 0);
    hash.update(LEN);
    hash.update(buf);
  };
})();

function generateKEXVal(len, hashName, secret, exchangeHash, sessionID, char) {
  let ret;
  if (len) {
    let digest = createHash(hashName)
                   .update(secret)
                   .update(exchangeHash)
                   .update(char)
                   .update(sessionID)
                   .digest();
    while (digest.length < len) {
      const chunk = createHash(hashName)
                      .update(secret)
                      .update(exchangeHash)
                      .update(digest)
                      .digest();
      const extended = Buffer.allocUnsafe(digest.length + chunk.length);
      extended.set(digest, 0);
      extended.set(chunk, digest.length);
      digest = extended;
    }
    if (digest.length === len)
      ret = digest;
    else
      ret = new FastBuffer(digest.buffer, digest.byteOffset, len);
  } else {
    ret = EMPTY_BUFFER;
  }
  return ret;
}

function onKEXPayload(state, payload) {
  // XXX: move this to the Decipher implementations?
  if (payload.length === 0) {
    this._debug && this._debug('Inbound: Skipping empty packet payload');
    return;
  }

  if (this._skipNextInboundPacket) {
    this._skipNextInboundPacket = false;
    return;
  }

  payload = this._packetRW.read.read(payload);

  const type = payload[0];

  if (!this._strictMode) {
    switch (type) {
      case MESSAGE.IGNORE:
      case MESSAGE.UNIMPLEMENTED:
      case MESSAGE.DEBUG:
        if (!MESSAGE_HANDLERS)
          MESSAGE_HANDLERS = require('./handlers.js');
        return MESSAGE_HANDLERS[type](this, payload);
    }
  }

  switch (type) {
    case MESSAGE.DISCONNECT:
      if (!MESSAGE_HANDLERS)
        MESSAGE_HANDLERS = require('./handlers.js');
      return MESSAGE_HANDLERS[type](this, payload);
    case MESSAGE.KEXINIT:
      if (!state.firstPacket) {
        return doFatalError(
          this,
          'Received extra KEXINIT during handshake',
          'handshake',
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }
      state.firstPacket = false;
      return handleKexInit(this, payload);
    default:
      // Ensure packet is either an algorithm negotiation or KEX
      // algorithm-specific packet
      if (type < 20 || type > 49) {
        return doFatalError(
          this,
          `Received unexpected packet type ${type}`,
          'handshake',
          DISCONNECT_REASON.KEY_EXCHANGE_FAILED
        );
      }
  }

  return this._kex.parse(payload);
}

function dhEstimate(neg) {
  const csCipher = CIPHER_INFO[neg.cs.cipher];
  const scCipher = CIPHER_INFO[neg.sc.cipher];
  // XXX: if OpenSSH's `umac-*` MACs are ever supported, their key lengths will
  // also need to be considered when calculating `bits`
  const bits = Math.max(
    0,
    (csCipher.sslName === 'des-ede3-cbc' ? 14 : csCipher.keyLen),
    csCipher.blockLen,
    csCipher.ivLen,
    (scCipher.sslName === 'des-ede3-cbc' ? 14 : scCipher.keyLen),
    scCipher.blockLen,
    scCipher.ivLen
  ) * 8;
  if (bits <= 112)
    return 2048;
  if (bits <= 128)
    return 3072;
  if (bits <= 192)
    return 7680;
  return 8192;
}

function trySendNEWKEYS(kex) {
  if (!kex._sentNEWKEYS) {
    kex._protocol._debug && kex._protocol._debug(
      'Outbound: Sending NEWKEYS'
    );
    const p = kex._protocol._packetRW.write.allocStartKEX;
    const packet = kex._protocol._packetRW.write.alloc(1, true);
    packet[p] = MESSAGE.NEWKEYS;
    kex._protocol._cipher.encrypt(
      kex._protocol._packetRW.write.finalize(packet, true)
    );
    kex._sentNEWKEYS = true;
    if (kex._protocol._strictMode)
      kex._protocol._cipher.outSeqno = 0;
  }
}

module.exports = {
  KexInit,
  kexinit,
  onKEXPayload,
  DEFAULT_KEXINIT_CLIENT: new KexInit({
    kex: DEFAULT_KEX.concat(['ext-info-c', 'kex-strict-c-v00@openssh.com']),
    serverHostKey: DEFAULT_SERVER_HOST_KEY,
    cs: {
      cipher: DEFAULT_CIPHER,
      mac: DEFAULT_MAC,
      compress: DEFAULT_COMPRESSION,
      lang: [],
    },
    sc: {
      cipher: DEFAULT_CIPHER,
      mac: DEFAULT_MAC,
      compress: DEFAULT_COMPRESSION,
      lang: [],
    },
  }),
  DEFAULT_KEXINIT_SERVER: new KexInit({
    kex: DEFAULT_KEX.concat(['kex-strict-s-v00@openssh.com']),
    serverHostKey: DEFAULT_SERVER_HOST_KEY,
    cs: {
      cipher: DEFAULT_CIPHER,
      mac: DEFAULT_MAC,
      compress: DEFAULT_COMPRESSION,
      lang: [],
    },
    sc: {
      cipher: DEFAULT_CIPHER,
      mac: DEFAULT_MAC,
      compress: DEFAULT_COMPRESSION,
      lang: [],
    },
  }),
  HANDLERS: {
    [MESSAGE.KEXINIT]: handleKexInit,
  },
};
