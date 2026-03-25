// TODO:
//    * add `.connected` or similar property to allow immediate connection
//      status checking
//    * add/improve debug output during user authentication phase
'use strict';

const {
  createHash,
  getHashes,
  randomFillSync,
} = require('crypto');
const { Socket } = require('net');
const { lookup: dnsLookup } = require('dns');
const EventEmitter = require('events');
const HASHES = getHashes();

const {
  COMPAT,
  CHANNEL_EXTENDED_DATATYPE: { STDERR },
  CHANNEL_OPEN_FAILURE,
  DEFAULT_CIPHER,
  DEFAULT_COMPRESSION,
  DEFAULT_KEX,
  DEFAULT_MAC,
  DEFAULT_SERVER_HOST_KEY,
  DISCONNECT_REASON,
  DISCONNECT_REASON_BY_VALUE,
  SUPPORTED_CIPHER,
  SUPPORTED_COMPRESSION,
  SUPPORTED_KEX,
  SUPPORTED_MAC,
  SUPPORTED_SERVER_HOST_KEY,
} = require('./protocol/constants.js');
const { init: cryptoInit } = require('./protocol/crypto.js');
const Protocol = require('./protocol/Protocol.js');
const { parseKey } = require('./protocol/keyParser.js');
const { SFTP } = require('./protocol/SFTP.js');
const {
  bufferCopy,
  makeBufferParser,
  makeError,
  readUInt32BE,
  sigSSHToASN1,
  writeUInt32BE,
} = require('./protocol/utils.js');

const { AgentContext, createAgent, isAgent } = require('./agent.js');
const {
  Channel,
  MAX_WINDOW,
  PACKET_SIZE,
  windowAdjust,
  WINDOW_THRESHOLD,
} = require('./Channel.js');
const {
  ChannelManager,
  generateAlgorithmList,
  isWritable,
  onChannelOpenFailure,
  onCHANNEL_CLOSE,
} = require('./utils.js');

const bufferParser = makeBufferParser();
const sigParser = makeBufferParser();
const RE_OPENSSH = /^OpenSSH_(?:(?![0-4])\d)|(?:\d{2,})/;
const noop = (err) => {};

class Client extends EventEmitter {
  constructor() {
    super();

    this.config = {
      host: undefined,
      port: undefined,
      localAddress: undefined,
      localPort: undefined,
      forceIPv4: undefined,
      forceIPv6: undefined,
      keepaliveCountMax: undefined,
      keepaliveInterval: undefined,
      readyTimeout: undefined,
      ident: undefined,

      username: undefined,
      password: undefined,
      privateKey: undefined,
      tryKeyboard: undefined,
      agent: undefined,
      allowAgentFwd: undefined,
      authHandler: undefined,

      hostHashAlgo: undefined,
      hostHashCb: undefined,
      strictVendor: undefined,
      debug: undefined
    };

    this._agent = undefined;
    this._readyTimeout = undefined;
    this._chanMgr = undefined;
    this._callbacks = undefined;
    this._forwarding = undefined;
    this._forwardingUnix = undefined;
    this._acceptX11 = undefined;
    this._agentFwdEnabled = undefined;
    this._remoteVer = undefined;

    this._protocol = undefined;
    this._sock = undefined;
    this._resetKA = undefined;
  }

