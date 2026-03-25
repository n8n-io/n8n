'use strict';

const { Socket } = require('net');
const { Duplex } = require('stream');
const { resolve } = require('path');
const { readFile } = require('fs');
const { execFile, spawn } = require('child_process');

const { isParsedKey, parseKey } = require('./protocol/keyParser.js');

const {
  makeBufferParser,
  readUInt32BE,
  writeUInt32BE,
  writeUInt32LE,
} = require('./protocol/utils.js');

function once(cb) {
  let called = false;
  return (...args) => {
    if (called)
      return;
    called = true;
    cb(...args);
  };
}

function concat(buf1, buf2) {
  const combined = Buffer.allocUnsafe(buf1.length + buf2.length);
  buf1.copy(combined, 0);
  buf2.copy(combined, buf1.length);
  return combined;
}

function noop() {}

const EMPTY_BUF = Buffer.alloc(0);

const binaryParser = makeBufferParser();

class BaseAgent {
  getIdentities(cb) {
    cb(new Error('Missing getIdentities() implementation'));
  }
  sign(pubKey, data, options, cb) {
    if (typeof options === 'function')
      cb = options;
    cb(new Error('Missing sign() implementation'));
  }
}

class OpenSSHAgent extends BaseAgent {
  constructor(socketPath) {
    super();
    this.socketPath = socketPath;
  }

  getStream(cb) {
    cb = once(cb);
    const sock = new Socket();
    sock.on('connect', () => {
      cb(null, sock);
    });
    sock.on('close', onFail)
        .on('end', onFail)
        .on('error', onFail);
    sock.connect(this.socketPath);

    function onFail() {
      try {
        sock.destroy();
      } catch {}

      cb(new Error('Failed to connect to agent'));
    }
  }

  getIdentities(cb) {
    cb = once(cb);
    this.getStream((err, stream) => {
      function onFail(err) {
        if (stream) {
          try {
            stream.destroy();
          } catch {}
        }
        if (!err)
          err = new Error('Failed to retrieve identities from agent');
        cb(err);
      }

      if (err)
        return onFail(err);

      const protocol = new AgentProtocol(true);
      protocol.on('error', onFail);
      protocol.pipe(stream).pipe(protocol);

      stream.on('close', onFail)
            .on('end', onFail)
            .on('error', onFail);

      protocol.getIdentities((err, keys) => {
        if (err)
          return onFail(err);
        try {
          stream.destroy();
        } catch {}
        cb(null, keys);
      });
    });
  }

  sign(pubKey, data, options, cb) {
    if (typeof options === 'function') {
      cb = options;
      options = undefined;
    } else if (typeof options !== 'object' || options === null) {
      options = undefined;
    }

    cb = once(cb);
    this.getStream((err, stream) => {
      function onFail(err) {
        if (stream) {
          try {
            stream.destroy();
          } catch {}
        }
        if (!err)
          err = new Error('Failed to sign data with agent');
        cb(err);
      }

      if (err)
        return onFail(err);

      const protocol = new AgentProtocol(true);
      protocol.on('error', onFail);
      protocol.pipe(stream).pipe(protocol);

      stream.on('close', onFail)
            .on('end', onFail)
            .on('error', onFail);

      protocol.sign(pubKey, data, options, (err, sig) => {
        if (err)
          return onFail(err);

        try {
          stream.destroy();
        } catch {}

        cb(null, sig);
      });
    });
  }
}

