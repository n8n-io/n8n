// TODO:
//   * convert listenerCount() usage to emit() return value checking?
//   * emit error when connection severed early (e.g. before handshake)
//   * add '.connected' or similar property to connection objects to allow
//     immediate connection status checking
'use strict';

const { Server: netServer } = require('net');
const EventEmitter = require('events');
const { listenerCount } = EventEmitter;

const {
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
const { KexInit } = require('./protocol/kex.js');
const { parseKey } = require('./protocol/keyParser.js');
const Protocol = require('./protocol/Protocol.js');
const { SFTP } = require('./protocol/SFTP.js');
const { writeUInt32BE } = require('./protocol/utils.js');

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

const MAX_PENDING_AUTHS = 10;

class AuthContext extends EventEmitter {
  constructor(protocol, username, service, method, cb) {
    super();

    this.username = this.user = username;
    this.service = service;
    this.method = method;
    this._initialResponse = false;
    this._finalResponse = false;
    this._multistep = false;
    this._cbfinal = (allowed, methodsLeft, isPartial) => {
      if (!this._finalResponse) {
        this._finalResponse = true;
        cb(this, allowed, methodsLeft, isPartial);
      }
    };
    this._protocol = protocol;
  }

  accept() {
    this._cleanup && this._cleanup();
    this._initialResponse = true;
    this._cbfinal(true);
  }
  reject(methodsLeft, isPartial) {
    this._cleanup && this._cleanup();
    this._initialResponse = true;
    this._cbfinal(false, methodsLeft, isPartial);
  }
}


class KeyboardAuthContext extends AuthContext {
  constructor(protocol, username, service, method, submethods, cb) {
    super(protocol, username, service, method, cb);

    this._multistep = true;

    this._cb = undefined;
    this._onInfoResponse = (responses) => {
      const callback = this._cb;
      if (callback) {
        this._cb = undefined;
        callback(responses);
      }
    };
    this.submethods = submethods;
    this.on('abort', () => {
      this._cb && this._cb(new Error('Authentication request aborted'));
    });
  }

  prompt(prompts, title, instructions, cb) {
    if (!Array.isArray(prompts))
      prompts = [ prompts ];

    if (typeof title === 'function') {
      cb = title;
      title = instructions = undefined;
    } else if (typeof instructions === 'function') {
      cb = instructions;
      instructions = undefined;
    } else if (typeof cb !== 'function') {
      cb = undefined;
    }

    for (let i = 0; i < prompts.length; ++i) {
      if (typeof prompts[i] === 'string') {
        prompts[i] = {
          prompt: prompts[i],
          echo: true
        };
      }
    }

    this._cb = cb;
    this._initialResponse = true;

    this._protocol.authInfoReq(title, instructions, prompts);
  }
}

class PKAuthContext extends AuthContext {
  constructor(protocol, username, service, method, pkInfo, cb) {
    super(protocol, username, service, method, cb);

    this.key = { algo: pkInfo.keyAlgo, data: pkInfo.key };
    this.hashAlgo = pkInfo.hashAlgo;
    this.signature = pkInfo.signature;
    this.blob = pkInfo.blob;
  }

  accept() {
    if (!this.signature) {
      this._initialResponse = true;
      this._protocol.authPKOK(this.key.algo, this.key.data);
    } else {
      AuthContext.prototype.accept.call(this);
    }
  }
}

class HostbasedAuthContext extends AuthContext {
  constructor(protocol, username, service, method, pkInfo, cb) {
    super(protocol, username, service, method, cb);

    this.key = { algo: pkInfo.keyAlgo, data: pkInfo.key };
    this.hashAlgo = pkInfo.hashAlgo;
    this.signature = pkInfo.signature;
    this.blob = pkInfo.blob;
    this.localHostname = pkInfo.localHostname;
    this.localUsername = pkInfo.localUsername;
  }
}

class PwdAuthContext extends AuthContext {
  constructor(protocol, username, service, method, password, cb) {
    super(protocol, username, service, method, cb);

    this.password = password;
    this._changeCb = undefined;
  }

  requestChange(prompt, cb) {
    if (this._changeCb)
      throw new Error('Change request already in progress');
    if (typeof prompt !== 'string')
      throw new Error('prompt argument must be a string');
    if (typeof cb !== 'function')
      throw new Error('Callback argument must be a function');
    this._changeCb = cb;
    this._protocol.authPasswdChg(prompt);
  }
}


class Session extends EventEmitter {
  constructor(client, info, localChan) {
    super();

    this.type = 'session';
    this.subtype = undefined;
    this.server = true;
    this._ending = false;
    this._channel = undefined;
    this._chanInfo = {
      type: 'session',
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
  }
}


class Server extends EventEmitter {
  constructor(cfg, listener) {
    super();

    if (typeof cfg !== 'object' || cfg === null)
      throw new Error('Missing configuration object');

    const hostKeys = Object.create(null);
    const hostKeyAlgoOrder = [];

    const hostKeys_ = cfg.hostKeys;
    if (!Array.isArray(hostKeys_))
      throw new Error('hostKeys must be an array');

    const cfgAlgos = (
      typeof cfg.algorithms === 'object' && cfg.algorithms !== null
      ? cfg.algorithms
      : {}
    );

    const hostKeyAlgos = generateAlgorithmList(
      cfgAlgos.serverHostKey,
      DEFAULT_SERVER_HOST_KEY,
      SUPPORTED_SERVER_HOST_KEY
    );
    for (let i = 0; i < hostKeys_.length; ++i) {
      let privateKey;
      if (Buffer.isBuffer(hostKeys_[i]) || typeof hostKeys_[i] === 'string')
        privateKey = parseKey(hostKeys_[i]);
      else
        privateKey = parseKey(hostKeys_[i].key, hostKeys_[i].passphrase);

      if (privateKey instanceof Error)
        throw new Error(`Cannot parse privateKey: ${privateKey.message}`);

      if (Array.isArray(privateKey)) {
        // OpenSSH's newer format only stores 1 key for now
        privateKey = privateKey[0];
      }

      if (privateKey.getPrivatePEM() === null)
        throw new Error('privateKey value contains an invalid private key');

      // Discard key if we already found a key of the same type
      if (hostKeyAlgoOrder.includes(privateKey.type))
        continue;

      if (privateKey.type === 'ssh-rsa') {
        // SSH supports multiple signature hashing algorithms for RSA, so we add
        // the algorithms in the desired order
        let sha1Pos = hostKeyAlgos.indexOf('ssh-rsa');
        const sha256Pos = hostKeyAlgos.indexOf('rsa-sha2-256');
        const sha512Pos = hostKeyAlgos.indexOf('rsa-sha2-512');
        if (sha1Pos === -1) {
          // Fall back to giving SHA1 the lowest priority
          sha1Pos = Infinity;
        }
        [sha1Pos, sha256Pos, sha512Pos].sort(compareNumbers).forEach((pos) => {
          if (pos === -1)
            return;

          let type;
          switch (pos) {
            case sha1Pos: type = 'ssh-rsa'; break;
            case sha256Pos: type = 'rsa-sha2-256'; break;
            case sha512Pos: type = 'rsa-sha2-512'; break;
            default: return;
          }

          // Store same RSA key under each hash algorithm name for convenience
          hostKeys[type] = privateKey;

          hostKeyAlgoOrder.push(type);
        });
      } else {
        hostKeys[privateKey.type] = privateKey;
        hostKeyAlgoOrder.push(privateKey.type);
      }
    }

    const algorithms = {
      kex: generateAlgorithmList(
        cfgAlgos.kex,
        DEFAULT_KEX,
        SUPPORTED_KEX
      ).concat(['kex-strict-s-v00@openssh.com']),
      serverHostKey: hostKeyAlgoOrder,
      cs: {
        cipher: generateAlgorithmList(
                  cfgAlgos.cipher,
                  DEFAULT_CIPHER,
                  SUPPORTED_CIPHER
                ),
        mac: generateAlgorithmList(cfgAlgos.hmac, DEFAULT_MAC, SUPPORTED_MAC),
        compress: generateAlgorithmList(
                    cfgAlgos.compress,
                    DEFAULT_COMPRESSION,
                    SUPPORTED_COMPRESSION
                  ),
        lang: [],
      },
      sc: undefined,
    };
    algorithms.sc = algorithms.cs;

    if (typeof listener === 'function')
      this.on('connection', listener);

    const origDebug = (typeof cfg.debug === 'function' ? cfg.debug : undefined);
    const ident = (cfg.ident ? Buffer.from(cfg.ident) : undefined);
    const offer = new KexInit(algorithms);

    this._srv = new netServer((socket) => {
      if (this._connections >= this.maxConnections) {
        socket.destroy();
        return;
      }
      ++this._connections;
      socket.once('close', () => {
        --this._connections;
      });

      let debug;
      if (origDebug) {
        // Prepend debug output with a unique identifier in case there are
        // multiple clients connected at the same time
        const debugPrefix = `[${process.hrtime().join('.')}] `;
        debug = (msg) => {
          origDebug(`${debugPrefix}${msg}`);
        };
      }

      // eslint-disable-next-line no-use-before-define
      new Client(socket, hostKeys, ident, offer, debug, this, cfg);
    }).on('error', (err) => {
      this.emit('error', err);
    }).on('listening', () => {
      this.emit('listening');
    }).on('close', () => {
      this.emit('close');
    });
    this._connections = 0;
    this.maxConnections = Infinity;
  }

  injectSocket(socket) {
    this._srv.emit('connection', socket);
  }

  listen(...args) {
    this._srv.listen(...args);
    return this;
  }

  address() {
    return this._srv.address();
  }

  getConnections(cb) {
    this._srv.getConnections(cb);
    return this;
  }

  close(cb) {
    this._srv.close(cb);
    return this;
  }

  ref() {
    this._srv.ref();
    return this;
  }

  unref() {
    this._srv.unref();
    return this;
  }
}
Server.KEEPALIVE_CLIENT_INTERVAL = 15000;
Server.KEEPALIVE_CLIENT_COUNT_MAX = 3;


class Client extends EventEmitter {
  constructor(socket, hostKeys, ident, offer, debug, server, srvCfg) {
    super();

    let exchanges = 0;
    let acceptedAuthSvc = false;
    let pendingAuths = [];
    let authCtx;
    let kaTimer;
    let onPacket;
    const unsentGlobalRequestsReplies = [];
    this._sock = socket;
    this._chanMgr = new ChannelManager(this);
    this._debug = debug;
    this.noMoreSessions = false;
    this.authenticated = false;

    // Silence pre-header errors
    function onClientPreHeaderError(err) {}
    this.on('error', onClientPreHeaderError);

    const DEBUG_HANDLER = (!debug ? undefined : (p, display, msg) => {
      debug(`Debug output from client: ${JSON.stringify(msg)}`);
    });

    const kaIntvl = (
      typeof srvCfg.keepaliveInterval === 'number'
        && isFinite(srvCfg.keepaliveInterval)
        && srvCfg.keepaliveInterval > 0
      ? srvCfg.keepaliveInterval
      : (
        typeof Server.KEEPALIVE_CLIENT_INTERVAL === 'number'
          && isFinite(Server.KEEPALIVE_CLIENT_INTERVAL)
          && Server.KEEPALIVE_CLIENT_INTERVAL > 0
        ? Server.KEEPALIVE_CLIENT_INTERVAL
        : -1
      )
    );
    const kaCountMax = (
      typeof srvCfg.keepaliveCountMax === 'number'
        && isFinite(srvCfg.keepaliveCountMax)
        && srvCfg.keepaliveCountMax >= 0
      ? srvCfg.keepaliveCountMax
      : (
        typeof Server.KEEPALIVE_CLIENT_COUNT_MAX === 'number'
          && isFinite(Server.KEEPALIVE_CLIENT_COUNT_MAX)
          && Server.KEEPALIVE_CLIENT_COUNT_MAX >= 0
        ? Server.KEEPALIVE_CLIENT_COUNT_MAX
        : -1
      )
    );
    let kaCurCount = 0;
    if (kaIntvl !== -1 && kaCountMax !== -1) {
      this.once('ready', () => {
        const onClose = () => {
          clearInterval(kaTimer);
        };
        this.on('close', onClose).on('end', onClose);
        kaTimer = setInterval(() => {
          if (++kaCurCount > kaCountMax) {
            clearInterval(kaTimer);
            const err = new Error('Keepalive timeout');
            err.level = 'client-timeout';
            this.emit('error', err);
            this.end();
          } else {
            // XXX: if the server ever starts sending real global requests to
            //      the client, we will need to add a dummy callback here to
            //      keep the correct reply order
            proto.ping();
          }
        }, kaIntvl);
      });
      // TODO: re-verify keepalive behavior with OpenSSH
      onPacket = () => {
        kaTimer && kaTimer.refresh();
        kaCurCount = 0;
      };
    }

    const proto = this._protocol = new Protocol({
      server: true,
      hostKeys,
      ident,
      offer,
      onPacket,
      greeting: srvCfg.greeting,
      banner: srvCfg.banner,
      onWrite: (data) => {
        if (isWritable(socket))
          socket.write(data);
      },
      onError: (err) => {
        if (!proto._destruct)
          socket.removeAllListeners('data');
        this.emit('error', err);
        try {
          socket.end();
        } catch {}
      },
      onHeader: (header) => {
        this.removeListener('error', onClientPreHeaderError);

        const info = {
          ip: socket.remoteAddress,
          family: socket.remoteFamily,
          port: socket.remotePort,
          header,
        };
        if (!server.emit('connection', this, info)) {
          // auto reject
          proto.disconnect(DISCONNECT_REASON.BY_APPLICATION);
          socket.end();
          return;
        }

        if (header.greeting)
          this.emit('greeting', header.greeting);
      },
      onHandshakeComplete: (negotiated) => {
        if (++exchanges > 1)
          this.emit('rekey');
        this.emit('handshake', negotiated);
      },
      debug,
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
          socket.end();
        },
        CHANNEL_OPEN: (p, info) => {
          // Handle incoming requests from client

          // Do early reject in some cases to prevent wasteful channel
          // allocation
          if ((info.type === 'session' && this.noMoreSessions)
              || !this.authenticated) {
            const reasonCode = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
            return proto.channelOpenFail(info.sender, reasonCode);
          }

          let localChan = -1;
          let reason;
          let replied = false;

          let accept;
          const reject = () => {
            if (replied)
              return;
            replied = true;

            if (reason === undefined) {
              if (localChan === -1)
                reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
              else
                reason = CHANNEL_OPEN_FAILURE.CONNECT_FAILED;
            }

            if (localChan !== -1)
              this._chanMgr.remove(localChan);
            proto.channelOpenFail(info.sender, reason, '');
          };
          const reserveChannel = () => {
            localChan = this._chanMgr.add();

            if (localChan === -1) {
              reason = CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
              if (debug) {
                debug('Automatic rejection of incoming channel open: '
                        + 'no channels available');
              }
            }

            return (localChan !== -1);
          };

          const data = info.data;
          switch (info.type) {
            case 'session':
              if (listenerCount(this, 'session') && reserveChannel()) {
                accept = () => {
                  if (replied)
                    return;
                  replied = true;

                  const instance = new Session(this, info, localChan);
                  this._chanMgr.update(localChan, instance);

                  proto.channelOpenConfirm(info.sender,
                                           localChan,
                                           MAX_WINDOW,
                                           PACKET_SIZE);

                  return instance;
                };

                this.emit('session', accept, reject);
                return;
              }
              break;
            case 'direct-tcpip':
              if (listenerCount(this, 'tcpip') && reserveChannel()) {
                accept = () => {
                  if (replied)
                    return;
                  replied = true;

                  const chanInfo = {
                    type: undefined,
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

                  const stream = new Channel(this, chanInfo, { server: true });
                  this._chanMgr.update(localChan, stream);

                  proto.channelOpenConfirm(info.sender,
                                           localChan,
                                           MAX_WINDOW,
                                           PACKET_SIZE);

                  return stream;
                };

                this.emit('tcpip', accept, reject, data);
                return;
              }
              break;
            case 'direct-streamlocal@openssh.com':
              if (listenerCount(this, 'openssh.streamlocal')
                  && reserveChannel()) {
                accept = () => {
                  if (replied)
                    return;
                  replied = true;

                  const chanInfo = {
                    type: undefined,
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

                  const stream = new Channel(this, chanInfo, { server: true });
                  this._chanMgr.update(localChan, stream);

                  proto.channelOpenConfirm(info.sender,
                                           localChan,
                                           MAX_WINDOW,
                                           PACKET_SIZE);

                  return stream;
                };

                this.emit('openssh.streamlocal', accept, reject, data);
                return;
              }
              break;
            default:
              // Automatically reject any unsupported channel open requests
              reason = CHANNEL_OPEN_FAILURE.UNKNOWN_CHANNEL_TYPE;
              if (debug) {
                debug('Automatic rejection of unsupported incoming channel open'
                        + ` type: ${info.type}`);
              }
          }

          if (reason === undefined) {
            reason = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
            if (debug) {
              debug('Automatic rejection of unexpected incoming channel open'
                      + ` for: ${info.type}`);
            }
          }

          reject();
        },
        CHANNEL_OPEN_CONFIRMATION: (p, info) => {
          const channel = this._chanMgr.get(info.recipient);
          if (typeof channel !== 'function')
            return;

          const chanInfo = {
            type: channel.type,
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

          const instance = new Channel(this, chanInfo, { server: true });
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
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

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
          // NOOP -- should not be sent by client
        },
        CHANNEL_WINDOW_ADJUST: (p, recipient, amount) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

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
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

          if (channel._callbacks.length)
            channel._callbacks.shift()(false);
        },
        CHANNEL_FAILURE: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel = channel._channel;
            if (!channel)
              return;
          }

          if (channel._callbacks.length)
            channel._callbacks.shift()(true);
        },
        CHANNEL_REQUEST: (p, recipient, type, wantReply, data) => {
          const session = this._chanMgr.get(recipient);
          if (typeof session !== 'object' || session === null)
            return;

          let replied = false;
          let accept;
          let reject;

          if (session.constructor !== Session) {
            // normal Channel instance
            if (wantReply)
              proto.channelFailure(session.outgoing.id);
            return;
          }

          if (wantReply) {
            // "real session" requests will have custom accept behaviors
            if (type !== 'shell'
                && type !== 'exec'
                && type !== 'subsystem') {
              accept = () => {
                if (replied || session._ending || session._channel)
                  return;
                replied = true;

                proto.channelSuccess(session._chanInfo.outgoing.id);
              };
            }

            reject = () => {
              if (replied || session._ending || session._channel)
                return;
              replied = true;

              proto.channelFailure(session._chanInfo.outgoing.id);
            };
          }

          if (session._ending) {
            reject && reject();
            return;
          }

          switch (type) {
            // "pre-real session start" requests
            case 'env':
              if (listenerCount(session, 'env')) {
                session.emit('env', accept, reject, {
                  key: data.name,
                  val: data.value
                });
                return;
              }
              break;
            case 'pty-req':
              if (listenerCount(session, 'pty')) {
                session.emit('pty', accept, reject, data);
                return;
              }
              break;
            case 'window-change':
              if (listenerCount(session, 'window-change'))
                session.emit('window-change', accept, reject, data);
              else
                reject && reject();
              break;
            case 'x11-req':
              if (listenerCount(session, 'x11')) {
                session.emit('x11', accept, reject, data);
                return;
              }
              break;
            // "post-real session start" requests
            case 'signal':
              if (listenerCount(session, 'signal')) {
                session.emit('signal', accept, reject, {
                  name: data
                });
                return;
              }
              break;
            // XXX: is `auth-agent-req@openssh.com` really "post-real session
            // start"?
            case 'auth-agent-req@openssh.com':
              if (listenerCount(session, 'auth-agent')) {
                session.emit('auth-agent', accept, reject);
                return;
              }
              break;
            // "real session start" requests
            case 'shell':
              if (listenerCount(session, 'shell')) {
                accept = () => {
                  if (replied || session._ending || session._channel)
                    return;
                  replied = true;

                  if (wantReply)
                    proto.channelSuccess(session._chanInfo.outgoing.id);

                  const channel = new Channel(
                    this, session._chanInfo, { server: true }
                  );

                  channel.subtype = session.subtype = type;
                  session._channel = channel;

                  return channel;
                };

                session.emit('shell', accept, reject);
                return;
              }
              break;
            case 'exec':
              if (listenerCount(session, 'exec')) {
                accept = () => {
                  if (replied || session._ending || session._channel)
                    return;
                  replied = true;

                  if (wantReply)
                    proto.channelSuccess(session._chanInfo.outgoing.id);

                  const channel = new Channel(
                    this, session._chanInfo, { server: true }
                  );

                  channel.subtype = session.subtype = type;
                  session._channel = channel;

                  return channel;
                };

                session.emit('exec', accept, reject, {
                  command: data
                });
                return;
              }
              break;
            case 'subsystem': {
              let useSFTP = (data === 'sftp');
              accept = () => {
                if (replied || session._ending || session._channel)
                  return;
                replied = true;

                if (wantReply)
                  proto.channelSuccess(session._chanInfo.outgoing.id);

                let instance;
                if (useSFTP) {
                  instance = new SFTP(this, session._chanInfo, {
                    server: true,
                    debug,
                  });
                } else {
                  instance = new Channel(
                    this, session._chanInfo, { server: true }
                  );
                  instance.subtype =
                    session.subtype = `${type}:${data}`;
                }
                session._channel = instance;

                return instance;
              };

              if (data === 'sftp') {
                if (listenerCount(session, 'sftp')) {
                  session.emit('sftp', accept, reject);
                  return;
                }
                useSFTP = false;
              }
              if (listenerCount(session, 'subsystem')) {
                session.emit('subsystem', accept, reject, {
                  name: data
                });
                return;
              }
              break;
            }
          }
          debug && debug(
            `Automatic rejection of incoming channel request: ${type}`
          );
          reject && reject();
        },
        CHANNEL_EOF: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            if (!channel._ending) {
              channel._ending = true;
              channel.emit('eof');
              channel.emit('end');
            }
            channel = channel._channel;
            if (!channel)
              return;
          }

          if (channel.incoming.state !== 'open')
            return;
          channel.incoming.state = 'eof';

          if (channel.readable)
            channel.push(null);
        },
        CHANNEL_CLOSE: (p, recipient) => {
          let channel = this._chanMgr.get(recipient);
          if (typeof channel !== 'object' || channel === null)
            return;

          if (channel.constructor === Session) {
            channel._ending = true;
            channel.emit('close');
            channel = channel._channel;
            if (!channel)
              return;
          }

          onCHANNEL_CLOSE(this, recipient, channel);
        },
        // Begin service/auth-related ==========================================
        SERVICE_REQUEST: (p, service) => {
          if (exchanges === 0
              || acceptedAuthSvc
              || this.authenticated
              || service !== 'ssh-userauth') {
            proto.disconnect(DISCONNECT_REASON.SERVICE_NOT_AVAILABLE);
            socket.end();
            return;
          }

          acceptedAuthSvc = true;
          proto.serviceAccept(service);
        },
        USERAUTH_REQUEST: (p, username, service, method, methodData) => {
          if (exchanges === 0
              || this.authenticated
              || (authCtx
                  && (authCtx.username !== username
                      || authCtx.service !== service))
                // TODO: support hostbased auth
              || (method !== 'password'
                  && method !== 'publickey'
                  && method !== 'hostbased'
                  && method !== 'keyboard-interactive'
                  && method !== 'none')
              || pendingAuths.length === MAX_PENDING_AUTHS) {
            proto.disconnect(DISCONNECT_REASON.PROTOCOL_ERROR);
            socket.end();
            return;
          } else if (service !== 'ssh-connection') {
            proto.disconnect(DISCONNECT_REASON.SERVICE_NOT_AVAILABLE);
            socket.end();
            return;
          }

          let ctx;
          switch (method) {
            case 'keyboard-interactive':
              ctx = new KeyboardAuthContext(proto, username, service, method,
                                            methodData, onAuthDecide);
              break;
            case 'publickey':
              ctx = new PKAuthContext(proto, username, service, method,
                                      methodData, onAuthDecide);
              break;
            case 'hostbased':
              ctx = new HostbasedAuthContext(proto, username, service, method,
                                             methodData, onAuthDecide);
              break;
            case 'password':
              if (authCtx
                  && authCtx instanceof PwdAuthContext
                  && authCtx._changeCb) {
                const cb = authCtx._changeCb;
                authCtx._changeCb = undefined;
                cb(methodData.newPassword);
                return;
              }
              ctx = new PwdAuthContext(proto, username, service, method,
                                       methodData, onAuthDecide);
              break;
            case 'none':
              ctx = new AuthContext(proto, username, service, method,
                                    onAuthDecide);
              break;
          }

          if (authCtx) {
            if (!authCtx._initialResponse) {
              return pendingAuths.push(ctx);
            } else if (authCtx._multistep && !authCtx._finalResponse) {
              // RFC 4252 says to silently abort the current auth request if a
              // new auth request comes in before the final response from an
              // auth method that requires additional request/response exchanges
              // -- this means keyboard-interactive for now ...
              authCtx._cleanup && authCtx._cleanup();
              authCtx.emit('abort');
            }
          }

          authCtx = ctx;

          if (listenerCount(this, 'authentication'))
            this.emit('authentication', authCtx);
          else
            authCtx.reject();
        },
        USERAUTH_INFO_RESPONSE: (p, responses) => {
          if (authCtx && authCtx instanceof KeyboardAuthContext)
            authCtx._onInfoResponse(responses);
        },
        // End service/auth-related ============================================
        GLOBAL_REQUEST: (p, name, wantReply, data) => {
          const reply = {
            type: null,
            buf: null
          };

          function setReply(type, buf) {
            reply.type = type;
            reply.buf = buf;
            sendReplies();
          }

          if (wantReply)
            unsentGlobalRequestsReplies.push(reply);

          if ((name === 'tcpip-forward'
               || name === 'cancel-tcpip-forward'
               || name === 'no-more-sessions@openssh.com'
               || name === 'streamlocal-forward@openssh.com'
               || name === 'cancel-streamlocal-forward@openssh.com')
              && listenerCount(this, 'request')
              && this.authenticated) {
            let accept;
            let reject;

            if (wantReply) {
              let replied = false;
              accept = (chosenPort) => {
                if (replied)
                  return;
                replied = true;
                let bufPort;
                if (name === 'tcpip-forward'
                    && data.bindPort === 0
                    && typeof chosenPort === 'number') {
                  bufPort = Buffer.allocUnsafe(4);
                  writeUInt32BE(bufPort, chosenPort, 0);
                }
                setReply('SUCCESS', bufPort);
              };
              reject = () => {
                if (replied)
                  return;
                replied = true;
                setReply('FAILURE');
              };
            }

            if (name === 'no-more-sessions@openssh.com') {
              this.noMoreSessions = true;
              accept && accept();
              return;
            }

            this.emit('request', accept, reject, name, data);
          } else if (wantReply) {
            setReply('FAILURE');
          }
        },
      },
    });

    socket.pause();
    cryptoInit.then(() => {
      proto.start();
      socket.on('data', (data) => {
        try {
          proto.parse(data, 0, data.length);
        } catch (ex) {
          this.emit('error', ex);
          try {
            if (isWritable(socket))
              socket.end();
          } catch {}
        }
      });
      socket.resume();
    }).catch((err) => {
      this.emit('error', err);
      try {
        if (isWritable(socket))
          socket.end();
      } catch {}
    });
    socket.on('error', (err) => {
      err.level = 'socket';
      this.emit('error', err);
    }).once('end', () => {
      debug && debug('Socket ended');
      proto.cleanup();
      this.emit('end');
    }).once('close', () => {
      debug && debug('Socket closed');
      proto.cleanup();
      this.emit('close');

      const err = new Error('No response from server');

      // Simulate error for pending channels and close any open channels
      this._chanMgr.cleanup(err);
    });

    const onAuthDecide = (ctx, allowed, methodsLeft, isPartial) => {
      if (authCtx === ctx && !this.authenticated) {
        if (allowed) {
          authCtx = undefined;
          this.authenticated = true;
          proto.authSuccess();
          pendingAuths = [];
          this.emit('ready');
        } else {
          proto.authFailure(methodsLeft, isPartial);
          if (pendingAuths.length) {
            authCtx = pendingAuths.pop();
            if (listenerCount(this, 'authentication'))
              this.emit('authentication', authCtx);
            else
              authCtx.reject();
          }
        }
      }
    };

    function sendReplies() {
      while (unsentGlobalRequestsReplies.length > 0
             && unsentGlobalRequestsReplies[0].type) {
        const reply = unsentGlobalRequestsReplies.shift();
        if (reply.type === 'SUCCESS')
          proto.requestSuccess(reply.buf);
        if (reply.type === 'FAILURE')
          proto.requestFailure();
      }
    }
  }

  end() {
    if (this._sock && isWritable(this._sock)) {
      this._protocol.disconnect(DISCONNECT_REASON.BY_APPLICATION);
      this._sock.end();
    }
    return this;
  }

  x11(originAddr, originPort, cb) {
    const opts = { originAddr, originPort };
    openChannel(this, 'x11', opts, cb);
    return this;
  }

  forwardOut(boundAddr, boundPort, remoteAddr, remotePort, cb) {
    const opts = { boundAddr, boundPort, remoteAddr, remotePort };
    openChannel(this, 'forwarded-tcpip', opts, cb);
    return this;
  }

  openssh_forwardOutStreamLocal(socketPath, cb) {
    const opts = { socketPath };
    openChannel(this, 'forwarded-streamlocal@openssh.com', opts, cb);
    return this;
  }

  rekey(cb) {
    let error;

    try {
      this._protocol.rekey();
    } catch (ex) {
      error = ex;
    }

    // TODO: re-throw error if no callback?

    if (typeof cb === 'function') {
      if (error)
        process.nextTick(cb, error);
      else
        this.once('rekey', cb);
    }
  }

  setNoDelay(noDelay) {
    if (this._sock && typeof this._sock.setNoDelay === 'function')
      this._sock.setNoDelay(noDelay);

    return this;
  }
}


function openChannel(self, type, opts, cb) {
  // Ask the client to open a channel for some purpose (e.g. a forwarded TCP
  // connection)
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
    case 'forwarded-tcpip':
      self._protocol.forwardedTcpip(localChan, initWindow, maxPacket, opts);
      break;
    case 'x11':
      self._protocol.x11(localChan, initWindow, maxPacket, opts);
      break;
    case 'forwarded-streamlocal@openssh.com':
      self._protocol.openssh_forwardedStreamLocal(
        localChan, initWindow, maxPacket, opts
      );
      break;
    default:
      throw new Error(`Unsupported channel type: ${type}`);
  }
}

function compareNumbers(a, b) {
  return a - b;
}

module.exports = Server;
module.exports.IncomingClient = Client;