  connect(cfg) {
    if (this._sock && isWritable(this._sock)) {
      this.once('close', () => {
        this.connect(cfg);
      });
      this.end();
      return this;
    }

    this.config.host = cfg.hostname || cfg.host || 'localhost';
    this.config.port = cfg.port || 22;
    this.config.localAddress = (typeof cfg.localAddress === 'string'
                                ? cfg.localAddress
                                : undefined);
    this.config.localPort = (typeof cfg.localPort === 'string'
                             || typeof cfg.localPort === 'number'
                             ? cfg.localPort
                             : undefined);
    this.config.forceIPv4 = cfg.forceIPv4 || false;
    this.config.forceIPv6 = cfg.forceIPv6 || false;
    this.config.keepaliveCountMax = (typeof cfg.keepaliveCountMax === 'number'
                                     && cfg.keepaliveCountMax >= 0
                                     ? cfg.keepaliveCountMax
                                     : 3);
    this.config.keepaliveInterval = (typeof cfg.keepaliveInterval === 'number'
                                     && cfg.keepaliveInterval > 0
                                     ? cfg.keepaliveInterval
                                     : 0);
    this.config.readyTimeout = (typeof cfg.readyTimeout === 'number'
                                && cfg.readyTimeout >= 0
                                ? cfg.readyTimeout
                                : 20000);
    this.config.ident = (typeof cfg.ident === 'string'
                         || Buffer.isBuffer(cfg.ident)
                         ? cfg.ident
                         : undefined);

    const algorithms = {
      kex: undefined,
      serverHostKey: undefined,
      cs: {
        cipher: undefined,
        mac: undefined,
        compress: undefined,
        lang: [],
      },
      sc: undefined,
    };
    let allOfferDefaults = true;
    if (typeof cfg.algorithms === 'object' && cfg.algorithms !== null) {
      algorithms.kex = generateAlgorithmList(cfg.algorithms.kex,
                                             DEFAULT_KEX,
                                             SUPPORTED_KEX);
      if (algorithms.kex !== DEFAULT_KEX)
        allOfferDefaults = false;

      algorithms.serverHostKey =
        generateAlgorithmList(cfg.algorithms.serverHostKey,
                              DEFAULT_SERVER_HOST_KEY,
                              SUPPORTED_SERVER_HOST_KEY);
      if (algorithms.serverHostKey !== DEFAULT_SERVER_HOST_KEY)
        allOfferDefaults = false;

      algorithms.cs.cipher = generateAlgorithmList(cfg.algorithms.cipher,
                                                   DEFAULT_CIPHER,
                                                   SUPPORTED_CIPHER);
      if (algorithms.cs.cipher !== DEFAULT_CIPHER)
        allOfferDefaults = false;

      algorithms.cs.mac = generateAlgorithmList(cfg.algorithms.hmac,
                                                DEFAULT_MAC,
                                                SUPPORTED_MAC);
      if (algorithms.cs.mac !== DEFAULT_MAC)
        allOfferDefaults = false;

      algorithms.cs.compress = generateAlgorithmList(cfg.algorithms.compress,
                                                     DEFAULT_COMPRESSION,
                                                     SUPPORTED_COMPRESSION);
      if (algorithms.cs.compress !== DEFAULT_COMPRESSION)
        allOfferDefaults = false;

      if (!allOfferDefaults)
        algorithms.sc = algorithms.cs;
    }

    if (typeof cfg.username === 'string')
      this.config.username = cfg.username;
    else if (typeof cfg.user === 'string')
      this.config.username = cfg.user;
    else
      throw new Error('Invalid username');

    this.config.password = (typeof cfg.password === 'string'
                            ? cfg.password
                            : undefined);
    this.config.privateKey = (typeof cfg.privateKey === 'string'
                              || Buffer.isBuffer(cfg.privateKey)
                              ? cfg.privateKey
                              : undefined);
    this.config.localHostname = (typeof cfg.localHostname === 'string'
                                 ? cfg.localHostname
                                 : undefined);
    this.config.localUsername = (typeof cfg.localUsername === 'string'
                                 ? cfg.localUsername
                                 : undefined);
    this.config.tryKeyboard = (cfg.tryKeyboard === true);
    if (typeof cfg.agent === 'string' && cfg.agent.length)
      this.config.agent = createAgent(cfg.agent);
    else if (isAgent(cfg.agent))
      this.config.agent = cfg.agent;
    else
      this.config.agent = undefined;
    this.config.allowAgentFwd = (cfg.agentForward === true
                                 && this.config.agent !== undefined);
    let authHandler = this.config.authHandler = (
      typeof cfg.authHandler === 'function'
      || Array.isArray(cfg.authHandler)
      ? cfg.authHandler
      : undefined
    );

    this.config.strictVendor = (typeof cfg.strictVendor === 'boolean'
                                ? cfg.strictVendor
                                : true);

    const debug = this.config.debug = (typeof cfg.debug === 'function'
                                       ? cfg.debug
                                       : undefined);

    if (cfg.agentForward === true && !this.config.allowAgentFwd) {
      throw new Error(
        'You must set a valid agent path to allow agent forwarding'
      );
    }

    let callbacks = this._callbacks = [];
    this._chanMgr = new ChannelManager(this);
    this._forwarding = {};
    this._forwardingUnix = {};
    this._acceptX11 = 0;
    this._agentFwdEnabled = false;
    this._agent = (this.config.agent ? this.config.agent : undefined);
    this._remoteVer = undefined;
    let privateKey;

    if (this.config.privateKey) {
      privateKey = parseKey(this.config.privateKey, cfg.passphrase);
      if (privateKey instanceof Error)
        throw new Error(`Cannot parse privateKey: ${privateKey.message}`);
      if (Array.isArray(privateKey)) {
        // OpenSSH's newer format only stores 1 key for now
        privateKey = privateKey[0];
      }
      if (privateKey.getPrivatePEM() === null) {
        throw new Error(
          'privateKey value does not contain a (valid) private key'
        );
      }
    }

    let hostVerifier;
    if (typeof cfg.hostVerifier === 'function') {
      const hashCb = cfg.hostVerifier;
      let hasher;
      if (HASHES.indexOf(cfg.hostHash) !== -1) {
        // Default to old behavior of hashing on user's behalf
        hasher = createHash(cfg.hostHash);
      }
      hostVerifier = (key, verify) => {
        if (hasher) {
          hasher.update(key);
          key = hasher.digest('hex');
        }
        const ret = hashCb(key, verify);
        if (ret !== undefined)
          verify(ret);
      };
    }

    const sock = this._sock = (cfg.sock || new Socket());
    let ready = false;
    let sawHeader = false;
    if (this._protocol)
      this._protocol.cleanup();
    const DEBUG_HANDLER = (!debug ? undefined : (p, display, msg) => {
      debug(`Debug output from server: ${JSON.stringify(msg)}`);
    });
    let serverSigAlgs;
    const proto = this._protocol = new Protocol({
      ident: this.config.ident,
      offer: (allOfferDefaults ? undefined : algorithms),
      onWrite: (data) => {
        if (isWritable(sock))
          sock.write(data);
      },
      onError: (err) => {
        if (err.level === 'handshake')
          clearTimeout(this._readyTimeout);
        if (!proto._destruct)
          sock.removeAllListeners('data');
        this.emit('error', err);
        try {
          sock.end();
        } catch {}
      },
      onHeader: (header) => {
        sawHeader = true;
        this._remoteVer = header.versions.software;
        if (header.greeting)
          this.emit('greeting', header.greeting);
      },
      onHandshakeComplete: (negotiated) => {
        this.emit('handshake', negotiated);
        if (!ready) {
          ready = true;
          proto.service('ssh-userauth');
        }
      },
      debug,
      hostVerifier,
      messageHandlers: {
        DEBUG: DEBUG_HANDLER,
        DISCONNECT: (p, reason, desc) => {
          if (reason !== DISCONNECT_REASON.BY_APPLICATION) {
            if (!desc) {
              desc = DISCONNECT_REASON_BY_VALUE[reason];
              if (desc === undefined)
                desc = `Unexpected disconnection reason: ${reason}`;
            }
            const err = new Error(desc);
            err.code = reason;
            this.emit('error', err);
          }
          sock.end();
        },
        SERVICE_ACCEPT: (p, name) => {
          if (name === 'ssh-userauth')
            tryNextAuth();
        },
        EXT_INFO: (p, exts) => {
          if (serverSigAlgs === undefined) {
            for (const ext of exts) {
              if (ext.name === 'server-sig-algs') {
                serverSigAlgs = ext.algs;
                return;
              }
            }
            serverSigAlgs = null;
          }
        },
        USERAUTH_BANNER: (p, msg) => {
          this.emit('banner', msg);
        },
        USERAUTH_SUCCESS: (p) => {
          // Start keepalive mechanism
          resetKA();

          clearTimeout(this._readyTimeout);

          this.emit('ready');
        },
        USERAUTH_FAILURE: (p, authMethods, partialSuccess) => {
          // For key-based authentication, check if we should retry the current
          // key with a different algorithm first
          if (curAuth.keyAlgos) {
            const oldKeyAlgo = curAuth.keyAlgos[0][0];
            if (debug)
              debug(`Client: ${curAuth.type} (${oldKeyAlgo}) auth failed`);
            curAuth.keyAlgos.shift();
            if (curAuth.keyAlgos.length) {
              const [keyAlgo, hashAlgo] = curAuth.keyAlgos[0];
              switch (curAuth.type) {
                case 'agent':
                  proto.authPK(
                    curAuth.username,
                    curAuth.agentCtx.currentKey(),
                    keyAlgo
                  );
                  return;
                case 'publickey':
                  proto.authPK(curAuth.username, curAuth.key, keyAlgo);
                  return;
                case 'hostbased':
                  proto.authHostbased(curAuth.username,
                                      curAuth.key,
                                      curAuth.localHostname,
                                      curAuth.localUsername,
                                      keyAlgo,
                                      (buf, cb) => {
                    const signature = curAuth.key.sign(buf, hashAlgo);
                    if (signature instanceof Error) {
                      signature.message =
                        `Error while signing with key: ${signature.message}`;
                      signature.level = 'client-authentication';
                      this.emit('error', signature);
                      return tryNextAuth();
                    }

                    cb(signature);
                  });
                  return;
              }
            } else {
              curAuth.keyAlgos = undefined;
            }
          }

          if (curAuth.type === 'agent') {
            const pos = curAuth.agentCtx.pos();
            debug && debug(`Client: Agent key #${pos + 1} failed`);
            return tryNextAgentKey();
          }

          debug && debug(`Client: ${curAuth.type} auth failed`);

          curPartial = partialSuccess;
          curAuthsLeft = authMethods;
          tryNextAuth();
        },
        USERAUTH_PASSWD_CHANGEREQ: (p, prompt) => {
          if (curAuth.type === 'password') {
            // TODO: support a `changePrompt()` on `curAuth` that defaults to
            // emitting 'change password' as before
            this.emit('change password', prompt, (newPassword) => {
              proto.authPassword(
                this.config.username,
                this.config.password,
                newPassword
              );
            });
          }
        },
        USERAUTH_PK_OK: (p) => {
          let keyAlgo;
          let hashAlgo;
          if (curAuth.keyAlgos)
            [keyAlgo, hashAlgo] = curAuth.keyAlgos[0];
          if (curAuth.type === 'agent') {
            const key = curAuth.agentCtx.currentKey();
            proto.authPK(curAuth.username, key, keyAlgo, (buf, cb) => {
              const opts = { hash: hashAlgo };
              curAuth.agentCtx.sign(key, buf, opts, (err, signed) => {
                if (err) {
                  err.level = 'agent';
                  this.emit('error', err);
                } else {
                  return cb(signed);
                }

                tryNextAgentKey();
              });
            });
          } else if (curAuth.type === 'publickey') {
            proto.authPK(curAuth.username, curAuth.key, keyAlgo, (buf, cb) => {
              const signature = curAuth.key.sign(buf, hashAlgo);
              if (signature instanceof Error) {
                signature.message =
                  `Error signing data with key: ${signature.message}`;
                signature.level = 'client-authentication';
                this.emit('error', signature);
                return tryNextAuth();
              }
              cb(signature);
            });
          }
        },
        USERAUTH_INFO_REQUEST: (p, name, instructions, prompts) => {
          if (curAuth.type === 'keyboard-interactive') {
            const nprompts = (Array.isArray(prompts) ? prompts.length : 0);
            if (nprompts === 0) {
              debug && debug(
                'Client: Sending automatic USERAUTH_INFO_RESPONSE'
              );
              proto.authInfoRes();
              return;
            }
            // We sent a keyboard-interactive user authentication request and
            // now the server is sending us the prompts we need to present to
            // the user
            curAuth.prompt(
              name,
              instructions,
              '',
              prompts,
              (answers) => {
                proto.authInfoRes(answers);
              }
            );
          }
        },
        REQUEST_SUCCESS: (p, data) => {
          if (callbacks.length)
            callbacks.shift()(false, data);
        },
        REQUEST_FAILURE: (p) => {
          if (callbacks.length)
            callbacks.shift()(true);
        },
        GLOBAL_REQUEST: (p, name, wantReply, data) => {
          switch (name) {
            case 'hostkeys-00@openssh.com':
              // Automatically verify keys before passing to end user
              hostKeysProve(this, data, (err, keys) => {
                if (err)
                  return;
                this.emit('hostkeys', keys);
              });
              if (wantReply)
                proto.requestSuccess();
              break;
            default:
              // Auto-reject all other global requests, this can be especially
              // useful if the server is sending us dummy keepalive global
              // requests
              if (wantReply)
                proto.requestFailure();
          }
        },
        CHANNEL_OPEN: (p, info) => {
          // Handle incoming requests from server, typically a forwarded TCP or
          // X11 connection
          onCHANNEL_OPEN(this, info);
        },
        CHANNEL_OPEN_CONFIRMATION: (p, info) => {
          const channel = this._chanMgr.get(info.recipient);
          if (typeof channel !== 'function')
            return;

          const isSFTP = (channel.type === 'sftp');
          const type = (isSFTP ? 'session' : channel.type);
          const chanInfo = {
            type,
            incoming: {
              id: info.recipient,
              window: MAX_WINDOW,
              packetSize: PACKET_SIZE,
              state: 'open'
            },
            outgoing: {
              id: info.sender,
              window: info.window,
              packetSize: info.packetSize,
              state: 'open'
            }
          };
          const instance = (
            isSFTP
            ? new SFTP(this, chanInfo, { debug })
            : new Channel(this, chanInfo)
          );
          this._chanMgr.update(info.recipient, instance);
          channel(undefined, instance);
        },
        CHANNEL_OPEN_FAILURE: (p, recipient, reason, description) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'function')
            return;

          const info = { reason, description };
          onChannelOpenFailure(this, recipient, info, channel);
        },
        CHANNEL_DATA: (p, recipient, data) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          // The remote party should not be sending us data if there is no
          // window space available ...
          // TODO: raise error on data with not enough window?
          if (channel.incoming.window === 0)
            return;

          channel.incoming.window -= data.length;

          if (channel.push(data) === false) {
            channel._waitChanDrain = true;
            return;
          }

          if (channel.incoming.window <= WINDOW_THRESHOLD)
            windowAdjust(channel);
        },
        CHANNEL_EXTENDED_DATA: (p, recipient, data, type) => {
          if (type !== STDERR)
            return;

          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          // The remote party should not be sending us data if there is no
          // window space available ...
          // TODO: raise error on data with not enough window?
          if (channel.incoming.window === 0)
            return;

          channel.incoming.window -= data.length;

          if (!channel.stderr.push(data)) {
            channel._waitChanDrain = true;
            return;
          }

          if (channel.incoming.window <= WINDOW_THRESHOLD)
            windowAdjust(channel);
        },
        CHANNEL_WINDOW_ADJUST: (p, recipient, amount) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          // The other side is allowing us to send `amount` more bytes of data
          channel.outgoing.window += amount;

          if (channel._waitWindow) {
            channel._waitWindow = false;

            if (channel._chunk) {
              channel._write(channel._chunk, null, channel._chunkcb);
            } else if (channel._chunkcb) {
              channel._chunkcb();
            } else if (channel._chunkErr) {
              channel.stderr._write(channel._chunkErr,
                                    null,
                                    channel._chunkcbErr);
            } else if (channel._chunkcbErr) {
              channel._chunkcbErr();
            }
          }
        },
        CHANNEL_SUCCESS: (p, recipient) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          this._resetKA();