const PageantAgent = (() => {
  const RET_ERR_BADARGS = 10;
  const RET_ERR_UNAVAILABLE = 11;
  const RET_ERR_NOMAP = 12;
  const RET_ERR_BINSTDIN = 13;
  const RET_ERR_BINSTDOUT = 14;
  const RET_ERR_BADLEN = 15;

  const EXEPATH = resolve(__dirname, '..', 'util/pagent.exe');
  const ERROR = {
    [RET_ERR_BADARGS]: new Error('Invalid pagent.exe arguments'),
    [RET_ERR_UNAVAILABLE]: new Error('Pageant is not running'),
    [RET_ERR_NOMAP]: new Error('pagent.exe could not create an mmap'),
    [RET_ERR_BINSTDIN]: new Error('pagent.exe could not set mode for stdin'),
    [RET_ERR_BINSTDOUT]: new Error('pagent.exe could not set mode for stdout'),
    [RET_ERR_BADLEN]:
      new Error('pagent.exe did not get expected input payload'),
  };

  function destroy(stream) {
    stream.buffer = null;
    if (stream.proc) {
      stream.proc.kill();
      stream.proc = undefined;
    }
  }

  class PageantSocket extends Duplex {
    constructor() {
      super();
      this.proc = undefined;
      this.buffer = null;
    }
    _read(n) {}
    _write(data, encoding, cb) {
      if (this.buffer === null) {
        this.buffer = data;
      } else {
        const newBuffer = Buffer.allocUnsafe(this.buffer.length + data.length);
        this.buffer.copy(newBuffer, 0);
        data.copy(newBuffer, this.buffer.length);
        this.buffer = newBuffer;
      }
      // Wait for at least all length bytes
      if (this.buffer.length < 4)
        return cb();

      const len = readUInt32BE(this.buffer, 0);
      // Make sure we have a full message before querying pageant
      if ((this.buffer.length - 4) < len)
        return cb();

      data = this.buffer.slice(0, 4 + len);
      if (this.buffer.length > (4 + len))
        return cb(new Error('Unexpected multiple agent requests'));
      this.buffer = null;

      let error;
      const proc = this.proc = spawn(EXEPATH, [ data.length ]);
      proc.stdout.on('data', (data) => {
        this.push(data);
      });
      proc.on('error', (err) => {
        error = err;
        cb(error);
      });
      proc.on('close', (code) => {
        this.proc = undefined;
        if (!error) {
          if (error = ERROR[code])
            return cb(error);
          cb();
        }
      });
      proc.stdin.end(data);
    }
    _final(cb) {
      destroy(this);
      cb();
    }
    _destroy(err, cb) {
      destroy(this);
      cb();
    }
  }

  return class PageantAgent extends OpenSSHAgent {
    getStream(cb) {
      cb(null, new PageantSocket());
    }
  };
})();