          if (channel._callbacks.length)
            channel._callbacks.shift()(false);
        },
        CHANNEL_FAILURE: (p, recipient) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          this._resetKA();

          if (channel._callbacks.length)
            channel._callbacks.shift()(true);
        },
        CHANNEL_REQUEST: (p, recipient, type, wantReply, data) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          const exit = channel._exit;
          if (exit.code !== undefined)
            return;
          switch (type) {
            case 'exit-status':
              channel.emit('exit', exit.code = data);
              return;
            case 'exit-signal':
              channel.emit('exit',
                           exit.code = null,
                           exit.signal = `SIG${data.signal}`,
                           exit.dump = data.coreDumped,
                           exit.desc = data.errorMessage);
              return;
          }

          // Keepalive request? OpenSSH will send one as a channel request if
          // there is a channel open

          if (wantReply)
            p.channelFailure(channel.outgoing.id);
        },
        CHANNEL_EOF: (p, recipient) => {
          const channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.incoming.state !== 'open')
            return;
          channel.incoming.state = 'eof';

          if (channel.readable)
            channel.push(null);
          if (channel.stderr.readable)
            channel.stderr.push(null);
        },
        CHANNEL_CLOSE: (p, recipient) => {
          onCHANNEL_CLOSE(this, recipient, this._chanMgr.get(recipient));
        },
      },
    });

    sock.pause();

    // TODO: check keepalive implementation
    // Keepalive-related
    const kainterval = this.config.keepaliveInterval;
    const kacountmax = this.config.keepaliveCountMax;
    let kacount = 0;
    let katimer;
    const sendKA = () => {
      if (++kacount > kacountmax) {
        clearInterval(katimer);
        if (sock.readable) {
          const err = new Error('Keepalive timeout');
          err.level = 'client-timeout';
          this.emit('error', err);
          sock.destroy();
        }
        return;
      }
      if (isWritable(sock)) {
        // Append dummy callback to keep correct callback order
        callbacks.push(resetKA);
        proto.ping();
      } else {
        clearInterval(katimer);
      }
    };
    function resetKA() {
      if (kainterval > 0) {
        kacount = 0;
        clearInterval(katimer);
        if (isWritable(sock))
          katimer = setInterval(sendKA, kainterval);
      }
    }
    this._resetKA = resetKA;

    const onDone = (() => {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;
        if (wasConnected && !sawHeader) {
          const err =
            makeError('Connection lost before handshake', 'protocol', true);
          this.emit('error', err);
        }
      };
    })();
    const onConnect = (() => {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;

        wasConnected = true;
        debug && debug('Socket connected');
        this.emit('connect');

        cryptoInit.then(() => {
          proto.start();
          sock.on('data', (data) => {
            try {
              proto.parse(data, 0, data.length);
            } catch (ex) {
              this.emit('error', ex);
              try {
                if (isWritable(sock))
                  sock.end();
              } catch {}
            }
          });

          // Drain stderr if we are connection hopping using an exec stream
          if (sock.stderr && typeof sock.stderr.resume === 'function')
            sock.stderr.resume();

          sock.resume();
        }).catch((err) => {
          this.emit('error', err);
          try {
            if (isWritable(sock))
              sock.end();
          } catch {}
        });
      };
    })();
    let wasConnected = false;
    sock.on('connect', onConnect)
        .on('timeout', () => {
      this.emit('timeout');
    }).on('error', (err) => {
      debug && debug(`Socket error: ${err.message}`);
      clearTimeout(this._readyTimeout);
      err.level = 'client-socket';
      this.emit('error', err);
    }).on('end', () => {
      debug && debug('Socket ended');
      onDone();
      proto.cleanup();
      clearTimeout(this._readyTimeout);
      clearInterval(katimer);
      this.emit('end');
    }).on('close', () => {
      debug && debug('Socket closed');
      onDone();
      proto.cleanup();
      clearTimeout(this._readyTimeout);
      clearInterval(katimer);
      this.emit('close');

      // Notify outstanding channel requests of disconnection ...
      const callbacks_ = callbacks;
      callbacks = this._callbacks = [];
      const err = new Error('No response from server');
      for (let i = 0; i < callbacks_.length; ++i)
        callbacks_[i](err);

      // Simulate error for any channels waiting to be opened
      this._chanMgr.cleanup(err);
    });

    // Begin authentication handling ===========================================
    let curAuth;
    let curPartial = null;
    let curAuthsLeft = null;
    const authsAllowed = ['none'];
    if (this.config.password !== undefined)
      authsAllowed.push('password');
    if (privateKey !== undefined)
      authsAllowed.push('publickey');
    if (this._agent !== undefined)
      authsAllowed.push('agent');
    if (this.config.tryKeyboard)
      authsAllowed.push('keyboard-interactive');
    if (privateKey !== undefined
        && this.config.localHostname !== undefined
        && this.config.localUsername !== undefined) {
      authsAllowed.push('hostbased');
    }

    if (Array.isArray(authHandler))
      authHandler = makeSimpleAuthHandler(authHandler);
    else if (typeof authHandler !== 'function')
      authHandler = makeSimpleAuthHandler(authsAllowed);

    let hasSentAuth = false;
    const doNextAuth = (nextAuth) => {
      if (hasSentAuth)
        return;
      hasSentAuth = true;

      if (nextAuth === false) {
        const err = new Error('All configured authentication methods failed');
        err.level = 'client-authentication';
        this.emit('error', err);
        this.end();
        return;
      }

      if (typeof nextAuth === 'string') {
        // Remain backwards compatible with original `authHandler()` usage,
        // which only supported passing names of next method to try using data
        // from the `connect()` config object

        const type = nextAuth;
        if (authsAllowed.indexOf(type) === -1)
          return skipAuth(`Authentication method not allowed: ${type}`);

        const username = this.config.username;
        switch (type) {
          case 'password':
            nextAuth = { type, username, password: this.config.password };
            break;
          case 'publickey':
            nextAuth = { type, username, key: privateKey };
            break;
          case 'hostbased':
            nextAuth = {
              type,
              username,
              key: privateKey,
              localHostname: this.config.localHostname,
              localUsername: this.config.localUsername,
            };
            break;
          case 'agent':
            nextAuth = {
              type,
              username,
              agentCtx: new AgentContext(this._agent),
            };
            break;
          case 'keyboard-interactive':
            nextAuth = {
              type,
              username,
              prompt: (...args) => this.emit('keyboard-interactive', ...args),
            };
            break;
          case 'none':
            nextAuth = { type, username };
            break;
          default:
            return skipAuth(
              `Skipping unsupported authentication method: ${nextAuth}`
            );
        }
      } else if (typeof nextAuth !== 'object' || nextAuth === null) {
        return skipAuth(
          `Skipping invalid authentication attempt: ${nextAuth}`
        );
      } else {
        const username = nextAuth.username;
        if (typeof username !== 'string') {
          return skipAuth(
            `Skipping invalid authentication attempt: ${nextAuth}`
          );
        }
        const type = nextAuth.type;
        switch (type) {
          case 'password': {
            const { password } = nextAuth;
            if (typeof password !== 'string' && !Buffer.isBuffer(password))
              return skipAuth('Skipping invalid password auth attempt');
            nextAuth = { type, username, password };
            break;
          }
          case 'publickey': {
            const key = parseKey(nextAuth.key, nextAuth.passphrase);
            if (key instanceof Error)
              return skipAuth('Skipping invalid key auth attempt');
            if (!key.isPrivateKey())
              return skipAuth('Skipping non-private key');
            nextAuth = { type, username, key };
            break;
          }
          case 'hostbased': {
            const { localHostname, localUsername } = nextAuth;
            const key = parseKey(nextAuth.key, nextAuth.passphrase);
            if (key instanceof Error
                || typeof localHostname !== 'string'
                || typeof localUsername !== 'string') {
              return skipAuth('Skipping invalid hostbased auth attempt');
            }
            if (!key.isPrivateKey())
              return skipAuth('Skipping non-private key');
            nextAuth = { type, username, key, localHostname, localUsername };
            break;
          }
          case 'agent': {
            let agent = nextAuth.agent;
            if (typeof agent === 'string' && agent.length) {
              agent = createAgent(agent);
            } else if (!isAgent(agent)) {
              return skipAuth(
                `Skipping invalid agent: ${nextAuth.agent}`
              );
            }
            nextAuth = { type, username, agentCtx: new AgentContext(agent) };
            break;
          }
          case 'keyboard-interactive': {
            const { prompt } = nextAuth;
            if (typeof prompt !== 'function') {
              return skipAuth(
                'Skipping invalid keyboard-interactive auth attempt'
              );
            }
            nextAuth = { type, username, prompt };
            break;
          }
          case 'none':
            nextAuth = { type, username };
            break;
          default:
            return skipAuth(
              `Skipping unsupported authentication method: ${nextAuth}`
            );
        }
      }
      curAuth = nextAuth;

      // Begin authentication method's process
      try {
        const username = curAuth.username;
        switch (curAuth.type) {
          case 'password':
            proto.authPassword(username, curAuth.password);
            break;
          case 'publickey': {
            let keyAlgo;
            curAuth.keyAlgos = getKeyAlgos(this, curAuth.key, serverSigAlgs);
            if (curAuth.keyAlgos) {
              if (curAuth.keyAlgos.length) {
                keyAlgo = curAuth.keyAlgos[0][0];
              } else {
                return skipAuth(
                  'Skipping key authentication (no mutual hash algorithm)'
                );
              }
            }
            proto.authPK(username, curAuth.key, keyAlgo);
            break;
          }
          case 'hostbased': {
            let keyAlgo;
            let hashAlgo;
            curAuth.keyAlgos = getKeyAlgos(this, curAuth.key, serverSigAlgs);
            if (curAuth.keyAlgos) {
              if (curAuth.keyAlgos.length) {
                [keyAlgo, hashAlgo] = curAuth.keyAlgos[0];
              } else {
                return skipAuth(
                  'Skipping hostbased authentication (no mutual hash algorithm)'
                );
              }
            }

            proto.authHostbased(username,
                                curAuth.key,
                                curAuth.localHostname,
                                curAuth.localUsername,
                                keyAlgo,
                                (buf, cb) => {
              const signature = curAuth.key.sign(buf, hashAlgo);
              if (signature instanceof Error) {
                signature.message =
                  `Error while signing with key: ${signature.message}`;
                signature.level = 'client-authentication';
                this.emit('error', signature);
                return tryNextAuth();
              }

              cb(signature);
            });
            break;
          }
          case 'agent':
            curAuth.agentCtx.init((err) => {
              if (err) {
                err.level = 'agent';
                this.emit('error', err);
                return tryNextAuth();
              }
              tryNextAgentKey();
            });
            break;
          case 'keyboard-interactive':
            proto.authKeyboard(username);
            break;
          case 'none':
            proto.authNone(username);
            break;
        }
      } finally {
        hasSentAuth = false;
      }
    };

    function skipAuth(msg) {
      debug && debug(msg);
      process.nextTick(tryNextAuth);
    }

    function tryNextAuth() {
      hasSentAuth = false;
      const auth = authHandler(curAuthsLeft, curPartial, doNextAuth);
      if (hasSentAuth || auth === undefined)
        return;
      doNextAuth(auth);
    }

    const tryNextAgentKey = () => {
      if (curAuth.type === 'agent') {
        const key = curAuth.agentCtx.nextKey();
        if (key === false) {
          debug && debug('Agent: No more keys left to try');
          debug && debug('Client: agent auth failed');
          tryNextAuth();
        } else {
          const pos = curAuth.agentCtx.pos();
          let keyAlgo;
          curAuth.keyAlgos = getKeyAlgos(this, key, serverSigAlgs);
          if (curAuth.keyAlgos) {
            if (curAuth.keyAlgos.length) {
              keyAlgo = curAuth.keyAlgos[0][0];
            } else {
              debug && debug(
                `Agent: Skipping key #${pos + 1} (no mutual hash algorithm)`
              );
              tryNextAgentKey();
              return;
            }
          }
          debug && debug(`Agent: Trying key #${pos + 1}`);
          proto.authPK(curAuth.username, key, keyAlgo);
        }
      }
    };

    const startTimeout = () => {
      if (this.config.readyTimeout > 0) {
        this._readyTimeout = setTimeout(() => {
          const err = new Error('Timed out while waiting for handshake');
          err.level = 'client-timeout';
          this.emit('error', err);
          sock.destroy();
        }, this.config.readyTimeout);
      }
    };

    if (!cfg.sock) {
      let host = this.config.host;
      const forceIPv4 = this.config.forceIPv4;
      const forceIPv6 = this.config.forceIPv6;

      debug && debug(`Client: Trying ${host} on port ${this.config.port} ...`);

      const doConnect = () => {
        startTimeout();
        sock.connect({
          host,
          port: this.config.port,
          localAddress: this.config.localAddress,
          localPort: this.config.localPort
        });
        sock.setMaxListeners(0);
        sock.setTimeout(typeof cfg.timeout === 'number' ? cfg.timeout : 0);
      };

      if ((!forceIPv4 && !forceIPv6) || (forceIPv4 && forceIPv6)) {
        doConnect();
      } else {
        dnsLookup(host, (forceIPv4 ? 4 : 6), (err, address, family) => {
          if (err) {
            const type = (forceIPv4 ? 'IPv4' : 'IPv6');
            const error = new Error(
              `Error while looking up ${type} address for '${host}': ${err}`
            );
            clearTimeout(this._readyTimeout);
            error.level = 'client-dns';
            this.emit('error', error);
            this.emit('close');
            return;
          }
          host = address;
          doConnect();
        });
      }
    } else {
      // Custom socket passed in
      startTimeout();
      if (typeof sock.connecting === 'boolean') {
        // net.Socket

        if (!sock.connecting) {
          // Already connected
          onConnect();
        }
      } else {
        // Assume socket/stream is already "connected"
        onConnect();
      }
    }

    return this;
  }

  end() {
    if (this._sock && isWritable(this._sock)) {
      this._protocol.disconnect(DISCONNECT_REASON.BY_APPLICATION);
      this._sock.end();
    }
    return this;
  }

  destroy() {
    this._sock && isWritable(this._sock) && this._sock.destroy();
    return this;
  }

  exec(cmd, opts, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    const extraOpts = { allowHalfOpen: (opts.allowHalfOpen !== false) };

    openChannel(this, 'session', extraOpts, (err, chan) => {
      if (err) {
        cb(err);
        return;
      }

      const todo = [];

      function reqCb(err) {
        if (err) {
          chan.close();
          cb(err);
          return;
        }
        if (todo.length)
          todo.shift()();
      }

      if (this.config.allowAgentFwd === true
          || (opts
              && opts.agentForward === true
              && this._agent !== undefined)) {
        todo.push(() => reqAgentFwd(chan, reqCb));
      }

      if (typeof opts === 'object' && opts !== null) {
        if (typeof opts.env === 'object' && opts.env !== null)
          reqEnv(chan, opts.env);
        if ((typeof opts.pty === 'object' && opts.pty !== null)
            || opts.pty === true) {
          todo.push(() => reqPty(chan, opts.pty, reqCb));
        }
        if ((typeof opts.x11 === 'object' && opts.x11 !== null)
            || opts.x11 === 'number'
            || opts.x11 === true) {
          todo.push(() => reqX11(chan, opts.x11, reqCb));
        }
      }

      todo.push(() => reqExec(chan, cmd, opts, cb));
      todo.shift()();
    });

    return this;
  }

  shell(wndopts, opts, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    if (typeof wndopts === 'function') {
      cb = wndopts;
      wndopts = opts = undefined;
    } else if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (wndopts && (wndopts.x11 !== undefined || wndopts.env !== undefined)) {
      opts = wndopts;
      wndopts = undefined;
    }

    openChannel(this, 'session', (err, chan) => {
      if (err) {
        cb(err);
        return;
      }

      const todo = [];

      function reqCb(err) {
        if (err) {
          chan.close();
          cb(err);
          return;
        }
        if (todo.length)
          todo.shift()();
      }

      if (this.config.allowAgentFwd === true
          || (opts
              && opts.agentForward === true
              && this._agent !== undefined)) {
        todo.push(() => reqAgentFwd(chan, reqCb));
      }

      if (wndopts !== false)
        todo.push(() => reqPty(chan, wndopts, reqCb));

      if (typeof opts === 'object' && opts !== null) {
        if (typeof opts.env === 'object' && opts.env !== null)
          reqEnv(chan, opts.env);
        if ((typeof opts.x11 === 'object' && opts.x11 !== null)
            || opts.x11 === 'number'
            || opts.x11 === true) {
          todo.push(() => reqX11(chan, opts.x11, reqCb));
        }
      }

      todo.push(() => reqShell(chan, cb));
      todo.shift()();
    });

    return this;
  }

  subsys(name, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    openChannel(this, 'session', (err, chan) => {
      if (err) {
        cb(err);
        return;
      }

      reqSubsystem(chan, name, (err, stream) => {
        if (err) {
          cb(err);
          return;
        }

        cb(undefined, stream);
      });
    });

    return this;
  }

  forwardIn(bindAddr, bindPort, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    // Send a request for the server to start forwarding TCP connections to us
    // on a particular address and port

    const wantReply = (typeof cb === 'function');

    if (wantReply) {
      this._callbacks.push((had_err, data) => {
        if (had_err) {
          cb(had_err !== true
             ? had_err
             : new Error(`Unable to bind to ${bindAddr}:${bindPort}`));
          return;
        }

        let realPort = bindPort;
        if (bindPort === 0 && data && data.length >= 4) {
          realPort = readUInt32BE(data, 0);
          if (!(this._protocol._compatFlags & COMPAT.DYN_RPORT_BUG))
            bindPort = realPort;
        }

        this._forwarding[`${bindAddr}:${bindPort}`] = realPort;

        cb(undefined, realPort);
      });
    }

    this._protocol.tcpipForward(bindAddr, bindPort, wantReply);

    return this;
  }

  unforwardIn(bindAddr, bindPort, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    // Send a request to stop forwarding us new connections for a particular
    // address and port

    const wantReply = (typeof cb === 'function');

    if (wantReply) {
      this._callbacks.push((had_err) => {
        if (had_err) {
          cb(had_err !== true
             ? had_err
             : new Error(`Unable to unbind from ${bindAddr}:${bindPort}`));
          return;
        }

        delete this._forwarding[`${bindAddr}:${bindPort}`];

        cb();
      });
    }

    this._protocol.cancelTcpipForward(bindAddr, bindPort, wantReply);

    return this;
  }

  forwardOut(srcIP, srcPort, dstIP, dstPort, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    // Send a request to forward a TCP connection to the server

    const cfg = {
      srcIP: srcIP,
      srcPort: srcPort,
      dstIP: dstIP,
      dstPort: dstPort
    };

    if (typeof cb !== 'function')
      cb = noop;

    openChannel(this, 'direct-tcpip', cfg, cb);

    return this;
  }

  openssh_noMoreSessions(cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    const wantReply = (typeof cb === 'function');

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      if (wantReply) {
        this._callbacks.push((had_err) => {
          if (had_err) {
            cb(had_err !== true
               ? had_err
               : new Error('Unable to disable future sessions'));
            return;
          }

          cb();
        });
      }

      this._protocol.openssh_noMoreSessions(wantReply);
      return this;
    }

    if (!wantReply)
      return this;

    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  openssh_forwardInStreamLocal(socketPath, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    const wantReply = (typeof cb === 'function');

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      if (wantReply) {
        this._callbacks.push((had_err) => {
          if (had_err) {
            cb(had_err !== true
               ? had_err
               : new Error(`Unable to bind to ${socketPath}`));
            return;
          }
          this._forwardingUnix[socketPath] = true;
          cb();
        });
      }

      this._protocol.openssh_streamLocalForward(socketPath, wantReply);
      return this;
    }

    if (!wantReply)
      return this;

    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  openssh_unforwardInStreamLocal(socketPath, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    const wantReply = (typeof cb === 'function');

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      if (wantReply) {
        this._callbacks.push((had_err) => {
          if (had_err) {
            cb(had_err !== true
               ? had_err
               : new Error(`Unable to unbind from ${socketPath}`));
            return;
          }
          delete this._forwardingUnix[socketPath];
          cb();
        });
      }

      this._protocol.openssh_cancelStreamLocalForward(socketPath, wantReply);
      return this;
    }

    if (!wantReply)
      return this;

    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  openssh_forwardOutStreamLocal(socketPath, cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    if (typeof cb !== 'function')
      cb = noop;

    if (!this.config.strictVendor
        || (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
      openChannel(this, 'direct-streamlocal@openssh.com', { socketPath }, cb);
      return this;
    }
    process.nextTick(
      cb,
      new Error(
        'strictVendor enabled and server is not OpenSSH or compatible version'
      )
    );

    return this;
  }

  sftp(cb) {
    if (!this._sock || !isWritable(this._sock))
      throw new Error('Not connected');

    openChannel(this, 'sftp', (err, sftp) => {
      if (err) {
        cb(err);
        return;
      }

      reqSubsystem(sftp, 'sftp', (err, sftp_) => {
        if (err) {
          cb(err);
          return;
        }

        function removeListeners() {
          sftp.removeListener('ready', onReady);
          sftp.removeListener('error', onError);
          sftp.removeListener('exit', onExit);
          sftp.removeListener('close', onExit);
        }

        function onReady() {
          // TODO: do not remove exit/close in case remote end closes the
          // channel abruptly and we need to notify outstanding callbacks
          removeListeners();
          cb(undefined, sftp);
        }

        function onError(err) {
          removeListeners();
          cb(err);
        }

        function onExit(code, signal) {
          removeListeners();
          let msg;
          if (typeof code === 'number')
            msg = `Received exit code ${code} while establishing SFTP session`;
          else if (signal !== undefined)
            msg = `Received signal ${signal} while establishing SFTP session`;
          else
            msg = 'Received unexpected SFTP session termination';
          const err = new Error(msg);
          err.code = code;
          err.signal = signal;
          cb(err);
        }

        sftp.on('ready', onReady)
            .on('error', onError)
            .on('exit', onExit)
            .on('close', onExit);

        sftp._init();
      });
    });

    return this;
  }

  setNoDelay(noDelay) {
    if (this._sock && typeof this._sock.setNoDelay === 'function')
      this._sock.setNoDelay(noDelay);

    return this;
  }
}