const CygwinAgent = (() => {
  const RE_CYGWIN_SOCK = /^!<socket >(\d+) s ([A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8})/;

  return class CygwinAgent extends OpenSSHAgent {
    getStream(cb) {
      cb = once(cb);

      // The cygwin ssh-agent connection process looks like this:
      //   1. Read the "socket" as a file to get the underlying TCP port and a
      //      special "secret" that must be sent to the TCP server.
      //   2. Connect to the server listening on localhost at the TCP port.
      //   3. Send the "secret" to the server.
      //   4. The server sends back the same "secret".
      //   5. Send three 32-bit integer values of zero. This is ordinarily the
      //      pid, uid, and gid of this process, but cygwin will actually
      //      send us the correct values as a response.
      //   6. The server sends back the pid, uid, gid.
      //   7. Disconnect.
      //   8. Repeat steps 2-6, except send the received pid, uid, and gid in
      //      step 5 instead of zeroes.
      //   9. Connection is ready to be used.

      let socketPath = this.socketPath;
      let triedCygpath = false;
      readFile(socketPath, function readCygsocket(err, data) {
        if (err) {
          if (triedCygpath)
            return cb(new Error('Invalid cygwin unix socket path'));

          // Try using `cygpath` to convert a possible *nix-style path to the
          // real Windows path before giving up ...
          execFile('cygpath', ['-w', socketPath], (err, stdout, stderr) => {
            if (err || stdout.length === 0)
              return cb(new Error('Invalid cygwin unix socket path'));

            triedCygpath = true;
            socketPath = stdout.toString().replace(/[\r\n]/g, '');
            readFile(socketPath, readCygsocket);
          });
          return;
        }

        const m = RE_CYGWIN_SOCK.exec(data.toString('ascii'));
        if (!m)
          return cb(new Error('Malformed cygwin unix socket file'));

        let state;
        let bc = 0;
        let isRetrying = false;
        const inBuf = [];
        let sock;

        // Use 0 for pid, uid, and gid to ensure we get an error and also
        // a valid uid and gid from cygwin so that we don't have to figure it
        // out ourselves
        let credsBuf = Buffer.alloc(12);

        // Parse cygwin unix socket file contents
        const port = parseInt(m[1], 10);
        const secret = m[2].replace(/-/g, '');
        const secretBuf = Buffer.allocUnsafe(16);
        for (let i = 0, j = 0; j < 32; ++i, j += 2)
          secretBuf[i] = parseInt(secret.substring(j, j + 2), 16);

        // Convert to host order (always LE for Windows)
        for (let i = 0; i < 16; i += 4)
          writeUInt32LE(secretBuf, readUInt32BE(secretBuf, i), i);

        tryConnect();

        function _onconnect() {
          bc = 0;
          state = 'secret';
          sock.write(secretBuf);
        }

        function _ondata(data) {
          bc += data.length;

          if (state === 'secret') {
            // The secret we sent is echoed back to us by cygwin, not sure of
            // the reason for that, but we ignore it nonetheless ...
            if (bc === 16) {
              bc = 0;
              state = 'creds';
              sock.write(credsBuf);
            }
            return;
          }

          if (state === 'creds') {
            // If this is the first attempt, make sure to gather the valid
            // uid and gid for our next attempt
            if (!isRetrying)
              inBuf.push(data);

            if (bc === 12) {
              sock.removeListener('connect', _onconnect);
              sock.removeListener('data', _ondata);
              sock.removeListener('error', onFail);
              sock.removeListener('end', onFail);
              sock.removeListener('close', onFail);

              if (isRetrying)
                return cb(null, sock);

              isRetrying = true;
              credsBuf = Buffer.concat(inBuf);
              writeUInt32LE(credsBuf, process.pid, 0);
              sock.on('error', () => {});
              sock.destroy();

              tryConnect();
            }
          }
        }

        function onFail() {
          cb(new Error('Problem negotiating cygwin unix socket security'));
        }

        function tryConnect() {
          sock = new Socket();
          sock.on('connect', _onconnect);
          sock.on('data', _ondata);
          sock.on('error', onFail);
          sock.on('end', onFail);
          sock.on('close', onFail);
          sock.connect(port);
        }
      });
    }
  };
})();

// Format of `//./pipe/ANYTHING`, with forward slashes and backward slashes
// being interchangeable
const WINDOWS_PIPE_REGEX = /^[/\\][/\\]\.[/\\]pipe[/\\].+/;
function createAgent(path) {
  if (process.platform === 'win32' && !WINDOWS_PIPE_REGEX.test(path)) {
    return (path === 'pageant'
            ? new PageantAgent()
            : new CygwinAgent(path));
  }
  return new OpenSSHAgent(path);
}