function openChannel(self, type, opts, cb) {
  // Ask the server to open a channel for some purpose
  // (e.g. session (sftp, exec, shell), or forwarding a TCP connection
  const initWindow = MAX_WINDOW;
  const maxPacket = PACKET_SIZE;

  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  const wrapper = (err, stream) => {
    cb(err, stream);
  };
  wrapper.type = type;

  const localChan = self._chanMgr.add(wrapper);

  if (localChan === -1) {
    cb(new Error('No free channels available'));
    return;
  }

  switch (type) {
    case 'session':
    case 'sftp':
      self._protocol.session(localChan, initWindow, maxPacket);
      break;
    case 'direct-tcpip':
      self._protocol.directTcpip(localChan, initWindow, maxPacket, opts);
      break;
    case 'direct-streamlocal@openssh.com':
      self._protocol.openssh_directStreamLocal(
        localChan, initWindow, maxPacket, opts
      );
      break;
    default:
      throw new Error(`Unsupported channel type: ${type}`);
  }
}

function reqX11(chan, screen, cb) {
  // Asks server to start sending us X11 connections
  const cfg = {
    single: false,
    protocol: 'MIT-MAGIC-COOKIE-1',
    cookie: undefined,
    screen: 0
  };

  if (typeof screen === 'function') {
    cb = screen;
  } else if (typeof screen === 'object' && screen !== null) {
    if (typeof screen.single === 'boolean')
      cfg.single = screen.single;
    if (typeof screen.screen === 'number')
      cfg.screen = screen.screen;
    if (typeof screen.protocol === 'string')
      cfg.protocol = screen.protocol;
    if (typeof screen.cookie === 'string')
      cfg.cookie = screen.cookie;
    else if (Buffer.isBuffer(screen.cookie))
      cfg.cookie = screen.cookie.hexSlice(0, screen.cookie.length);
  }
  if (cfg.cookie === undefined)
    cfg.cookie = randomCookie();

  const wantReply = (typeof cb === 'function');

  if (chan.outgoing.state !== 'open') {
    if (wantReply)
      cb(new Error('Channel is not open'));
    return;
  }

  if (wantReply) {
    chan._callbacks.push((had_err) => {
      if (had_err) {
        cb(had_err !== true ? had_err : new Error('Unable to request X11'));
        return;
      }

      chan._hasX11 = true;
      ++chan._client._acceptX11;
      chan.once('close', () => {
        if (chan._client._acceptX11)
          --chan._client._acceptX11;
      });

      cb();
    });
  }

  chan._client._protocol.x11Forward(chan.outgoing.id, cfg, wantReply);
}

function reqPty(chan, opts, cb) {
  let rows = 24;
  let cols = 80;
  let width = 640;
  let height = 480;
  let term = 'vt100';
  let modes = null;

  if (typeof opts === 'function') {
    cb = opts;
  } else if (typeof opts === 'object' && opts !== null) {
    if (typeof opts.rows === 'number')
      rows = opts.rows;
    if (typeof opts.cols === 'number')
      cols = opts.cols;
    if (typeof opts.width === 'number')
      width = opts.width;
    if (typeof opts.height === 'number')
      height = opts.height;
    if (typeof opts.term === 'string')
      term = opts.term;
    if (typeof opts.modes === 'object')
      modes = opts.modes;
  }

  const wantReply = (typeof cb === 'function');

  if (chan.outgoing.state !== 'open') {
    if (wantReply)
      cb(new Error('Channel is not open'));
    return;
  }

  if (wantReply) {
    chan._callbacks.push((had_err) => {
      if (had_err) {
        cb(had_err !== true
           ? had_err
           : new Error('Unable to request a pseudo-terminal'));
        return;
      }
      cb();
    });
  }

  chan._client._protocol.pty(chan.outgoing.id,
                             rows,
                             cols,
                             height,
                             width,
                             term,
                             modes,
                             wantReply);
}