const AgentProtocol = (() => {
  // Client->Server messages
  const SSH_AGENTC_REQUEST_IDENTITIES = 11;
  const SSH_AGENTC_SIGN_REQUEST = 13;
  // const SSH_AGENTC_ADD_IDENTITY = 17;
  // const SSH_AGENTC_REMOVE_IDENTITY = 18;
  // const SSH_AGENTC_REMOVE_ALL_IDENTITIES = 19;
  // const SSH_AGENTC_ADD_SMARTCARD_KEY = 20;
  // const SSH_AGENTC_REMOVE_SMARTCARD_KEY = 21;
  // const SSH_AGENTC_LOCK = 22;
  // const SSH_AGENTC_UNLOCK = 23;
  // const SSH_AGENTC_ADD_ID_CONSTRAINED = 25;
  // const SSH_AGENTC_ADD_SMARTCARD_KEY_CONSTRAINED = 26;
  // const SSH_AGENTC_EXTENSION = 27;
  // Server->Client messages
  const SSH_AGENT_FAILURE = 5;
  // const SSH_AGENT_SUCCESS = 6;
  const SSH_AGENT_IDENTITIES_ANSWER = 12;
  const SSH_AGENT_SIGN_RESPONSE = 14;
  // const SSH_AGENT_EXTENSION_FAILURE = 28;

  // const SSH_AGENT_CONSTRAIN_LIFETIME = 1;
  // const SSH_AGENT_CONSTRAIN_CONFIRM = 2;
  // const SSH_AGENT_CONSTRAIN_EXTENSION = 255;

  const SSH_AGENT_RSA_SHA2_256 = (1 << 1);
  const SSH_AGENT_RSA_SHA2_512 = (1 << 2);

  const ROLE_CLIENT = 0;
  const ROLE_SERVER = 1;

  // Ensures that responses get sent back in the same order the requests were
  // received
  function processResponses(protocol) {
    let ret;
    while (protocol[SYM_REQS].length) {
      const nextResponse = protocol[SYM_REQS][0][SYM_RESP];
      if (nextResponse === undefined)
        break;

      protocol[SYM_REQS].shift();
      ret = protocol.push(nextResponse);
    }
    return ret;
  }

  const SYM_TYPE = Symbol('Inbound Request Type');
  const SYM_RESP = Symbol('Inbound Request Response');
  const SYM_CTX = Symbol('Inbound Request Context');
  class AgentInboundRequest {
    constructor(type, ctx) {
      this[SYM_TYPE] = type;
      this[SYM_RESP] = undefined;
      this[SYM_CTX] = ctx;
    }
    hasResponded() {
      return (this[SYM_RESP] !== undefined);
    }
    getType() {
      return this[SYM_TYPE];
    }
    getContext() {
      return this[SYM_CTX];
    }
  }
  function respond(protocol, req, data) {
    req[SYM_RESP] = data;
    return processResponses(protocol);
  }

  function cleanup(protocol) {
    protocol[SYM_BUFFER] = null;
    if (protocol[SYM_MODE] === ROLE_CLIENT) {
      const reqs = protocol[SYM_REQS];
      if (reqs && reqs.length) {
        protocol[SYM_REQS] = [];
        for (const req of reqs)
          req.cb(new Error('No reply from server'));
      }
    }

    // Node streams hackery to make streams do the "right thing"
    try {
      protocol.end();
    } catch {}
    setImmediate(() => {
      if (!protocol[SYM_ENDED])
        protocol.emit('end');
      if (!protocol[SYM_CLOSED])
        protocol.emit('close');
    });
  }

  function onClose() {
    this[SYM_CLOSED] = true;
  }

  function onEnd() {
    this[SYM_ENDED] = true;
  }

  const SYM_REQS = Symbol('Requests');
  const SYM_MODE = Symbol('Agent Protocol Role');
  const SYM_BUFFER = Symbol('Agent Protocol Buffer');
  const SYM_MSGLEN = Symbol('Agent Protocol Current Message Length');
  const SYM_CLOSED = Symbol('Agent Protocol Closed');
  const SYM_ENDED = Symbol('Agent Protocol Ended');
  // Implementation based on:
  // https://tools.ietf.org/html/draft-miller-ssh-agent-04
  return class AgentProtocol extends Duplex {
    /*
        Notes:
          - `constraint` type consists of:
               byte                    constraint_type
               byte[]                  constraint_data
            where `constraint_type` is one of:
              * SSH_AGENT_CONSTRAIN_LIFETIME
                - `constraint_data` consists of:
                     uint32                  seconds
              * SSH_AGENT_CONSTRAIN_CONFIRM
                - `constraint_data` N/A
              * SSH_AGENT_CONSTRAIN_EXTENSION
                - `constraint_data` consists of:
                     string                  extension name
                     byte[]                  extension-specific details
    */

    constructor(isClient) {
      super({ autoDestroy: true, emitClose: false });
      this[SYM_MODE] = (isClient ? ROLE_CLIENT : ROLE_SERVER);
      this[SYM_REQS] = [];
      this[SYM_BUFFER] = null;
      this[SYM_MSGLEN] = -1;
      this.once('end', onEnd);
      this.once('close', onClose);
    }

    _read(n) {}

    _write(data, encoding, cb) {
      /*
          Messages are of the format:
            uint32                    message length
            byte                      message type
            byte[message length - 1]  message contents
      */
      if (this[SYM_BUFFER] === null)
        this[SYM_BUFFER] = data;
      else
        this[SYM_BUFFER] = concat(this[SYM_BUFFER], data);

      let buffer = this[SYM_BUFFER];
      let bufferLen = buffer.length;

      let p = 0;
      while (p < bufferLen) {
        // Wait for length + type
        if (bufferLen < 5)
          break;

        if (this[SYM_MSGLEN] === -1)
          this[SYM_MSGLEN] = readUInt32BE(buffer, p);

        // Check if we have the entire message
        if (bufferLen < (4 + this[SYM_MSGLEN]))
          break;

        const msgType = buffer[p += 4];
        ++p;

        if (this[SYM_MODE] === ROLE_CLIENT) {
          if (this[SYM_REQS].length === 0)
            return cb(new Error('Received unexpected message from server'));

          const req = this[SYM_REQS].shift();

          switch (msgType) {
            case SSH_AGENT_FAILURE:
              req.cb(new Error('Agent responded with failure'));
              break;
            case SSH_AGENT_IDENTITIES_ANSWER: {
              if (req.type !== SSH_AGENTC_REQUEST_IDENTITIES)
                return cb(new Error('Agent responded with wrong message type'));

              /*
                 byte        SSH_AGENT_IDENTITIES_ANSWER
                 uint32      nkeys

                where `nkeys` is 0 or more of:
                 string      key blob
                 string      comment
              */

              binaryParser.init(buffer, p);

              const numKeys = binaryParser.readUInt32BE();

              if (numKeys === undefined) {
                binaryParser.clear();
                return cb(new Error('Malformed agent response'));
              }

              const keys = [];
              for (let i = 0; i < numKeys; ++i) {
                let pubKey = binaryParser.readString();
                if (pubKey === undefined) {
                  binaryParser.clear();
                  return cb(new Error('Malformed agent response'));
                }

                const comment = binaryParser.readString(true);
                if (comment === undefined) {
                  binaryParser.clear();
                  return cb(new Error('Malformed agent response'));
                }

                pubKey = parseKey(pubKey);
                // We continue parsing the packet if we encounter an error
                // in case the error is due to the key being an unsupported
                // type
                if (pubKey instanceof Error)
                  continue;

                pubKey.comment = pubKey.comment || comment;

                keys.push(pubKey);
              }
              p = binaryParser.pos();
              binaryParser.clear();

              req.cb(null, keys);
              break;
            }
            case SSH_AGENT_SIGN_RESPONSE: {
              if (req.type !== SSH_AGENTC_SIGN_REQUEST)
                return cb(new Error('Agent responded with wrong message type'));

              /*
                 byte        SSH_AGENT_SIGN_RESPONSE
                 string      signature
              */

              binaryParser.init(buffer, p);
              let signature = binaryParser.readString();
              p = binaryParser.pos();
              binaryParser.clear();

              if (signature === undefined)
                return cb(new Error('Malformed agent response'));

              // We strip the algorithm from OpenSSH's output and assume it's
              // using the algorithm we specified. This makes it easier on
              // custom Agent implementations so they don't have to construct
              // the correct binary format for a (OpenSSH-style) signature.

              // TODO: verify signature type based on key and options used
              // during initial sign request
              binaryParser.init(signature, 0);
              binaryParser.readString(true);
              signature = binaryParser.readString();
              binaryParser.clear();

              if (signature === undefined)
                return cb(new Error('Malformed OpenSSH signature format'));

              req.cb(null, signature);
              break;
            }
            default:
              return cb(
                new Error('Agent responded with unsupported message type')
              );
          }
        } else {
          switch (msgType) {
            case SSH_AGENTC_REQUEST_IDENTITIES: {
              const req = new AgentInboundRequest(msgType);
              this[SYM_REQS].push(req);
              /*
                byte        SSH_AGENTC_REQUEST_IDENTITIES
              */
              this.emit('identities', req);
              break;
            }
            case SSH_AGENTC_SIGN_REQUEST: {
              /*
                byte        SSH_AGENTC_SIGN_REQUEST
                string      key_blob
                string      data
                uint32      flags
              */
              binaryParser.init(buffer, p);
              let pubKey = binaryParser.readString();
              const data = binaryParser.readString();
              const flagsVal = binaryParser.readUInt32BE();
              p = binaryParser.pos();
              binaryParser.clear();
              if (flagsVal === undefined) {
                const req = new AgentInboundRequest(msgType);
                this[SYM_REQS].push(req);
                return this.failureReply(req);
              }

              pubKey = parseKey(pubKey);
              if (pubKey instanceof Error) {
                const req = new AgentInboundRequest(msgType);
                this[SYM_REQS].push(req);
                return this.failureReply(req);
              }

              const flags = {
                hash: undefined,
              };
              let ctx;
              if (pubKey.type === 'ssh-rsa') {
                if (flagsVal & SSH_AGENT_RSA_SHA2_256) {
                  ctx = 'rsa-sha2-256';
                  flags.hash = 'sha256';
                } else if (flagsVal & SSH_AGENT_RSA_SHA2_512) {
                  ctx = 'rsa-sha2-512';
                  flags.hash = 'sha512';
                }
              }
              if (ctx === undefined)
                ctx = pubKey.type;

              const req = new AgentInboundRequest(msgType, ctx);
              this[SYM_REQS].push(req);

              this.emit('sign', req, pubKey, data, flags);
              break;
            }
            default: {
              const req = new AgentInboundRequest(msgType);
              this[SYM_REQS].push(req);
              this.failureReply(req);
            }
          }
        }

        // Get ready for next message
        this[SYM_MSGLEN] = -1;
        if (p === bufferLen) {
          // Nothing left to process for now
          this[SYM_BUFFER] = null;
          break;
        } else {
          this[SYM_BUFFER] = buffer = buffer.slice(p);
          bufferLen = buffer.length;
          p = 0;
        }
      }

      cb();
    }

    _destroy(err, cb) {
      cleanup(this);
      cb();
    }

    _final(cb) {
      cleanup(this);
      cb();
    }

    // Client->Server messages =================================================
    sign(pubKey, data, options, cb) {
      if (this[SYM_MODE] !== ROLE_CLIENT)
        throw new Error('Client-only method called with server role');

      if (typeof options === 'function') {
        cb = options;
        options = undefined;
      } else if (typeof options !== 'object' || options === null) {
        options = undefined;
      }

      let flags = 0;

      pubKey = parseKey(pubKey);
      if (pubKey instanceof Error)
        throw new Error('Invalid public key argument');

      if (pubKey.type === 'ssh-rsa' && options) {
        switch (options.hash) {
          case 'sha256':
            flags = SSH_AGENT_RSA_SHA2_256;
            break;
          case 'sha512':
            flags = SSH_AGENT_RSA_SHA2_512;
            break;
        }
      }
      pubKey = pubKey.getPublicSSH();

      /*
        byte        SSH_AGENTC_SIGN_REQUEST
        string      key_blob
        string      data
        uint32      flags
      */
      const type = SSH_AGENTC_SIGN_REQUEST;
      const keyLen = pubKey.length;
      const dataLen = data.length;
      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1 + 4 + keyLen + 4 + dataLen + 4);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = type;

      writeUInt32BE(buf, keyLen, ++p);
      pubKey.copy(buf, p += 4);

      writeUInt32BE(buf, dataLen, p += keyLen);
      data.copy(buf, p += 4);

      writeUInt32BE(buf, flags, p += dataLen);

      if (typeof cb !== 'function')
        cb = noop;

      this[SYM_REQS].push({ type, cb });

      return this.push(buf);
    }
    getIdentities(cb) {
      if (this[SYM_MODE] !== ROLE_CLIENT)
        throw new Error('Client-only method called with server role');

      /*
        byte        SSH_AGENTC_REQUEST_IDENTITIES
      */
      const type = SSH_AGENTC_REQUEST_IDENTITIES;

      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = type;

      if (typeof cb !== 'function')
        cb = noop;

      this[SYM_REQS].push({ type, cb });

      return this.push(buf);
    }

    // Server->Client messages =================================================
    failureReply(req) {
      if (this[SYM_MODE] !== ROLE_SERVER)
        throw new Error('Server-only method called with client role');

      if (!(req instanceof AgentInboundRequest))
        throw new Error('Wrong request argument');

      if (req.hasResponded())
        return true;

      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = SSH_AGENT_FAILURE;

      return respond(this, req, buf);
    }
    getIdentitiesReply(req, keys) {
      if (this[SYM_MODE] !== ROLE_SERVER)
        throw new Error('Server-only method called with client role');

      if (!(req instanceof AgentInboundRequest))
        throw new Error('Wrong request argument');

      if (req.hasResponded())
        return true;

      /*
         byte        SSH_AGENT_IDENTITIES_ANSWER
         uint32      nkeys

        where `nkeys` is 0 or more of:
         string      key blob
         string      comment
      */

      if (req.getType() !== SSH_AGENTC_REQUEST_IDENTITIES)
        throw new Error('Invalid response to request');

      if (!Array.isArray(keys))
        throw new Error('Keys argument must be an array');

      let totalKeysLen = 4; // Include `nkeys` size

      const newKeys = [];
      for (let i = 0; i < keys.length; ++i) {
        const entry = keys[i];
        if (typeof entry !== 'object' || entry === null)
          throw new Error(`Invalid key entry: ${entry}`);

        let pubKey;
        let comment;
        if (isParsedKey(entry)) {
          pubKey = entry;
        } else if (isParsedKey(entry.pubKey)) {
          pubKey = entry.pubKey;
        } else {
          if (typeof entry.pubKey !== 'object' || entry.pubKey === null)
            continue;
          ({ pubKey, comment } = entry.pubKey);
          pubKey = parseKey(pubKey);
          if (pubKey instanceof Error)
            continue; // TODO: add debug output
        }
        comment = pubKey.comment || comment;
        pubKey = pubKey.getPublicSSH();

        totalKeysLen += 4 + pubKey.length;

        if (comment && typeof comment === 'string')
          comment = Buffer.from(comment);
        else if (!Buffer.isBuffer(comment))
          comment = EMPTY_BUF;

        totalKeysLen += 4 + comment.length;

        newKeys.push({ pubKey, comment });
      }

      let p = 0;
      const buf = Buffer.allocUnsafe(4 + 1 + totalKeysLen);

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = SSH_AGENT_IDENTITIES_ANSWER;

      writeUInt32BE(buf, newKeys.length, ++p);
      p += 4;
      for (let i = 0; i < newKeys.length; ++i) {
        const { pubKey, comment } = newKeys[i];

        writeUInt32BE(buf, pubKey.length, p);
        pubKey.copy(buf, p += 4);

        writeUInt32BE(buf, comment.length, p += pubKey.length);
        p += 4;
        if (comment.length) {
          comment.copy(buf, p);
          p += comment.length;
        }
      }

      return respond(this, req, buf);
    }
    signReply(req, signature) {
      if (this[SYM_MODE] !== ROLE_SERVER)
        throw new Error('Server-only method called with client role');

      if (!(req instanceof AgentInboundRequest))
        throw new Error('Wrong request argument');

      if (req.hasResponded())
        return true;

      /*
         byte        SSH_AGENT_SIGN_RESPONSE
         string      signature
      */

      if (req.getType() !== SSH_AGENTC_SIGN_REQUEST)
        throw new Error('Invalid response to request');

      if (!Buffer.isBuffer(signature))
        throw new Error('Signature argument must be a Buffer');

      if (signature.length === 0)
        throw new Error('Signature argument must be non-empty');

      /*
        OpenSSH agent signatures are encoded as:

          string    signature format identifier (as specified by the
                    public key/certificate format)
          byte[n]   signature blob in format specific encoding.
            - This is actually a `string` for: rsa, dss, ecdsa, and ed25519
              types
      */

      let p = 0;
      const sigFormat = req.getContext();
      const sigFormatLen = Buffer.byteLength(sigFormat);
      const buf = Buffer.allocUnsafe(
        4 + 1 + 4 + 4 + sigFormatLen + 4 + signature.length
      );

      writeUInt32BE(buf, buf.length - 4, p);

      buf[p += 4] = SSH_AGENT_SIGN_RESPONSE;

      writeUInt32BE(buf, 4 + sigFormatLen + 4 + signature.length, ++p);
      writeUInt32BE(buf, sigFormatLen, p += 4);
      buf.utf8Write(sigFormat, p += 4, sigFormatLen);
      writeUInt32BE(buf, signature.length, p += sigFormatLen);
      signature.copy(buf, p += 4);

      return respond(this, req, buf);
    }
  };
})();