function reqAgentFwd(chan, cb) {
  const wantReply = (typeof cb === 'function');

  if (chan.outgoing.state !== 'open') {
    wantReply && cb(new Error('Channel is not open'));
    return;
  }
  if (chan._client._agentFwdEnabled) {
    wantReply && cb(false);
    return;
  }

  chan._client._agentFwdEnabled = true;

  chan._callbacks.push((had_err) => {
    if (had_err) {
      chan._client._agentFwdEnabled = false;
      if (wantReply) {
        cb(had_err !== true
           ? had_err
           : new Error('Unable to request agent forwarding'));
      }
      return;
    }

    if (wantReply)
      cb();
  });

  chan._client._protocol.openssh_agentForward(chan.outgoing.id, true);
}

function reqShell(chan, cb) {
  if (chan.outgoing.state !== 'open') {
    cb(new Error('Channel is not open'));
    return;
  }

  chan._callbacks.push((had_err) => {
    if (had_err) {
      cb(had_err !== true ? had_err : new Error('Unable to open shell'));
      return;
    }
    chan.subtype = 'shell';
    cb(undefined, chan);
  });

  chan._client._protocol.shell(chan.outgoing.id, true);
}

function reqExec(chan, cmd, opts, cb) {
  if (chan.outgoing.state !== 'open') {
    cb(new Error('Channel is not open'));
    return;
  }

  chan._callbacks.push((had_err) => {
    if (had_err) {
      cb(had_err !== true ? had_err : new Error('Unable to exec'));
      return;
    }
    chan.subtype = 'exec';
    chan.allowHalfOpen = (opts.allowHalfOpen !== false);
    cb(undefined, chan);
  });

  chan._client._protocol.exec(chan.outgoing.id, cmd, true);
}

function reqEnv(chan, env) {
  if (chan.outgoing.state !== 'open')
    return;

  const keys = Object.keys(env || {});

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    const val = env[key];
    chan._client._protocol.env(chan.outgoing.id, key, val, false);
  }
}

function reqSubsystem(chan, name, cb) {
  if (chan.outgoing.state !== 'open') {
    cb(new Error('Channel is not open'));
    return;
  }

  chan._callbacks.push((had_err) => {
    if (had_err) {
      cb(had_err !== true
         ? had_err
         : new Error(`Unable to start subsystem: ${name}`));
      return;
    }
    chan.subtype = 'subsystem';
    cb(undefined, chan);
  });

  chan._client._protocol.subsystem(chan.outgoing.id, name, true);
}

// TODO: inline implementation into single call site
function onCHANNEL_OPEN(self, info) {
  // The server is trying to open a channel with us, this is usually when
  // we asked the server to forward us connections on some port and now they
  // are asking us to accept/deny an incoming connection on their side

  let localChan = -1;
  let reason;

  const accept = () => {
    const chanInfo = {
      type: info.type,
      incoming: {
        id: localChan,
        window: MAX_WINDOW,
        packetSize: PACKET_SIZE,
        state: 'open'
      },
      outgoing: {
        id: info.sender,
        window: info.window,
        packetSize: info.packetSize,
        state: 'open'
      }
    };
    const stream = new Channel(self, chanInfo);
    self._chanMgr.update(localChan, stream);

    self._protocol.channelOpenConfirm(info.sender,
                                      localChan,
                                      MAX_WINDOW,
                                      PACKET_SIZE);
    return stream;
  };
  const reject = () => {
    if (reason === undefined) {
      if (localChan === -1)
        reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
      else
        reason = CHANNEL_OPEN_FAILURE.CONNECT_FAILED;
    }

    if (localChan !== -1)
      self._chanMgr.remove(localChan);

    self._protocol.channelOpenFail(info.sender, reason, '');
  };
  const reserveChannel = () => {
    localChan = self._chanMgr.add();

    if (localChan === -1) {
      reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
      if (self.config.debug) {
        self.config.debug(
          'Client: Automatic rejection of incoming channel open: '
            + 'no channels available'
        );
      }
    }

    return (localChan !== -1);
  };

  const data = info.data;
  switch (info.type) {
    case 'forwarded-tcpip': {
      const val = self._forwarding[`${data.destIP}:${data.destPort}`];
      if (val !== undefined && reserveChannel()) {
        if (data.destPort === 0)
          data.destPort = val;
        self.emit('tcp connection', data, accept, reject);
        return;
      }
      break;
    }
    case 'forwarded-streamlocal@openssh.com':
      if (self._forwardingUnix[data.socketPath] !== undefined
          && reserveChannel()) {
        self.emit('unix connection', data, accept, reject);
        return;
      }
      break;
    case 'auth-agent@openssh.com':
      if (self._agentFwdEnabled
          && typeof self._agent.getStream === 'function'
          && reserveChannel()) {
        self._agent.getStream((err, stream) => {
          if (err)
            return reject();

          const upstream = accept();
          upstream.pipe(stream).pipe(upstream);
        });
        return;
      }
      break;
    case 'x11':
      if (self._acceptX11 !== 0 && reserveChannel()) {
        self.emit('x11', data, accept, reject);
        return;
      }
      break;
    default:
      // Automatically reject any unsupported channel open requests
      reason = CHANNEL_OPEN_FAILURE.UNKNOWN_CHANNEL_TYPE;
      if (self.config.debug) {
        self.config.debug(
          'Client: Automatic rejection of unsupported incoming channel open '
            + `type: ${info.type}`
        );
      }
  }

  if (reason === undefined) {
    reason = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
    if (self.config.debug) {
       self.config.debug(
        'Client: Automatic rejection of unexpected incoming channel open for: '
          + info.type
      );
    }
  }

  reject();
}