const SYM_AGENT = Symbol('Agent');
const SYM_AGENT_KEYS = Symbol('Agent Keys');
const SYM_AGENT_KEYS_IDX = Symbol('Agent Keys Index');
const SYM_AGENT_CBS = Symbol('Agent Init Callbacks');
class AgentContext {
  constructor(agent) {
    if (typeof agent === 'string')
      agent = createAgent(agent);
    else if (!isAgent(agent))
      throw new Error('Invalid agent argument');
    this[SYM_AGENT] = agent;
    this[SYM_AGENT_KEYS] = null;
    this[SYM_AGENT_KEYS_IDX] = -1;
    this[SYM_AGENT_CBS] = null;
  }
  init(cb) {
    if (typeof cb !== 'function')
      cb = noop;

    if (this[SYM_AGENT_KEYS] === null) {
      if (this[SYM_AGENT_CBS] === null) {
        this[SYM_AGENT_CBS] = [cb];

        const doCbs = (...args) => {
          process.nextTick(() => {
            const cbs = this[SYM_AGENT_CBS];
            this[SYM_AGENT_CBS] = null;
            for (const cb of cbs)
              cb(...args);
          });
        };

        this[SYM_AGENT].getIdentities(once((err, keys) => {
          if (err)
            return doCbs(err);

          if (!Array.isArray(keys)) {
            return doCbs(new Error(
              'Agent implementation failed to provide keys'
            ));
          }

          const newKeys = [];
          for (let key of keys) {
            key = parseKey(key);
            if (key instanceof Error) {
              // TODO: add debug output
              continue;
            }
            newKeys.push(key);
          }

          this[SYM_AGENT_KEYS] = newKeys;
          this[SYM_AGENT_KEYS_IDX] = -1;
          doCbs();
        }));
      } else {
        this[SYM_AGENT_CBS].push(cb);
      }
    } else {
      process.nextTick(cb);
    }
  }
  nextKey() {
    if (this[SYM_AGENT_KEYS] === null
        || ++this[SYM_AGENT_KEYS_IDX] >= this[SYM_AGENT_KEYS].length) {
      return false;
    }

    return this[SYM_AGENT_KEYS][this[SYM_AGENT_KEYS_IDX]];
  }
  currentKey() {
    if (this[SYM_AGENT_KEYS] === null
        || this[SYM_AGENT_KEYS_IDX] >= this[SYM_AGENT_KEYS].length) {
      return null;
    }

    return this[SYM_AGENT_KEYS][this[SYM_AGENT_KEYS_IDX]];
  }
  pos() {
    if (this[SYM_AGENT_KEYS] === null
        || this[SYM_AGENT_KEYS_IDX] >= this[SYM_AGENT_KEYS].length) {
      return -1;
    }

    return this[SYM_AGENT_KEYS_IDX];
  }
  reset() {
    this[SYM_AGENT_KEYS_IDX] = -1;
  }

  sign(...args) {
    this[SYM_AGENT].sign(...args);
  }
}

function isAgent(val) {
  return (val instanceof BaseAgent);
}

module.exports = {
  AgentContext,
  AgentProtocol,
  BaseAgent,
  createAgent,
  CygwinAgent,
  isAgent,
  OpenSSHAgent,
  PageantAgent,
};