const randomCookie = (() => {
  const buffer = Buffer.allocUnsafe(16);
  return () => {
    randomFillSync(buffer, 0, 16);
    return buffer.hexSlice(0, 16);
  };
})();

function makeSimpleAuthHandler(authList) {
  if (!Array.isArray(authList))
    throw new Error('authList must be an array');

  let a = 0;
  return (authsLeft, partialSuccess, cb) => {
    if (a === authList.length)
      return false;
    return authList[a++];
  };
}

function hostKeysProve(client, keys_, cb) {
  if (!client._sock || !isWritable(client._sock))
    return;

  if (typeof cb !== 'function')
    cb = noop;

  if (!Array.isArray(keys_))
    throw new TypeError('Invalid keys argument type');

  const keys = [];
  for (const key of keys_) {
    const parsed = parseKey(key);
    if (parsed instanceof Error)
      throw parsed;
    keys.push(parsed);
  }

  if (!client.config.strictVendor
      || (client.config.strictVendor && RE_OPENSSH.test(client._remoteVer))) {
    client._callbacks.push((had_err, data) => {
      if (had_err) {
        cb(had_err !== true
           ? had_err
           : new Error('Server failed to prove supplied keys'));
        return;
      }

      // TODO: move all of this parsing/verifying logic out of the client?
      const ret = [];
      let keyIdx = 0;
      bufferParser.init(data, 0);
      while (bufferParser.avail()) {
        if (keyIdx === keys.length)
          break;
        const key = keys[keyIdx++];
        const keyPublic = key.getPublicSSH();

        const sigEntry = bufferParser.readString();
        sigParser.init(sigEntry, 0);
        const type = sigParser.readString(true);
        let value = sigParser.readString();

        let algo;
        if (type !== key.type) {
          if (key.type === 'ssh-rsa') {
            switch (type) {
              case 'rsa-sha2-256':
                algo = 'sha256';
                break;
              case 'rsa-sha2-512':
                algo = 'sha512';
                break;
              default:
                continue;
            }
          } else {
            continue;
          }
        }

        const sessionID = client._protocol._kex.sessionID;
        const verifyData = Buffer.allocUnsafe(
          4 + 29 + 4 + sessionID.length + 4 + keyPublic.length
        );
        let p = 0;
        writeUInt32BE(verifyData, 29, p);
        verifyData.utf8Write('hostkeys-prove-00@openssh.com', p += 4, 29);
        writeUInt32BE(verifyData, sessionID.length, p += 29);
        bufferCopy(sessionID, verifyData, 0, sessionID.length, p += 4);
        writeUInt32BE(verifyData, keyPublic.length, p += sessionID.length);
        bufferCopy(keyPublic, verifyData, 0, keyPublic.length, p += 4);

        if (!(value = sigSSHToASN1(value, type)))
          continue;
        if (key.verify(verifyData, value, algo) === true)
          ret.push(key);
      }
      sigParser.clear();
      bufferParser.clear();

      cb(null, ret);
    });

    client._protocol.openssh_hostKeysProve(keys);
    return;
  }

  process.nextTick(
    cb,
    new Error(
      'strictVendor enabled and server is not OpenSSH or compatible version'
    )
  );
}

function getKeyAlgos(client, key, serverSigAlgs) {
  switch (key.type) {
    case 'ssh-rsa':
      if (client._protocol._compatFlags & COMPAT.IMPLY_RSA_SHA2_SIGALGS) {
        if (!Array.isArray(serverSigAlgs))
          serverSigAlgs = ['rsa-sha2-256', 'rsa-sha2-512'];
        else
          serverSigAlgs = ['rsa-sha2-256', 'rsa-sha2-512', ...serverSigAlgs];
      }
      if (Array.isArray(serverSigAlgs)) {
        if (serverSigAlgs.indexOf('rsa-sha2-256') !== -1)
          return [['rsa-sha2-256', 'sha256']];
        if (serverSigAlgs.indexOf('rsa-sha2-512') !== -1)
          return [['rsa-sha2-512', 'sha512']];
        if (serverSigAlgs.indexOf('ssh-rsa') === -1)
          return [];
      }
      return [['ssh-rsa', 'sha1']];
  }
}

module.exports = Client;
