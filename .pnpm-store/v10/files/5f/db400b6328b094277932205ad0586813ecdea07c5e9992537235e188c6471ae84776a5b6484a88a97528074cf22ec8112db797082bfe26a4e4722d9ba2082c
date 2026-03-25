'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const { constants } = fs;
const {
  Readable: ReadableStream,
  Writable: WritableStream
} = require('stream');
const { inherits, types: { isDate } } = require('util');

const FastBuffer = Buffer[Symbol.species];

const {
  bufferCopy,
  bufferSlice,
  makeBufferParser,
  writeUInt32BE,
} = require('./utils.js');

const ATTR = {
  SIZE: 0x00000001,
  UIDGID: 0x00000002,
  PERMISSIONS: 0x00000004,
  ACMODTIME: 0x00000008,
  EXTENDED: 0x80000000,
};

// Large enough to store all possible attributes
const ATTRS_BUF = Buffer.alloc(28);

const STATUS_CODE = {
  OK: 0,
  EOF: 1,
  NO_SUCH_FILE: 2,
  PERMISSION_DENIED: 3,
  FAILURE: 4,
  BAD_MESSAGE: 5,
  NO_CONNECTION: 6,
  CONNECTION_LOST: 7,
  OP_UNSUPPORTED: 8
};

const VALID_STATUS_CODES = new Map(
  Object.values(STATUS_CODE).map((n) => [n, 1])
);

const STATUS_CODE_STR = {
  [STATUS_CODE.OK]: 'No error',
  [STATUS_CODE.EOF]: 'End of file',
  [STATUS_CODE.NO_SUCH_FILE]: 'No such file or directory',
  [STATUS_CODE.PERMISSION_DENIED]: 'Permission denied',
  [STATUS_CODE.FAILURE]: 'Failure',
  [STATUS_CODE.BAD_MESSAGE]: 'Bad message',
  [STATUS_CODE.NO_CONNECTION]: 'No connection',
  [STATUS_CODE.CONNECTION_LOST]: 'Connection lost',
  [STATUS_CODE.OP_UNSUPPORTED]: 'Operation unsupported',
};

const REQUEST = {
  INIT: 1,
  OPEN: 3,
  CLOSE: 4,
  READ: 5,
  WRITE: 6,
  LSTAT: 7,
  FSTAT: 8,
  SETSTAT: 9,
  FSETSTAT: 10,
  OPENDIR: 11,
  READDIR: 12,
  REMOVE: 13,
  MKDIR: 14,
  RMDIR: 15,
  REALPATH: 16,
  STAT: 17,
  RENAME: 18,
  READLINK: 19,
  SYMLINK: 20,
  EXTENDED: 200
};

const RESPONSE = {
  VERSION: 2,
  STATUS: 101,
  HANDLE: 102,
  DATA: 103,
  NAME: 104,
  ATTRS: 105,
  EXTENDED: 201
};

const OPEN_MODE = {
  READ: 0x00000001,
  WRITE: 0x00000002,
  APPEND: 0x00000004,
  CREAT: 0x00000008,
  TRUNC: 0x00000010,
  EXCL: 0x00000020
};

const PKT_RW_OVERHEAD = 2 * 1024;
const MAX_REQID = 2 ** 32 - 1;
const CLIENT_VERSION_BUFFER = Buffer.from([
  0, 0, 0, 5 /* length */,
    REQUEST.INIT,
    0, 0, 0, 3 /* version */
]);
const SERVER_VERSION_BUFFER = Buffer.from([
  0, 0, 0, 5 /* length */,
    RESPONSE.VERSION,
    0, 0, 0, 3 /* version */
]);

const RE_OPENSSH = /^SSH-2.0-(?:OpenSSH|dropbear)/;
const OPENSSH_MAX_PKT_LEN = 256 * 1024;

const bufferParser = makeBufferParser();

const fakeStderr = {
  readable: false,
  writable: false,
  push: (data) => {},
  once: () => {},
  on: () => {},
  emit: () => {},
  end: () => {},
};

function noop() {}

// Emulates enough of `Channel` to be able to be used as a drop-in replacement
// in order to process incoming data with as little overhead as possible
class SFTP extends EventEmitter {
  constructor(client, chanInfo, cfg) {
    super();

    if (typeof cfg !== 'object' || !cfg)
      cfg = {};

    const remoteIdentRaw = client._protocol._remoteIdentRaw;

    this.server = !!cfg.server;
    this._debug = (typeof cfg.debug === 'function' ? cfg.debug : undefined);
    this._isOpenSSH = (remoteIdentRaw && RE_OPENSSH.test(remoteIdentRaw));

    this._version = -1;
    this._extensions = {};
    this._biOpt = cfg.biOpt;
    this._pktLenBytes = 0;
    this._pktLen = 0;
    this._pktPos = 0;
    this._pktType = 0;
    this._pktData = undefined;
    this._writeReqid = -1;
    this._requests = {};
    this._maxInPktLen = OPENSSH_MAX_PKT_LEN;
    this._maxOutPktLen = 34000;
    this._maxReadLen =
      (this._isOpenSSH ? OPENSSH_MAX_PKT_LEN : 34000) - PKT_RW_OVERHEAD;
    this._maxWriteLen =
      (this._isOpenSSH ? OPENSSH_MAX_PKT_LEN : 34000) - PKT_RW_OVERHEAD;

    this.maxOpenHandles = undefined;

    // Channel compatibility
    this._client = client;
    this._protocol = client._protocol;
    this._callbacks = [];
    this._hasX11 = false;
    this._exit = {
      code: undefined,
      signal: undefined,
      dump: undefined,
      desc: undefined,
    };
    this._waitWindow = false; // SSH-level backpressure
    this._chunkcb = undefined;
    this._buffer = [];
    this.type = chanInfo.type;
    this.subtype = undefined;
    this.incoming = chanInfo.incoming;
    this.outgoing = chanInfo.outgoing;
    this.stderr = fakeStderr;
    this.readable = true;
  }

  // This handles incoming data to parse
  push(data) {
    if (data === null) {
      cleanupRequests(this);
      if (!this.readable)
        return;
      // No more incoming data from the remote side
      this.readable = false;
      this.emit('end');
      return;
    }
    /*
        uint32             length
        byte               type
        byte[length - 1]   data payload
    */
    let p = 0;

    while (p < data.length) {
      if (this._pktLenBytes < 4) {
        let nb = Math.min(4 - this._pktLenBytes, data.length - p);
        this._pktLenBytes += nb;

        while (nb--)
          this._pktLen = (this._pktLen << 8) + data[p++];

        if (this._pktLenBytes < 4)
          return;
        if (this._pktLen === 0)
          return doFatalSFTPError(this, 'Invalid packet length');
        if (this._pktLen > this._maxInPktLen) {
          const max = this._maxInPktLen;
          return doFatalSFTPError(
            this,
            `Packet length ${this._pktLen} exceeds max length of ${max}`
          );
        }
        if (p >= data.length)
          return;
      }
      if (this._pktPos < this._pktLen) {
        const nb = Math.min(this._pktLen - this._pktPos, data.length - p);
        if (p !== 0 || nb !== data.length) {
          if (nb === this._pktLen) {
            this._pkt = new FastBuffer(data.buffer, data.byteOffset + p, nb);
          } else {
            if (!this._pkt)
              this._pkt = Buffer.allocUnsafe(this._pktLen);
            this._pkt.set(
              new Uint8Array(data.buffer, data.byteOffset + p, nb),
              this._pktPos
            );
          }
        } else if (nb === this._pktLen) {
          this._pkt = data;
        } else {
          if (!this._pkt)
            this._pkt = Buffer.allocUnsafe(this._pktLen);
          this._pkt.set(data, this._pktPos);
        }
        p += nb;
        this._pktPos += nb;
        if (this._pktPos < this._pktLen)
          return;
      }

      const type = this._pkt[0];
      const payload = this._pkt;

      // Prepare for next packet
      this._pktLen = 0;
      this._pktLenBytes = 0;
      this._pkt = undefined;
      this._pktPos = 0;

      const handler = (this.server
                       ? SERVER_HANDLERS[type]
                       : CLIENT_HANDLERS[type]);
      if (!handler)
        return doFatalSFTPError(this, `Unknown packet type ${type}`);

      if (this._version === -1) {
        if (this.server) {
          if (type !== REQUEST.INIT)
            return doFatalSFTPError(this, `Expected INIT packet, got ${type}`);
        } else if (type !== RESPONSE.VERSION) {
          return doFatalSFTPError(this, `Expected VERSION packet, got ${type}`);
        }
      }

      if (handler(this, payload) === false)
        return;
    }
  }

  end() {
    this.destroy();
  }
  destroy() {
    if (this.outgoing.state === 'open' || this.outgoing.state === 'eof') {
      this.outgoing.state = 'closing';
      this._protocol.channelClose(this.outgoing.id);
    }
  }
  _init() {
    this._init = noop;
    if (!this.server)
      sendOrBuffer(this, CLIENT_VERSION_BUFFER);
  }

  // ===========================================================================
  // Client-specific ===========================================================
  // ===========================================================================
  createReadStream(path, options) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    return new ReadStream(this, path, options);
  }
  createWriteStream(path, options) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    return new WriteStream(this, path, options);
  }
  open(path, flags_, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (typeof attrs === 'function') {
      cb = attrs;
      attrs = undefined;
    }

    const flags = (typeof flags_ === 'number' ? flags_ : stringToFlags(flags_));
    if (flags === null)
      throw new Error(`Unknown flags string: ${flags_}`);

    let attrsFlags = 0;
    let attrsLen = 0;
    if (typeof attrs === 'string' || typeof attrs === 'number')
      attrs = { mode: attrs };
    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      attrsFlags = attrs.flags;
      attrsLen = attrs.nb;
    }

    /*
      uint32        id
      string        filename
      uint32        pflags
      ATTRS         attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen + 4 + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.OPEN;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);
    writeUInt32BE(buf, flags, p += pathLen);
    writeUInt32BE(buf, attrsFlags, p += 4);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }
    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} OPEN`
    );
  }
  close(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32     id
      string     handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.CLOSE;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(handle, p += 4);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} CLOSE`
    );
  }
  read(handle, buf, off, len, position, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');
    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');
    if (!Buffer.isBuffer(buf))
      throw new Error('buffer is not a Buffer');
    if (off >= buf.length)
      throw new Error('offset is out of bounds');
    if (off + len > buf.length)
      throw new Error('length extends beyond buffer');
    if (position === null)
      throw new Error('null position currently unsupported');

    read_(this, handle, buf, off, len, position, cb);
  }
  readData(handle, buf, off, len, position, cb) {
    // Backwards compatibility
    this.read(handle, buf, off, len, position, cb);
  }
  write(handle, buf, off, len, position, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');
    if (!Buffer.isBuffer(buf))
      throw new Error('buffer is not a Buffer');
    if (off > buf.length)
      throw new Error('offset is out of bounds');
    if (off + len > buf.length)
      throw new Error('length extends beyond buffer');
    if (position === null)
      throw new Error('null position currently unsupported');

    if (!len) {
      cb && process.nextTick(cb, undefined, 0);
      return;
    }

    const maxDataLen = this._maxWriteLen;
    const overflow = Math.max(len - maxDataLen, 0);
    const origPosition = position;

    if (overflow)
      len = maxDataLen;

    /*
      uint32     id
      string     handle
      uint64     offset
      string     data
    */
    const handleLen = handle.length;
    let p = 9;
    const out = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen + 8 + 4 + len);

    writeUInt32BE(out, out.length - 4, 0);
    out[4] = REQUEST.WRITE;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(out, reqid, 5);

    writeUInt32BE(out, handleLen, p);
    out.set(handle, p += 4);
    p += handleLen;
    for (let i = 7; i >= 0; --i) {
      out[p + i] = position & 0xFF;
      position /= 256;
    }
    writeUInt32BE(out, len, p += 8);
    bufferCopy(buf, out, off, off + len, p += 4);

    this._requests[reqid] = {
      cb: (err) => {
        if (err) {
          if (typeof cb === 'function')
            cb(err);
        } else if (overflow) {
          this.write(handle,
                     buf,
                     off + len,
                     overflow,
                     origPosition + len,
                     cb);
        } else if (typeof cb === 'function') {
          cb(undefined, off + len);
        }
      }
    };

    const isSent = sendOrBuffer(this, out);
    if (this._debug) {
      const how = (isSent ? 'Sent' : 'Buffered');
      this._debug(`SFTP: Outbound: ${how} WRITE (id:${reqid})`);
    }
  }
  writeData(handle, buf, off, len, position, cb) {
    // Backwards compatibility
    this.write(handle, buf, off, len, position, cb);
  }
  fastGet(remotePath, localPath, opts, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    fastXfer(this, fs, remotePath, localPath, opts, cb);
  }
  fastPut(localPath, remotePath, opts, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    fastXfer(fs, this, localPath, remotePath, opts, cb);
  }
  readFile(path, options, callback_) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let callback;
    if (typeof callback_ === 'function') {
      callback = callback_;
    } else if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    if (typeof options === 'string')
      options = { encoding: options, flag: 'r' };
    else if (!options)
      options = { encoding: null, flag: 'r' };
    else if (typeof options !== 'object')
      throw new TypeError('Bad arguments');

    const encoding = options.encoding;
    if (encoding && !Buffer.isEncoding(encoding))
      throw new Error(`Unknown encoding: ${encoding}`);

    // First stat the file, so we know the size.
    let size;
    let buffer; // Single buffer with file data
    let buffers; // List for when size is unknown
    let pos = 0;
    let handle;

    // SFTPv3 does not support using -1 for read position, so we have to track
    // read position manually
    let bytesRead = 0;

    const flag = options.flag || 'r';

    const read = () => {
      if (size === 0) {
        buffer = Buffer.allocUnsafe(8192);
        this.read(handle, buffer, 0, 8192, bytesRead, afterRead);
      } else {
        this.read(handle, buffer, pos, size - pos, bytesRead, afterRead);
      }
    };

    const afterRead = (er, nbytes) => {
      let eof;
      if (er) {
        eof = (er.code === STATUS_CODE.EOF);
        if (!eof) {
          return this.close(handle, () => {
            return callback && callback(er);
          });
        }
      } else {
        eof = false;
      }

      if (eof || (size === 0 && nbytes === 0))
        return close();

      bytesRead += nbytes;
      pos += nbytes;
      if (size !== 0) {
        if (pos === size)
          close();
        else
          read();
      } else {
        // Unknown size, just read until we don't get bytes.
        buffers.push(bufferSlice(buffer, 0, nbytes));
        read();
      }
    };
    afterRead._wantEOFError = true;

    const close = () => {
      this.close(handle, (er) => {
        if (size === 0) {
          // Collect the data into the buffers list.
          buffer = Buffer.concat(buffers, pos);
        } else if (pos < size) {
          buffer = bufferSlice(buffer, 0, pos);
        }

        if (encoding)
          buffer = buffer.toString(encoding);
        return callback && callback(er, buffer);
      });
    };

    this.open(path, flag, 0o666, (er, handle_) => {
      if (er)
        return callback && callback(er);
      handle = handle_;

      const tryStat = (er, st) => {
        if (er) {
          // Try stat() for sftp servers that may not support fstat() for
          // whatever reason
          this.stat(path, (er_, st_) => {
            if (er_) {
              return this.close(handle, () => {
                callback && callback(er);
              });
            }
            tryStat(null, st_);
          });
          return;
        }

        size = st.size || 0;
        if (size === 0) {
          // The kernel lies about many files.
          // Go ahead and try to read some bytes.
          buffers = [];
          return read();
        }

        buffer = Buffer.allocUnsafe(size);
        read();
      };
      this.fstat(handle, tryStat);
    });
  }
  writeFile(path, data, options, callback_) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let callback;
    if (typeof callback_ === 'function') {
      callback = callback_;
    } else if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    if (typeof options === 'string')
      options = { encoding: options, mode: 0o666, flag: 'w' };
    else if (!options)
      options = { encoding: 'utf8', mode: 0o666, flag: 'w' };
    else if (typeof options !== 'object')
      throw new TypeError('Bad arguments');

    if (options.encoding && !Buffer.isEncoding(options.encoding))
      throw new Error(`Unknown encoding: ${options.encoding}`);

    const flag = options.flag || 'w';
    this.open(path, flag, options.mode, (openErr, handle) => {
      if (openErr) {
        callback && callback(openErr);
      } else {
        const buffer = (Buffer.isBuffer(data)
                        ? data
                        : Buffer.from('' + data, options.encoding || 'utf8'));
        const position = (/a/.test(flag) ? null : 0);

        // SFTPv3 does not support the notion of 'current position'
        // (null position), so we just attempt to append to the end of the file
        // instead
        if (position === null) {
          const tryStat = (er, st) => {
            if (er) {
              // Try stat() for sftp servers that may not support fstat() for
              // whatever reason
              this.stat(path, (er_, st_) => {
                if (er_) {
                  return this.close(handle, () => {
                    callback && callback(er);
                  });
                }
                tryStat(null, st_);
              });
              return;
            }
            writeAll(this, handle, buffer, 0, buffer.length, st.size, callback);
          };
          this.fstat(handle, tryStat);
          return;
        }
        writeAll(this, handle, buffer, 0, buffer.length, position, callback);
      }
    });
  }
  appendFile(path, data, options, callback_) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let callback;
    if (typeof callback_ === 'function') {
      callback = callback_;
    } else if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    if (typeof options === 'string')
      options = { encoding: options, mode: 0o666, flag: 'a' };
    else if (!options)
      options = { encoding: 'utf8', mode: 0o666, flag: 'a' };
    else if (typeof options !== 'object')
      throw new TypeError('Bad arguments');

    if (!options.flag)
      options = Object.assign({ flag: 'a' }, options);
    this.writeFile(path, data, options, callback);
  }
  exists(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    this.stat(path, (err) => {
      cb && cb(err ? false : true);
    });
  }
  unlink(filename, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     filename
    */
    const fnameLen = Buffer.byteLength(filename);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + fnameLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.REMOVE;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, fnameLen, p);
    buf.utf8Write(filename, p += 4, fnameLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} REMOVE`
    );
  }
  rename(oldPath, newPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     oldpath
      string     newpath
    */
    const oldLen = Buffer.byteLength(oldPath);
    const newLen = Buffer.byteLength(newPath);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + oldLen + 4 + newLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.RENAME;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, oldLen, p);
    buf.utf8Write(oldPath, p += 4, oldLen);
    writeUInt32BE(buf, newLen, p += oldLen);
    buf.utf8Write(newPath, p += 4, newLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} RENAME`
    );
  }
  mkdir(path, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'function') {
      cb = attrs;
      attrs = undefined;
    }
    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    }

    /*
      uint32     id
      string     path
      ATTRS      attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.MKDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);
    writeUInt32BE(buf, flags, p += pathLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} MKDIR`
    );
  }
  rmdir(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.RMDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} RMDIR`
    );
  }
  readdir(where, opts, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    if (typeof opts !== 'object' || opts === null)
      opts = {};

    const doFilter = (opts && opts.full ? false : true);

    if (!Buffer.isBuffer(where) && typeof where !== 'string')
      throw new Error('missing directory handle or path');

    if (typeof where === 'string') {
      const entries = [];
      let e = 0;

      const reread = (err, handle) => {
        if (err)
          return cb(err);

        this.readdir(handle, opts, (err, list) => {
          const eof = (err && err.code === STATUS_CODE.EOF);

          if (err && !eof)
            return this.close(handle, () => cb(err));

          if (eof) {
            return this.close(handle, (err) => {
              if (err)
                return cb(err);
              cb(undefined, entries);
            });
          }

          for (let i = 0; i < list.length; ++i, ++e)
            entries[e] = list[i];

          reread(undefined, handle);
        });
      };
      return this.opendir(where, reread);
    }

    /*
      uint32     id
      string     handle
    */
    const handleLen = where.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.READDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(where, p += 4);

    this._requests[reqid] = {
      cb: (doFilter
           ? (err, list) => {
               if (typeof cb !== 'function')
                 return;
               if (err)
                 return cb(err);

               for (let i = list.length - 1; i >= 0; --i) {
                 if (list[i].filename === '.' || list[i].filename === '..')
                   list.splice(i, 1);
               }

               cb(undefined, list);
             }
           : cb)
    };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} READDIR`
    );
  }
  fstat(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32     id
      string     handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.FSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(handle, p += 4);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} FSTAT`
    );
  }
  stat(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.STAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} STAT`
    );
  }
  lstat(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.LSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} LSTAT`
    );
  }
  opendir(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.OPENDIR;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} OPENDIR`
    );
  }
  setstat(path, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    } else if (typeof attrs === 'function') {
      cb = attrs;
    }

    /*
      uint32     id
      string     path
      ATTRS      attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.SETSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);
    writeUInt32BE(buf, flags, p += pathLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} SETSTAT`
    );
  }
  fsetstat(handle, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    } else if (typeof attrs === 'function') {
      cb = attrs;
    }

    /*
      uint32     id
      string     handle
      ATTRS      attrs
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.FSETSTAT;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    buf.set(handle, p += 4);
    writeUInt32BE(buf, flags, p += handleLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} FSETSTAT`
    );
  }
  futimes(handle, atime, mtime, cb) {
    return this.fsetstat(handle, {
      atime: toUnixTimestamp(atime),
      mtime: toUnixTimestamp(mtime)
    }, cb);
  }
  utimes(path, atime, mtime, cb) {
    return this.setstat(path, {
      atime: toUnixTimestamp(atime),
      mtime: toUnixTimestamp(mtime)
    }, cb);
  }
  fchown(handle, uid, gid, cb) {
    return this.fsetstat(handle, {
      uid: uid,
      gid: gid
    }, cb);
  }
  chown(path, uid, gid, cb) {
    return this.setstat(path, {
      uid: uid,
      gid: gid
    }, cb);
  }
  fchmod(handle, mode, cb) {
    return this.fsetstat(handle, {
      mode: mode
    }, cb);
  }
  chmod(path, mode, cb) {
    return this.setstat(path, {
      mode: mode
    }, cb);
  }
  readlink(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.READLINK;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = {
      cb: (err, names) => {
        if (typeof cb !== 'function')
          return;
        if (err)
          return cb(err);
        if (!names || !names.length)
          return cb(new Error('Response missing link info'));
        cb(undefined, names[0].filename);
      }
    };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} READLINK`
    );
  }
  symlink(targetPath, linkPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     linkpath
      string     targetpath
    */
    const linkLen = Buffer.byteLength(linkPath);
    const targetLen = Buffer.byteLength(targetPath);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + linkLen + 4 + targetLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.SYMLINK;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    if (this._isOpenSSH) {
      // OpenSSH has linkpath and targetpath positions switched
      writeUInt32BE(buf, targetLen, p);
      buf.utf8Write(targetPath, p += 4, targetLen);
      writeUInt32BE(buf, linkLen, p += targetLen);
      buf.utf8Write(linkPath, p += 4, linkLen);
    } else {
      writeUInt32BE(buf, linkLen, p);
      buf.utf8Write(linkPath, p += 4, linkLen);
      writeUInt32BE(buf, targetLen, p += linkLen);
      buf.utf8Write(targetPath, p += 4, targetLen);
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} SYMLINK`
    );
  }
  realpath(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    /*
      uint32     id
      string     path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.REALPATH;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, pathLen, p);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = {
      cb: (err, names) => {
        if (typeof cb !== 'function')
          return;
        if (err)
          return cb(err);
        if (!names || !names.length)
          return cb(new Error('Response missing path info'));
        cb(undefined, names[0].filename);
      }
    };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} REALPATH`
    );
  }
  // extended requests
  ext_openssh_rename(oldPath, newPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['posix-rename@openssh.com'];
    if (!ext || ext !== '1')
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "posix-rename@openssh.com"
      string    oldpath
      string    newpath
    */
    const oldLen = Buffer.byteLength(oldPath);
    const newLen = Buffer.byteLength(newPath);
    let p = 9;
    const buf =
      Buffer.allocUnsafe(4 + 1 + 4 + 4 + 24 + 4 + oldLen + 4 + newLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 24, p);
    buf.utf8Write('posix-rename@openssh.com', p += 4, 24);
    writeUInt32BE(buf, oldLen, p += 24);
    buf.utf8Write(oldPath, p += 4, oldLen);
    writeUInt32BE(buf, newLen, p += oldLen);
    buf.utf8Write(newPath, p += 4, newLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} posix-rename@openssh.com`);
    }
  }
  ext_openssh_statvfs(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['statvfs@openssh.com'];
    if (!ext || ext !== '2')
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "statvfs@openssh.com"
      string    path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 19 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 19, p);
    buf.utf8Write('statvfs@openssh.com', p += 4, 19);
    writeUInt32BE(buf, pathLen, p += 19);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = { extended: 'statvfs@openssh.com', cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} statvfs@openssh.com`);
    }
  }
  ext_openssh_fstatvfs(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['fstatvfs@openssh.com'];
    if (!ext || ext !== '2')
      throw new Error('Server does not support this extended request');
    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32    id
      string    "fstatvfs@openssh.com"
      string    handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 20 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 20, p);
    buf.utf8Write('fstatvfs@openssh.com', p += 4, 20);
    writeUInt32BE(buf, handleLen, p += 20);
    buf.set(handle, p += 4);

    this._requests[reqid] = { extended: 'fstatvfs@openssh.com', cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} fstatvfs@openssh.com`);
    }
  }
  ext_openssh_hardlink(oldPath, newPath, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['hardlink@openssh.com'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "hardlink@openssh.com"
      string    oldpath
      string    newpath
    */
    const oldLen = Buffer.byteLength(oldPath);
    const newLen = Buffer.byteLength(newPath);
    let p = 9;
    const buf =
      Buffer.allocUnsafe(4 + 1 + 4 + 4 + 20 + 4 + oldLen + 4 + newLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 20, p);
    buf.utf8Write('hardlink@openssh.com', p += 4, 20);
    writeUInt32BE(buf, oldLen, p += 20);
    buf.utf8Write(oldPath, p += 4, oldLen);
    writeUInt32BE(buf, newLen, p += oldLen);
    buf.utf8Write(newPath, p += 4, newLen);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const which = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${which} hardlink@openssh.com`);
    }
  }
  ext_openssh_fsync(handle, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['fsync@openssh.com'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');
    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    /*
      uint32    id
      string    "fsync@openssh.com"
      string    handle
    */
    const handleLen = handle.length;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 17 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 17, p);
    buf.utf8Write('fsync@openssh.com', p += 4, 17);
    writeUInt32BE(buf, handleLen, p += 17);
    buf.set(handle, p += 4);

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} fsync@openssh.com`
    );
  }
  ext_openssh_lsetstat(path, attrs, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['lsetstat@openssh.com'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');

    let flags = 0;
    let attrsLen = 0;

    if (typeof attrs === 'object' && attrs !== null) {
      attrs = attrsToBytes(attrs);
      flags = attrs.flags;
      attrsLen = attrs.nb;
    } else if (typeof attrs === 'function') {
      cb = attrs;
    }

    /*
      uint32    id
      string    "lsetstat@openssh.com"
      string    path
      ATTRS     attrs
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf =
      Buffer.allocUnsafe(4 + 1 + 4 + 4 + 20 + 4 + pathLen + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 20, p);
    buf.utf8Write('lsetstat@openssh.com', p += 4, 20);

    writeUInt32BE(buf, pathLen, p += 20);
    buf.utf8Write(path, p += 4, pathLen);

    writeUInt32BE(buf, flags, p += pathLen);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const status = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${status} lsetstat@openssh.com`);
    }
  }
  ext_openssh_expandPath(path, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['expand-path@openssh.com'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');

    /*
      uint32    id
      string    "expand-path@openssh.com"
      string    path
    */
    const pathLen = Buffer.byteLength(path);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 23 + 4 + pathLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = REQUEST.EXTENDED;
    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, 23, p);
    buf.utf8Write('expand-path@openssh.com', p += 4, 23);

    writeUInt32BE(buf, pathLen, p += 20);
    buf.utf8Write(path, p += 4, pathLen);

    this._requests[reqid] = {
      cb: (err, names) => {
        if (typeof cb !== 'function')
          return;
        if (err)
          return cb(err);
        if (!names || !names.length)
          return cb(new Error('Response missing expanded path'));
        cb(undefined, names[0].filename);
      }
    };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const status = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${status} expand-path@openssh.com`);
    }
  }
  ext_copy_data(srcHandle, srcOffset, len, dstHandle, dstOffset, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['copy-data'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');

    if (!Buffer.isBuffer(srcHandle))
      throw new Error('Source handle is not a Buffer');

    if (!Buffer.isBuffer(dstHandle))
      throw new Error('Destination handle is not a Buffer');

    /*
      uint32    id
      string    "copy-data"
      string    read-from-handle
      uint64    read-from-offset
      uint64    read-data-length
      string    write-to-handle
      uint64    write-to-offset
    */
    let p = 0;
    const buf = Buffer.allocUnsafe(
      4 + 1
      + 4
      + 4 + 9
      + 4 + srcHandle.length
      + 8
      + 8
      + 4 + dstHandle.length
      + 8
    );

    writeUInt32BE(buf, buf.length - 4, p);
    p += 4;

    buf[p] = REQUEST.EXTENDED;
    ++p;

    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, p);
    p += 4;

    writeUInt32BE(buf, 9, p);
    p += 4;
    buf.utf8Write('copy-data', p, 9);
    p += 9;

    writeUInt32BE(buf, srcHandle.length, p);
    p += 4;
    buf.set(srcHandle, p);
    p += srcHandle.length;

    for (let i = 7; i >= 0; --i) {
      buf[p + i] = srcOffset & 0xFF;
      srcOffset /= 256;
    }
    p += 8;

    for (let i = 7; i >= 0; --i) {
      buf[p + i] = len & 0xFF;
      len /= 256;
    }
    p += 8;

    writeUInt32BE(buf, dstHandle.length, p);
    p += 4;
    buf.set(dstHandle, p);
    p += dstHandle.length;

    for (let i = 7; i >= 0; --i) {
      buf[p + i] = dstOffset & 0xFF;
      dstOffset /= 256;
    }

    this._requests[reqid] = { cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const status = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${status} copy-data`);
    }
  }
  ext_home_dir(username, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['home-directory'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');

    if (typeof username !== 'string')
      throw new TypeError('username is not a string');

    /*
      uint32    id
      string    "home-directory"
      string    username
    */
    let p = 0;
    const usernameLen = Buffer.byteLength(username);
    const buf = Buffer.allocUnsafe(
      4 + 1
      + 4
      + 4 + 14
      + 4 + usernameLen
    );

    writeUInt32BE(buf, buf.length - 4, p);
    p += 4;

    buf[p] = REQUEST.EXTENDED;
    ++p;

    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, p);
    p += 4;

    writeUInt32BE(buf, 14, p);
    p += 4;
    buf.utf8Write('home-directory', p, 14);
    p += 14;

    writeUInt32BE(buf, usernameLen, p);
    p += 4;
    buf.utf8Write(username, p, usernameLen);
    p += usernameLen;

    this._requests[reqid] = {
      cb: (err, names) => {
        if (typeof cb !== 'function')
          return;
        if (err)
          return cb(err);
        if (!names || !names.length)
          return cb(new Error('Response missing home directory'));
        cb(undefined, names[0].filename);
      }
    };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const status = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${status} home-directory`);
    }
  }
  ext_users_groups(uids, gids, cb) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    const ext = this._extensions['users-groups-by-id@openssh.com'];
    if (ext !== '1')
      throw new Error('Server does not support this extended request');

    if (!Array.isArray(uids))
      throw new TypeError('uids is not an array');
    for (const val of uids) {
      if (!Number.isInteger(val) || val < 0 || val > (2 ** 32 - 1))
        throw new Error('uid values must all be 32-bit unsigned integers');
    }
    if (!Array.isArray(gids))
      throw new TypeError('gids is not an array');
    for (const val of gids) {
      if (!Number.isInteger(val) || val < 0 || val > (2 ** 32 - 1))
        throw new Error('gid values must all be 32-bit unsigned integers');
    }

    /*
      uint32    id
      string    "users-groups-by-id@openssh.com"
      string    uids
        uint32    uid1
        ...
      string    gids
        uint32    gid1
        ...
    */
    let p = 0;
    const buf = Buffer.allocUnsafe(
      4 + 1
      + 4
      + 4 + 30
      + 4 + (4 * uids.length)
      + 4 + (4 * gids.length)
    );

    writeUInt32BE(buf, buf.length - 4, p);
    p += 4;

    buf[p] = REQUEST.EXTENDED;
    ++p;

    const reqid = this._writeReqid = (this._writeReqid + 1) & MAX_REQID;
    writeUInt32BE(buf, reqid, p);
    p += 4;

    writeUInt32BE(buf, 30, p);
    p += 4;
    buf.utf8Write('users-groups-by-id@openssh.com', p, 30);
    p += 30;

    writeUInt32BE(buf, 4 * uids.length, p);
    p += 4;
    for (const val of uids) {
      writeUInt32BE(buf, val, p);
      p += 4;
    }

    writeUInt32BE(buf, 4 * gids.length, p);
    p += 4;
    for (const val of gids) {
      writeUInt32BE(buf, val, p);
      p += 4;
    }

    this._requests[reqid] = { extended: 'users-groups-by-id@openssh.com', cb };

    const isBuffered = sendOrBuffer(this, buf);
    if (this._debug) {
      const status = (isBuffered ? 'Buffered' : 'Sending');
      this._debug(`SFTP: Outbound: ${status} users-groups-by-id@openssh.com`);
    }
  }
  // ===========================================================================
  // Server-specific ===========================================================
  // ===========================================================================
  handle(reqid, handle) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (!Buffer.isBuffer(handle))
      throw new Error('handle is not a Buffer');

    const handleLen = handle.length;

    if (handleLen > 256)
      throw new Error('handle too large (> 256 bytes)');

    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.HANDLE;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, handleLen, p);
    if (handleLen)
      buf.set(handle, p += 4);

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} HANDLE`
    );
  }
  status(reqid, code, message) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (!VALID_STATUS_CODES.has(code))
      throw new Error(`Bad status code: ${code}`);

    message || (message = '');

    const msgLen = Buffer.byteLength(message);
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 4 + msgLen + 4);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.STATUS;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, code, p);

    writeUInt32BE(buf, msgLen, p += 4);
    p += 4;
    if (msgLen) {
      buf.utf8Write(message, p, msgLen);
      p += msgLen;
    }

    writeUInt32BE(buf, 0, p); // Empty language tag

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} STATUS`
    );
  }
  data(reqid, data, encoding) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    const isBuffer = Buffer.isBuffer(data);

    if (!isBuffer && typeof data !== 'string')
      throw new Error('data is not a Buffer or string');

    let isUTF8;
    if (!isBuffer && !encoding) {
      encoding = undefined;
      isUTF8 = true;
    }

    const dataLen = (
      isBuffer
      ? data.length
      : Buffer.byteLength(data, encoding)
    );
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + dataLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.DATA;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, dataLen, p);
    if (dataLen) {
      if (isBuffer)
        buf.set(data, p += 4);
      else if (isUTF8)
        buf.utf8Write(data, p += 4, dataLen);
      else
        buf.write(data, p += 4, dataLen, encoding);
    }

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} DATA`
    );
  }
  name(reqid, names) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (!Array.isArray(names)) {
      if (typeof names !== 'object' || names === null)
        throw new Error('names is not an object or array');
      names = [ names ];
    }

    const count = names.length;
    let namesLen = 0;
    let nameAttrs;
    const attrs = [];

    for (let i = 0; i < count; ++i) {
      const name = names[i];
      const filename = (
        !name || !name.filename || typeof name.filename !== 'string'
        ? ''
        : name.filename
      );
      namesLen += 4 + Buffer.byteLength(filename);
      const longname = (
        !name || !name.longname || typeof name.longname !== 'string'
        ? ''
        : name.longname
      );
      namesLen += 4 + Buffer.byteLength(longname);

      if (typeof name.attrs === 'object' && name.attrs !== null) {
        nameAttrs = attrsToBytes(name.attrs);
        namesLen += 4 + nameAttrs.nb;

        if (nameAttrs.nb) {
          let bytes;

          if (nameAttrs.nb === ATTRS_BUF.length) {
            bytes = new Uint8Array(ATTRS_BUF);
          } else {
            bytes = new Uint8Array(nameAttrs.nb);
            bufferCopy(ATTRS_BUF, bytes, 0, nameAttrs.nb, 0);
          }

          nameAttrs.bytes = bytes;
        }

        attrs.push(nameAttrs);
      } else {
        namesLen += 4;
        attrs.push(null);
      }
    }

    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + namesLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.NAME;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, count, p);

    p += 4;

    for (let i = 0; i < count; ++i) {
      const name = names[i];

      {
        const filename = (
          !name || !name.filename || typeof name.filename !== 'string'
          ? ''
          : name.filename
        );
        const len = Buffer.byteLength(filename);
        writeUInt32BE(buf, len, p);
        p += 4;
        if (len) {
          buf.utf8Write(filename, p, len);
          p += len;
        }
      }

      {
        const longname = (
          !name || !name.longname || typeof name.longname !== 'string'
          ? ''
          : name.longname
        );
        const len = Buffer.byteLength(longname);
        writeUInt32BE(buf, len, p);
        p += 4;
        if (len) {
          buf.utf8Write(longname, p, len);
          p += len;
        }
      }

      const attr = attrs[i];
      if (attr) {
        writeUInt32BE(buf, attr.flags, p);
        p += 4;
        if (attr.flags && attr.bytes) {
          buf.set(attr.bytes, p);
          p += attr.nb;
        }
      } else {
        writeUInt32BE(buf, 0, p);
        p += 4;
      }
    }

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} NAME`
    );
  }
  attrs(reqid, attrs) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (typeof attrs !== 'object' || attrs === null)
      throw new Error('attrs is not an object');

    attrs = attrsToBytes(attrs);
    const flags = attrs.flags;
    const attrsLen = attrs.nb;
    let p = 9;
    const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + attrsLen);

    writeUInt32BE(buf, buf.length - 4, 0);
    buf[4] = RESPONSE.ATTRS;
    writeUInt32BE(buf, reqid, 5);

    writeUInt32BE(buf, flags, p);
    if (attrsLen) {
      p += 4;

      if (attrsLen === ATTRS_BUF.length)
        buf.set(ATTRS_BUF, p);
      else
        bufferCopy(ATTRS_BUF, buf, 0, attrsLen, p);

      p += attrsLen;
    }

    const isBuffered = sendOrBuffer(this, buf);
    this._debug && this._debug(
      `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} ATTRS`
    );
  }
}

function tryCreateBuffer(size) {
  try {
    return Buffer.allocUnsafe(size);
  } catch (ex) {
    return ex;
  }
}

function read_(self, handle, buf, off, len, position, cb, req_) {
  const maxDataLen = self._maxReadLen;
  const overflow = Math.max(len - maxDataLen, 0);

  if (overflow)
    len = maxDataLen;

  /*
    uint32     id
    string     handle
    uint64     offset
    uint32     len
  */
  const handleLen = handle.length;
  let p = 9;
  let pos = position;
  const out = Buffer.allocUnsafe(4 + 1 + 4 + 4 + handleLen + 8 + 4);

  writeUInt32BE(out, out.length - 4, 0);
  out[4] = REQUEST.READ;
  const reqid = self._writeReqid = (self._writeReqid + 1) & MAX_REQID;
  writeUInt32BE(out, reqid, 5);

  writeUInt32BE(out, handleLen, p);
  out.set(handle, p += 4);
  p += handleLen;
  for (let i = 7; i >= 0; --i) {
    out[p + i] = pos & 0xFF;
    pos /= 256;
  }
  writeUInt32BE(out, len, p += 8);

  if (typeof cb !== 'function')
    cb = noop;

  const req = (req_ || {
    nb: 0,
    position,
    off,
    origOff: off,
    len: undefined,
    overflow: undefined,
    cb: (err, data, nb) => {
      const len = req.len;
      const overflow = req.overflow;

      if (err) {
        if (cb._wantEOFError || err.code !== STATUS_CODE.EOF)
          return cb(err);
      } else if (nb > len) {
        return cb(new Error('Received more data than requested'));
      } else if (nb === len && overflow) {
        req.nb += nb;
        req.position += nb;
        req.off += nb;
        read_(self, handle, buf, req.off, overflow, req.position, cb, req);
        return;
      }

      nb = (nb || 0);
      if (req.origOff === 0 && buf.length === req.nb)
        data = buf;
      else
        data = bufferSlice(buf, req.origOff, req.origOff + req.nb + nb);
      cb(undefined, req.nb + nb, data, req.position);
    },
    buffer: undefined,
  });

  req.len = len;
  req.overflow = overflow;

  // TODO: avoid creating multiple buffer slices when we need to re-call read_()
  // because of overflow
  req.buffer = bufferSlice(buf, off, off + len);

  self._requests[reqid] = req;

  const isBuffered = sendOrBuffer(self, out);
  self._debug && self._debug(
    `SFTP: Outbound: ${isBuffered ? 'Buffered' : 'Sending'} READ`
  );
}

function fastXfer(src, dst, srcPath, dstPath, opts, cb) {
  let concurrency = 64;
  let chunkSize = 32768;
  let onstep;
  let mode;
  let fileSize;

  if (typeof opts === 'function') {
    cb = opts;
  } else if (typeof opts === 'object' && opts !== null) {
    if (typeof opts.concurrency === 'number'
        && opts.concurrency > 0
        && !isNaN(opts.concurrency)) {
      concurrency = opts.concurrency;
    }
    if (typeof opts.chunkSize === 'number'
        && opts.chunkSize > 0
        && !isNaN(opts.chunkSize)) {
      chunkSize = opts.chunkSize;
    }
    if (typeof opts.fileSize === 'number'
        && opts.fileSize > 0
        && !isNaN(opts.fileSize)) {
      fileSize = opts.fileSize;
    }
    if (typeof opts.step === 'function')
      onstep = opts.step;

    if (typeof opts.mode === 'string' || typeof opts.mode === 'number')
      mode = modeNum(opts.mode);
  }

  // Internal state variables
  let fsize;
  let pdst = 0;
  let total = 0;
  let hadError = false;
  let srcHandle;
  let dstHandle;
  let readbuf;
  let bufsize = chunkSize * concurrency;

  function onerror(err) {
    if (hadError)
      return;

    hadError = true;

    let left = 0;
    let cbfinal;

    if (srcHandle || dstHandle) {
      cbfinal = () => {
        if (--left === 0)
          cb(err);
      };
      if (srcHandle && (src === fs || src.outgoing.state === 'open'))
        ++left;
      if (dstHandle && (dst === fs || dst.outgoing.state === 'open'))
        ++left;
      if (srcHandle && (src === fs || src.outgoing.state === 'open'))
        src.close(srcHandle, cbfinal);
      if (dstHandle && (dst === fs || dst.outgoing.state === 'open'))
        dst.close(dstHandle, cbfinal);
    } else {
      cb(err);
    }
  }

  src.open(srcPath, 'r', (err, sourceHandle) => {
    if (err)
      return onerror(err);

    srcHandle = sourceHandle;

    if (fileSize === undefined)
      src.fstat(srcHandle, tryStat);
    else
      tryStat(null, { size: fileSize });

    function tryStat(err, attrs) {
      if (err) {
        if (src !== fs) {
          // Try stat() for sftp servers that may not support fstat() for
          // whatever reason
          src.stat(srcPath, (err_, attrs_) => {
            if (err_)
              return onerror(err);
            tryStat(null, attrs_);
          });
          return;
        }
        return onerror(err);
      }
      fsize = attrs.size;

      dst.open(dstPath, 'w', (err, destHandle) => {
        if (err)
          return onerror(err);

        dstHandle = destHandle;

        if (fsize <= 0)
          return onerror();

        // Use less memory where possible
        while (bufsize > fsize) {
          if (concurrency === 1) {
            bufsize = fsize;
            break;
          }
          bufsize -= chunkSize;
          --concurrency;
        }

        readbuf = tryCreateBuffer(bufsize);
        if (readbuf instanceof Error)
          return onerror(readbuf);

        if (mode !== undefined) {
          dst.fchmod(dstHandle, mode, function tryAgain(err) {
            if (err) {
              // Try chmod() for sftp servers that may not support fchmod()
              // for whatever reason
              dst.chmod(dstPath, mode, (err_) => tryAgain());
              return;
            }
            startReads();
          });
        } else {
          startReads();
        }

        function onread(err, nb, data, dstpos, datapos, origChunkLen) {
          if (err)
            return onerror(err);

          datapos = datapos || 0;

          dst.write(dstHandle, readbuf, datapos, nb, dstpos, writeCb);

          function writeCb(err) {
            if (err)
              return onerror(err);

            total += nb;
            onstep && onstep(total, nb, fsize);

            if (nb < origChunkLen)
              return singleRead(datapos, dstpos + nb, origChunkLen - nb);

            if (total === fsize) {
              dst.close(dstHandle, (err) => {
                dstHandle = undefined;
                if (err)
                  return onerror(err);
                src.close(srcHandle, (err) => {
                  srcHandle = undefined;
                  if (err)
                    return onerror(err);
                  cb();
                });
              });
              return;
            }

            if (pdst >= fsize)
              return;

            const chunk =
              (pdst + chunkSize > fsize ? fsize - pdst : chunkSize);
            singleRead(datapos, pdst, chunk);
            pdst += chunk;
          }
        }

        function makeCb(psrc, pdst, chunk) {
          return (err, nb, data) => {
            onread(err, nb, data, pdst, psrc, chunk);
          };
        }

        function singleRead(psrc, pdst, chunk) {
          src.read(srcHandle,
                   readbuf,
                   psrc,
                   chunk,
                   pdst,
                   makeCb(psrc, pdst, chunk));
        }

        function startReads() {
          let reads = 0;
          let psrc = 0;
          while (pdst < fsize && reads < concurrency) {
            const chunk =
              (pdst + chunkSize > fsize ? fsize - pdst : chunkSize);
            singleRead(psrc, pdst, chunk);
            psrc += chunk;
            pdst += chunk;
            ++reads;
          }
        }
      });
    }
  });
}

function writeAll(sftp, handle, buffer, offset, length, position, callback_) {
  const callback = (typeof callback_ === 'function' ? callback_ : undefined);

  sftp.write(handle,
             buffer,
             offset,
             length,
             position,
             (writeErr, written) => {
    if (writeErr) {
      return sftp.close(handle, () => {
        callback && callback(writeErr);
      });
    }
    if (written === length) {
      sftp.close(handle, callback);
    } else {
      offset += written;
      length -= written;
      position += written;
      writeAll(sftp, handle, buffer, offset, length, position, callback);
    }
  });
}

class Stats {
  constructor(initial) {
    this.mode = (initial && initial.mode);
    this.uid = (initial && initial.uid);
    this.gid = (initial && initial.gid);
    this.size = (initial && initial.size);
    this.atime = (initial && initial.atime);
    this.mtime = (initial && initial.mtime);
    this.extended = (initial && initial.extended);
  }
  isDirectory() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFDIR);
  }
  isFile() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFREG);
  }
  isBlockDevice() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFBLK);
  }
  isCharacterDevice() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFCHR);
  }
  isSymbolicLink() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFLNK);
  }
  isFIFO() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFIFO);
  }
  isSocket() {
    return ((this.mode & constants.S_IFMT) === constants.S_IFSOCK);
  }
}

function attrsToBytes(attrs) {
  let flags = 0;
  let nb = 0;

  if (typeof attrs === 'object' && attrs !== null) {
    if (typeof attrs.size === 'number') {
      flags |= ATTR.SIZE;
      const val = attrs.size;
      // Big Endian
      ATTRS_BUF[nb++] = val / 72057594037927940; // 2**56
      ATTRS_BUF[nb++] = val / 281474976710656; // 2**48
      ATTRS_BUF[nb++] = val / 1099511627776; // 2**40
      ATTRS_BUF[nb++] = val / 4294967296; // 2**32
      ATTRS_BUF[nb++] = val / 16777216; // 2**24
      ATTRS_BUF[nb++] = val / 65536; // 2**16
      ATTRS_BUF[nb++] = val / 256; // 2**8
      ATTRS_BUF[nb++] = val;
    }
    if (typeof attrs.uid === 'number' && typeof attrs.gid === 'number') {
      flags |= ATTR.UIDGID;
      const uid = attrs.uid;
      const gid = attrs.gid;
      // Big Endian
      ATTRS_BUF[nb++] = uid >>> 24;
      ATTRS_BUF[nb++] = uid >>> 16;
      ATTRS_BUF[nb++] = uid >>> 8;
      ATTRS_BUF[nb++] = uid;
      ATTRS_BUF[nb++] = gid >>> 24;
      ATTRS_BUF[nb++] = gid >>> 16;
      ATTRS_BUF[nb++] = gid >>> 8;
      ATTRS_BUF[nb++] = gid;
    }
    if (typeof attrs.mode === 'number' || typeof attrs.mode === 'string') {
      const mode = modeNum(attrs.mode);
      flags |= ATTR.PERMISSIONS;
      // Big Endian
      ATTRS_BUF[nb++] = mode >>> 24;
      ATTRS_BUF[nb++] = mode >>> 16;
      ATTRS_BUF[nb++] = mode >>> 8;
      ATTRS_BUF[nb++] = mode;
    }
    if ((typeof attrs.atime === 'number' || isDate(attrs.atime))
        && (typeof attrs.mtime === 'number' || isDate(attrs.mtime))) {
      const atime = toUnixTimestamp(attrs.atime);
      const mtime = toUnixTimestamp(attrs.mtime);

      flags |= ATTR.ACMODTIME;
      // Big Endian
      ATTRS_BUF[nb++] = atime >>> 24;
      ATTRS_BUF[nb++] = atime >>> 16;
      ATTRS_BUF[nb++] = atime >>> 8;
      ATTRS_BUF[nb++] = atime;
      ATTRS_BUF[nb++] = mtime >>> 24;
      ATTRS_BUF[nb++] = mtime >>> 16;
      ATTRS_BUF[nb++] = mtime >>> 8;
      ATTRS_BUF[nb++] = mtime;
    }
    // TODO: extended attributes
  }

  return { flags, nb };
}

function toUnixTimestamp(time) {
  // eslint-disable-next-line no-self-compare
  if (typeof time === 'number' && time === time) // Valid, non-NaN number
    return time;
  if (isDate(time))
    return parseInt(time.getTime() / 1000, 10);
  throw new Error(`Cannot parse time: ${time}`);
}

function modeNum(mode) {
  // eslint-disable-next-line no-self-compare
  if (typeof mode === 'number' && mode === mode) // Valid, non-NaN number
    return mode;
  if (typeof mode === 'string')
    return modeNum(parseInt(mode, 8));
  throw new Error(`Cannot parse mode: ${mode}`);
}

const stringFlagMap = {
  'r': OPEN_MODE.READ,
  'r+': OPEN_MODE.READ | OPEN_MODE.WRITE,
  'w': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE,
  'wx': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'xw': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'w+': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE,
  'wx+': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL,
  'xw+': OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL,
  'a': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.WRITE,
  'ax': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'xa': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.WRITE | OPEN_MODE.EXCL,
  'a+': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE,
  'ax+': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL,
  'xa+': OPEN_MODE.APPEND | OPEN_MODE.CREAT | OPEN_MODE.READ | OPEN_MODE.WRITE
         | OPEN_MODE.EXCL
};

function stringToFlags(str) {
  const flags = stringFlagMap[str];
  return (flags !== undefined ? flags : null);
}

const flagsToString = (() => {
  const stringFlagMapKeys = Object.keys(stringFlagMap);
  return (flags) => {
    for (let i = 0; i < stringFlagMapKeys.length; ++i) {
      const key = stringFlagMapKeys[i];
      if (stringFlagMap[key] === flags)
        return key;
    }
    return null;
  };
})();

function readAttrs(biOpt) {
  /*
    uint32   flags
    uint64   size           present only if flag SSH_FILEXFER_ATTR_SIZE
    uint32   uid            present only if flag SSH_FILEXFER_ATTR_UIDGID
    uint32   gid            present only if flag SSH_FILEXFER_ATTR_UIDGID
    uint32   permissions    present only if flag SSH_FILEXFER_ATTR_PERMISSIONS
    uint32   atime          present only if flag SSH_FILEXFER_ACMODTIME
    uint32   mtime          present only if flag SSH_FILEXFER_ACMODTIME
    uint32   extended_count present only if flag SSH_FILEXFER_ATTR_EXTENDED
    string   extended_type
    string   extended_data
    ...      more extended data (extended_type - extended_data pairs),
               so that number of pairs equals extended_count
  */
  const flags = bufferParser.readUInt32BE();
  if (flags === undefined)
    return;

  const attrs = new Stats();
  if (flags & ATTR.SIZE) {
    const size = bufferParser.readUInt64BE(biOpt);
    if (size === undefined)
      return;
    attrs.size = size;
  }

  if (flags & ATTR.UIDGID) {
    const uid = bufferParser.readUInt32BE();
    const gid = bufferParser.readUInt32BE();
    if (gid === undefined)
      return;
    attrs.uid = uid;
    attrs.gid = gid;
  }

  if (flags & ATTR.PERMISSIONS) {
    const mode = bufferParser.readUInt32BE();
    if (mode === undefined)
      return;
    attrs.mode = mode;
  }

  if (flags & ATTR.ACMODTIME) {
    const atime = bufferParser.readUInt32BE();
    const mtime = bufferParser.readUInt32BE();
    if (mtime === undefined)
      return;
    attrs.atime = atime;
    attrs.mtime = mtime;
  }

  if (flags & ATTR.EXTENDED) {
    const count = bufferParser.readUInt32BE();
    if (count === undefined)
      return;
    const extended = {};
    for (let i = 0; i < count; ++i) {
      const type = bufferParser.readString(true);
      const data = bufferParser.readString();
      if (data === undefined)
        return;
      extended[type] = data;
    }
    attrs.extended = extended;
  }

  return attrs;
}

function sendOrBuffer(sftp, payload) {
  const ret = tryWritePayload(sftp, payload);
  if (ret !== undefined) {
    sftp._buffer.push(ret);
    return false;
  }
  return true;
}

function tryWritePayload(sftp, payload) {
  const outgoing = sftp.outgoing;
  if (outgoing.state !== 'open')
    return;

  if (outgoing.window === 0) {
    sftp._waitWindow = true;
    sftp._chunkcb = drainBuffer;
    return payload;
  }

  let ret;
  const len = payload.length;
  let p = 0;

  while (len - p > 0 && outgoing.window > 0) {
    const actualLen = Math.min(len - p, outgoing.window, outgoing.packetSize);
    outgoing.window -= actualLen;
    if (outgoing.window === 0) {
      sftp._waitWindow = true;
      sftp._chunkcb = drainBuffer;
    }

    if (p === 0 && actualLen === len) {
      sftp._protocol.channelData(sftp.outgoing.id, payload);
    } else {
      sftp._protocol.channelData(sftp.outgoing.id,
                                 bufferSlice(payload, p, p + actualLen));
    }

    p += actualLen;
  }

  if (len - p > 0) {
    if (p > 0)
      ret = bufferSlice(payload, p, len);
    else
      ret = payload; // XXX: should never get here?
  }

  return ret;
}

function drainBuffer() {
  this._chunkcb = undefined;
  const buffer = this._buffer;
  let i = 0;
  while (i < buffer.length) {
    const payload = buffer[i];
    const ret = tryWritePayload(this, payload);
    if (ret !== undefined) {
      if (ret !== payload)
        buffer[i] = ret;
      if (i > 0)
        this._buffer = buffer.slice(i);
      return;
    }
    ++i;
  }
  if (i > 0)
    this._buffer = [];
}

function doFatalSFTPError(sftp, msg, noDebug) {
  const err = new Error(msg);
  err.level = 'sftp-protocol';
  if (!noDebug && sftp._debug)
    sftp._debug(`SFTP: Inbound: ${msg}`);
  sftp.emit('error', err);
  sftp.destroy();
  cleanupRequests(sftp);
  return false;
}

function cleanupRequests(sftp) {
  const keys = Object.keys(sftp._requests);
  if (keys.length === 0)
    return;

  const reqs = sftp._requests;
  sftp._requests = {};
  const err = new Error('No response from server');
  for (let i = 0; i < keys.length; ++i) {
    const req = reqs[keys[i]];
    if (typeof req.cb === 'function')
      req.cb(err);
  }
}

function requestLimits(sftp, cb) {
  /*
    uint32    id
    string    "limits@openssh.com"
  */
  let p = 9;
  const buf = Buffer.allocUnsafe(4 + 1 + 4 + 4 + 18);

  writeUInt32BE(buf, buf.length - 4, 0);
  buf[4] = REQUEST.EXTENDED;
  const reqid = sftp._writeReqid = (sftp._writeReqid + 1) & MAX_REQID;
  writeUInt32BE(buf, reqid, 5);

  writeUInt32BE(buf, 18, p);
  buf.utf8Write('limits@openssh.com', p += 4, 18);

  sftp._requests[reqid] = { extended: 'limits@openssh.com', cb };

  const isBuffered = sendOrBuffer(sftp, buf);
  if (sftp._debug) {
    const which = (isBuffered ? 'Buffered' : 'Sending');
    sftp._debug(`SFTP: Outbound: ${which} limits@openssh.com`);
  }
}

const CLIENT_HANDLERS = {
  [RESPONSE.VERSION]: (sftp, payload) => {
    if (sftp._version !== -1)
      return doFatalSFTPError(sftp, 'Duplicate VERSION packet');

    const extensions = {};

    /*
      uint32 version
      <extension data>
    */
    bufferParser.init(payload, 1);
    let version = bufferParser.readUInt32BE();
    while (bufferParser.avail()) {
      const extName = bufferParser.readString(true);
      const extData = bufferParser.readString(true);
      if (extData === undefined) {
        version = undefined;
        break;
      }
      extensions[extName] = extData;
    }
    bufferParser.clear();

    if (version === undefined)
      return doFatalSFTPError(sftp, 'Malformed VERSION packet');

    if (sftp._debug) {
      const names = Object.keys(extensions);
      if (names.length) {
        sftp._debug(
          `SFTP: Inbound: Received VERSION (v${version}, exts:${names})`
        );
      } else {
        sftp._debug(`SFTP: Inbound: Received VERSION (v${version})`);
      }
    }

    sftp._version = version;
    sftp._extensions = extensions;

    if (extensions['limits@openssh.com'] === '1') {
      return requestLimits(sftp, (err, limits) => {
        if (!err) {
          if (limits.maxPktLen > 0)
            sftp._maxOutPktLen = limits.maxPktLen;
          if (limits.maxReadLen > 0)
            sftp._maxReadLen = limits.maxReadLen;
          if (limits.maxWriteLen > 0)
            sftp._maxWriteLen = limits.maxWriteLen;
          sftp.maxOpenHandles = (
            limits.maxOpenHandles > 0 ? limits.maxOpenHandles : Infinity
          );
        }
        sftp.emit('ready');
      });
    }

    sftp.emit('ready');
  },
  [RESPONSE.STATUS]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      uint32     error/status code
      string     error message (ISO-10646 UTF-8)
      string     language tag
    */
    const errorCode = bufferParser.readUInt32BE();
    const errorMsg = bufferParser.readString(true);
    bufferParser.clear();

    // Note: we avoid checking that the error message and language tag are in
    // the packet because there are some broken implementations that incorrectly
    // omit them. The language tag in general was never really used amongst ssh
    // implementations, so in the case of a missing error message we just
    // default to something sensible.

    if (sftp._debug) {
      const jsonMsg = JSON.stringify(errorMsg);
      sftp._debug(
        `SFTP: Inbound: Received STATUS (id:${reqID}, ${errorCode}, ${jsonMsg})`
      );
    }
    const req = sftp._requests[reqID];
    delete sftp._requests[reqID];
    if (req && typeof req.cb === 'function') {
      if (errorCode === STATUS_CODE.OK) {
        req.cb();
        return;
      }
      const err = new Error(errorMsg
                            || STATUS_CODE_STR[errorCode]
                            || 'Unknown status');
      err.code = errorCode;
      req.cb(err);
    }
  },
  [RESPONSE.HANDLE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined) {
      if (reqID !== undefined)
        delete sftp._requests[reqID];
      return doFatalSFTPError(sftp, 'Malformed HANDLE packet');
    }

    sftp._debug && sftp._debug(`SFTP: Inbound: Received HANDLE (id:${reqID})`);

    const req = sftp._requests[reqID];
    delete sftp._requests[reqID];
    if (req && typeof req.cb === 'function')
      req.cb(undefined, handle);
  },
  [RESPONSE.DATA]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    let req;
    if (reqID !== undefined) {
      req = sftp._requests[reqID];
      delete sftp._requests[reqID];
    }
    /*
      string     data
    */
    if (req && typeof req.cb === 'function') {
      if (req.buffer) {
        // We have already pre-allocated space to store the data

        const nb = bufferParser.readString(req.buffer);
        bufferParser.clear();

        if (nb !== undefined) {
          sftp._debug && sftp._debug(
            `SFTP: Inbound: Received DATA (id:${reqID}, ${nb})`
          );
          req.cb(undefined, req.buffer, nb);
          return;
        }
      } else {
        const data = bufferParser.readString();
        bufferParser.clear();

        if (data !== undefined) {
          sftp._debug && sftp._debug(
            `SFTP: Inbound: Received DATA (id:${reqID}, ${data.length})`
          );
          req.cb(undefined, data);
          return;
        }
      }
    } else {
      const nb = bufferParser.skipString();
      bufferParser.clear();
      if (nb !== undefined) {
        sftp._debug && sftp._debug(
          `SFTP: Inbound: Received DATA (id:${reqID}, ${nb})`
        );
        return;
      }
    }

    return doFatalSFTPError(sftp, 'Malformed DATA packet');
  },
  [RESPONSE.NAME]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    let req;
    if (reqID !== undefined) {
      req = sftp._requests[reqID];
      delete sftp._requests[reqID];
    }
    /*
      uint32     count
      repeats count times:
              string     filename
              string     longname
              ATTRS      attrs
    */
    const count = bufferParser.readUInt32BE();
    if (count !== undefined) {
      let names = [];
      for (let i = 0; i < count; ++i) {
        // We are going to assume UTF-8 for filenames despite the SFTPv3
        // spec not specifying an encoding because the specs for newer
        // versions of the protocol all explicitly specify UTF-8 for
        // filenames
        const filename = bufferParser.readString(true);

        // `longname` only exists in SFTPv3 and since it typically will
        // contain the filename, we assume it is also UTF-8
        const longname = bufferParser.readString(true);

        const attrs = readAttrs(sftp._biOpt);
        if (attrs === undefined) {
          names = undefined;
          break;
        }
        names.push({ filename, longname, attrs });
      }
      if (names !== undefined) {
        sftp._debug && sftp._debug(
          `SFTP: Inbound: Received NAME (id:${reqID}, ${names.length})`
        );
        bufferParser.clear();
        if (req && typeof req.cb === 'function')
          req.cb(undefined, names);
        return;
      }
    }

    bufferParser.clear();
    return doFatalSFTPError(sftp, 'Malformed NAME packet');
  },
  [RESPONSE.ATTRS]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    let req;
    if (reqID !== undefined) {
      req = sftp._requests[reqID];
      delete sftp._requests[reqID];
    }
    /*
      ATTRS      attrs
    */
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();
    if (attrs !== undefined) {
      sftp._debug && sftp._debug(`SFTP: Inbound: Received ATTRS (id:${reqID})`);
      if (req && typeof req.cb === 'function')
        req.cb(undefined, attrs);
      return;
    }

    return doFatalSFTPError(sftp, 'Malformed ATTRS packet');
  },
  [RESPONSE.EXTENDED]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    if (reqID !== undefined) {
      const req = sftp._requests[reqID];
      if (req) {
        delete sftp._requests[reqID];
        switch (req.extended) {
          case 'statvfs@openssh.com':
          case 'fstatvfs@openssh.com': {
            /*
              uint64    f_bsize   // file system block size
              uint64    f_frsize  // fundamental fs block size
              uint64    f_blocks  // number of blocks (unit f_frsize)
              uint64    f_bfree   // free blocks in file system
              uint64    f_bavail  // free blocks for non-root
              uint64    f_files   // total file inodes
              uint64    f_ffree   // free file inodes
              uint64    f_favail  // free file inodes for to non-root
              uint64    f_fsid    // file system id
              uint64    f_flag    // bit mask of f_flag values
              uint64    f_namemax // maximum filename length
            */
            const biOpt = sftp._biOpt;
            const stats = {
              f_bsize: bufferParser.readUInt64BE(biOpt),
              f_frsize: bufferParser.readUInt64BE(biOpt),
              f_blocks: bufferParser.readUInt64BE(biOpt),
              f_bfree: bufferParser.readUInt64BE(biOpt),
              f_bavail: bufferParser.readUInt64BE(biOpt),
              f_files: bufferParser.readUInt64BE(biOpt),
              f_ffree: bufferParser.readUInt64BE(biOpt),
              f_favail: bufferParser.readUInt64BE(biOpt),
              f_sid: bufferParser.readUInt64BE(biOpt),
              f_flag: bufferParser.readUInt64BE(biOpt),
              f_namemax: bufferParser.readUInt64BE(biOpt),
            };
            if (stats.f_namemax === undefined)
              break;
            if (sftp._debug) {
              sftp._debug(
                'SFTP: Inbound: Received EXTENDED_REPLY '
                  + `(id:${reqID}, ${req.extended})`
              );
            }
            bufferParser.clear();
            if (typeof req.cb === 'function')
              req.cb(undefined, stats);
            return;
          }
          case 'limits@openssh.com': {
            /*
              uint64          max-packet-length
              uint64          max-read-length
              uint64          max-write-length
              uint64          max-open-handles
            */
            const limits = {
              maxPktLen: bufferParser.readUInt64BE(),
              maxReadLen: bufferParser.readUInt64BE(),
              maxWriteLen: bufferParser.readUInt64BE(),
              maxOpenHandles: bufferParser.readUInt64BE(),
            };
            if (limits.maxOpenHandles === undefined)
              break;
            if (sftp._debug) {
              sftp._debug(
                'SFTP: Inbound: Received EXTENDED_REPLY '
                  + `(id:${reqID}, ${req.extended})`
              );
            }
            bufferParser.clear();
            if (typeof req.cb === 'function')
              req.cb(undefined, limits);
            return;
          }
          case 'users-groups-by-id@openssh.com': {
            /*
              string    usernames
                string    username1
                ...
              string    groupnames
                string    groupname1
                ...
            */
            const usernameCount = bufferParser.readUInt32BE();
            if (usernameCount === undefined)
              break;
            const usernames = new Array(usernameCount);
            for (let i = 0; i < usernames.length; ++i)
              usernames[i] = bufferParser.readString(true);

            const groupnameCount = bufferParser.readUInt32BE();
            if (groupnameCount === undefined)
              break;
            const groupnames = new Array(groupnameCount);
            for (let i = 0; i < groupnames.length; ++i)
              groupnames[i] = bufferParser.readString(true);
            if (groupnames.length > 0
                && groupnames[groupnames.length - 1] === undefined) {
              break;
            }

            if (sftp._debug) {
              sftp._debug(
                'SFTP: Inbound: Received EXTENDED_REPLY '
                  + `(id:${reqID}, ${req.extended})`
              );
            }
            bufferParser.clear();
            if (typeof req.cb === 'function')
              req.cb(undefined, usernames, groupnames);
            return;
          }
          default:
            // Unknown extended request
            sftp._debug && sftp._debug(
              `SFTP: Inbound: Received EXTENDED_REPLY (id:${reqID}, ???)`
            );
            bufferParser.clear();
            if (typeof req.cb === 'function')
              req.cb();
            return;
        }
      } else {
        sftp._debug && sftp._debug(
          `SFTP: Inbound: Received EXTENDED_REPLY (id:${reqID}, ???)`
        );
        bufferParser.clear();
        return;
      }
    }

    bufferParser.clear();
    return doFatalSFTPError(sftp, 'Malformed EXTENDED_REPLY packet');
  },
};
const SERVER_HANDLERS = {
  [REQUEST.INIT]: (sftp, payload) => {
    if (sftp._version !== -1)
      return doFatalSFTPError(sftp, 'Duplicate INIT packet');

    const extensions = {};

    /*
      uint32 version
      <extension data>
    */
    bufferParser.init(payload, 1);
    let version = bufferParser.readUInt32BE();
    while (bufferParser.avail()) {
      const extName = bufferParser.readString(true);
      const extData = bufferParser.readString(true);
      if (extData === undefined) {
        version = undefined;
        break;
      }
      extensions[extName] = extData;
    }
    bufferParser.clear();

    if (version === undefined)
      return doFatalSFTPError(sftp, 'Malformed INIT packet');

    if (sftp._debug) {
      const names = Object.keys(extensions);
      if (names.length) {
        sftp._debug(
          `SFTP: Inbound: Received INIT (v${version}, exts:${names})`
        );
      } else {
        sftp._debug(`SFTP: Inbound: Received INIT (v${version})`);
      }
    }

    sendOrBuffer(sftp, SERVER_VERSION_BUFFER);

    sftp._version = version;
    sftp._extensions = extensions;
    sftp.emit('ready');
  },
  [REQUEST.OPEN]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        filename
      uint32        pflags
      ATTRS         attrs
    */
    const filename = bufferParser.readString(true);
    const pflags = bufferParser.readUInt32BE();
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined)
      return doFatalSFTPError(sftp, 'Malformed OPEN packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received OPEN (id:${reqID})`);

    if (!sftp.emit('OPEN', reqID, filename, pflags, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.CLOSE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed CLOSE packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received CLOSE (id:${reqID})`);

    if (!sftp.emit('CLOSE', reqID, handle)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.READ]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
      uint64     offset
      uint32     len
    */
    const handle = bufferParser.readString();
    const offset = bufferParser.readUInt64BE(sftp._biOpt);
    const len = bufferParser.readUInt32BE();
    bufferParser.clear();

    if (len === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed READ packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received READ (id:${reqID})`);

    if (!sftp.emit('READ', reqID, handle, offset, len)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.WRITE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
      uint64     offset
      string     data
    */
    const handle = bufferParser.readString();
    const offset = bufferParser.readUInt64BE(sftp._biOpt);
    const data = bufferParser.readString();
    bufferParser.clear();

    if (data === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed WRITE packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received WRITE (id:${reqID})`);

    if (!sftp.emit('WRITE', reqID, handle, offset, data)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.LSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed LSTAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received LSTAT (id:${reqID})`);

    if (!sftp.emit('LSTAT', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.FSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed FSTAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received FSTAT (id:${reqID})`);

    if (!sftp.emit('FSTAT', reqID, handle)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.SETSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
      ATTRS      attrs
    */
    const path = bufferParser.readString(true);
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined)
      return doFatalSFTPError(sftp, 'Malformed SETSTAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received SETSTAT (id:${reqID})`);

    if (!sftp.emit('SETSTAT', reqID, path, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.FSETSTAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     handle
      ATTRS      attrs
    */
    const handle = bufferParser.readString();
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed FSETSTAT packet');

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received FSETSTAT (id:${reqID})`
    );

    if (!sftp.emit('FSETSTAT', reqID, handle, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.OPENDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed OPENDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received OPENDIR (id:${reqID})`);

    if (!sftp.emit('OPENDIR', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.READDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string        handle
    */
    const handle = bufferParser.readString();
    bufferParser.clear();

    if (handle === undefined || handle.length > 256)
      return doFatalSFTPError(sftp, 'Malformed READDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received READDIR (id:${reqID})`);

    if (!sftp.emit('READDIR', reqID, handle)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.REMOVE]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed REMOVE packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received REMOVE (id:${reqID})`);

    if (!sftp.emit('REMOVE', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.MKDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
      ATTRS      attrs
    */
    const path = bufferParser.readString(true);
    const attrs = readAttrs(sftp._biOpt);
    bufferParser.clear();

    if (attrs === undefined)
      return doFatalSFTPError(sftp, 'Malformed MKDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received MKDIR (id:${reqID})`);

    if (!sftp.emit('MKDIR', reqID, path, attrs)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.RMDIR]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed RMDIR packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received RMDIR (id:${reqID})`);

    if (!sftp.emit('RMDIR', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.REALPATH]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed REALPATH packet');

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received REALPATH (id:${reqID})`
    );

    if (!sftp.emit('REALPATH', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.STAT]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed STAT packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received STAT (id:${reqID})`);

    if (!sftp.emit('STAT', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.RENAME]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     oldpath
      string     newpath
    */
    const oldPath = bufferParser.readString(true);
    const newPath = bufferParser.readString(true);
    bufferParser.clear();

    if (newPath === undefined)
      return doFatalSFTPError(sftp, 'Malformed RENAME packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received RENAME (id:${reqID})`);

    if (!sftp.emit('RENAME', reqID, oldPath, newPath)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.READLINK]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     path
    */
    const path = bufferParser.readString(true);
    bufferParser.clear();

    if (path === undefined)
      return doFatalSFTPError(sftp, 'Malformed READLINK packet');

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received READLINK (id:${reqID})`
    );

    if (!sftp.emit('READLINK', reqID, path)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.SYMLINK]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     linkpath
      string     targetpath
    */
    const linkPath = bufferParser.readString(true);
    const targetPath = bufferParser.readString(true);
    bufferParser.clear();

    if (targetPath === undefined)
      return doFatalSFTPError(sftp, 'Malformed SYMLINK packet');

    sftp._debug && sftp._debug(`SFTP: Inbound: Received SYMLINK (id:${reqID})`);

    let handled;
    if (sftp._isOpenSSH) {
      // OpenSSH has linkpath and targetpath positions switched
      handled = sftp.emit('SYMLINK', reqID, targetPath, linkPath);
    } else {
      handled = sftp.emit('SYMLINK', reqID, linkPath, targetPath);
    }
    if (!handled) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
  [REQUEST.EXTENDED]: (sftp, payload) => {
    bufferParser.init(payload, 1);
    const reqID = bufferParser.readUInt32BE();
    /*
      string     extended-request
      ... any request-specific data ...
    */
    const extName = bufferParser.readString(true);
    if (extName === undefined) {
      bufferParser.clear();
      return doFatalSFTPError(sftp, 'Malformed EXTENDED packet');
    }

    let extData;
    if (bufferParser.avail())
      extData = bufferParser.readRaw();
    bufferParser.clear();

    sftp._debug && sftp._debug(
      `SFTP: Inbound: Received EXTENDED (id:${reqID})`
    );

    if (!sftp.emit('EXTENDED', reqID, extName, extData)) {
      // Automatically reject request if no handler for request type
      sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED);
    }
  },
};

// =============================================================================
// ReadStream/WriteStream-related ==============================================
// =============================================================================
const {
  ERR_INVALID_ARG_TYPE,
  ERR_OUT_OF_RANGE,
  validateNumber
} = require('./node-fs-compat');

const kMinPoolSpace = 128;

let pool;
// It can happen that we expect to read a large chunk of data, and reserve
// a large chunk of the pool accordingly, but the read() call only filled
// a portion of it. If a concurrently executing read() then uses the same pool,
// the "reserved" portion cannot be used, so we allow it to be re-used as a
// new pool later.
const poolFragments = [];

function allocNewPool(poolSize) {
  if (poolFragments.length > 0)
    pool = poolFragments.pop();
  else
    pool = Buffer.allocUnsafe(poolSize);
  pool.used = 0;
}

// Check the `this.start` and `this.end` of stream.
function checkPosition(pos, name) {
  if (!Number.isSafeInteger(pos)) {
    validateNumber(pos, name);
    if (!Number.isInteger(pos))
      throw new ERR_OUT_OF_RANGE(name, 'an integer', pos);
    throw new ERR_OUT_OF_RANGE(name, '>= 0 and <= 2 ** 53 - 1', pos);
  }
  if (pos < 0)
    throw new ERR_OUT_OF_RANGE(name, '>= 0 and <= 2 ** 53 - 1', pos);
}

function roundUpToMultipleOf8(n) {
  return (n + 7) & ~7;  // Align to 8 byte boundary.
}

function ReadStream(sftp, path, options) {
  if (options === undefined)
    options = {};
  else if (typeof options === 'string')
    options = { encoding: options };
  else if (options === null || typeof options !== 'object')
    throw new TypeError('"options" argument must be a string or an object');
  else
    options = Object.create(options);

  // A little bit bigger buffer and water marks by default
  if (options.highWaterMark === undefined)
    options.highWaterMark = 64 * 1024;

  // For backwards compat do not emit close on destroy.
  options.emitClose = false;
  options.autoDestroy = false; // Node 14 major change.

  ReadableStream.call(this, options);

  this.path = path;
  this.flags = options.flags === undefined ? 'r' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.end = options.end;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = 0;
  this.bytesRead = 0;
  this.isClosed = false;

  this.handle = options.handle === undefined ? null : options.handle;
  this.sftp = sftp;
  this._opening = false;

  if (this.start !== undefined) {
    checkPosition(this.start, 'start');

    this.pos = this.start;
  }

  if (this.end === undefined) {
    this.end = Infinity;
  } else if (this.end !== Infinity) {
    checkPosition(this.end, 'end');

    if (this.start !== undefined && this.start > this.end) {
      throw new ERR_OUT_OF_RANGE(
        'start',
        `<= "end" (here: ${this.end})`,
        this.start
      );
    }
  }

  this.on('end', function() {
    if (this.autoClose)
      this.destroy();
  });

  if (!Buffer.isBuffer(this.handle))
    this.open();
}
inherits(ReadStream, ReadableStream);

ReadStream.prototype.open = function() {
  if (this._opening)
    return;

  this._opening = true;

  this.sftp.open(this.path, this.flags, this.mode, (er, handle) => {
    this._opening = false;

    if (er) {
      this.emit('error', er);
      if (this.autoClose)
        this.destroy();
      return;
    }

    this.handle = handle;
    this.emit('open', handle);
    this.emit('ready');
    // Start the flow of data.
    this.read();
  });
};

ReadStream.prototype._read = function(n) {
  if (!Buffer.isBuffer(this.handle))
    return this.once('open', () => this._read(n));

  // XXX: safe to remove this?
  if (this.destroyed)
    return;

  if (!pool || pool.length - pool.used < kMinPoolSpace) {
    // Discard the old pool.
    allocNewPool(this.readableHighWaterMark
                 || this._readableState.highWaterMark);
  }

  // Grab another reference to the pool in the case that while we're
  // in the thread pool another read() finishes up the pool, and
  // allocates a new one.
  const thisPool = pool;
  let toRead = Math.min(pool.length - pool.used, n);
  const start = pool.used;

  if (this.end !== undefined)
    toRead = Math.min(this.end - this.pos + 1, toRead);

  // Already read everything we were supposed to read!
  // treat as EOF.
  if (toRead <= 0)
    return this.push(null);

  // the actual read.
  this.sftp.read(this.handle,
                 pool,
                 pool.used,
                 toRead,
                 this.pos,
                 (er, bytesRead) => {
    if (er) {
      this.emit('error', er);
      if (this.autoClose)
        this.destroy();
      return;
    }
    let b = null;

    // Now that we know how much data we have actually read, re-wind the
    // 'used' field if we can, and otherwise allow the remainder of our
    // reservation to be used as a new pool later.
    if (start + toRead === thisPool.used && thisPool === pool) {
      thisPool.used = roundUpToMultipleOf8(thisPool.used + bytesRead - toRead);
    } else {
      // Round down to the next lowest multiple of 8 to ensure the new pool
      // fragment start and end positions are aligned to an 8 byte boundary.
      const alignedEnd = (start + toRead) & ~7;
      const alignedStart = roundUpToMultipleOf8(start + bytesRead);
      if (alignedEnd - alignedStart >= kMinPoolSpace)
        poolFragments.push(thisPool.slice(alignedStart, alignedEnd));
    }

    if (bytesRead > 0) {
      this.bytesRead += bytesRead;
      b = thisPool.slice(start, start + bytesRead);
    }

    // Move the pool positions, and internal position for reading.
    this.pos += bytesRead;

    this.push(b);
  });

  pool.used = roundUpToMultipleOf8(pool.used + toRead);
};

ReadStream.prototype._destroy = function(err, cb) {
  if (this._opening && !Buffer.isBuffer(this.handle)) {
    this.once('open', closeStream.bind(null, this, cb, err));
    return;
  }

  closeStream(this, cb, err);
  this.handle = null;
  this._opening = false;
};

function closeStream(stream, cb, err) {
  if (!stream.handle)
    return onclose();

  stream.sftp.close(stream.handle, onclose);

  function onclose(er) {
    er = er || err;
    cb(er);
    stream.isClosed = true;
    if (!er)
      stream.emit('close');
  }
}

ReadStream.prototype.close = function(cb) {
  this.destroy(null, cb);
};

Object.defineProperty(ReadStream.prototype, 'pending', {
  get() {
    return this.handle === null;
  },
  configurable: true
});

// TODO: add `concurrency` setting to allow more than one in-flight WRITE
// request to server to improve throughput
function WriteStream(sftp, path, options) {
  if (options === undefined)
    options = {};
  else if (typeof options === 'string')
    options = { encoding: options };
  else if (options === null || typeof options !== 'object')
    throw new TypeError('"options" argument must be a string or an object');
  else
    options = Object.create(options);

  // For backwards compat do not emit close on destroy.
  options.emitClose = false;
  options.autoDestroy = false; // Node 14 major change.

  WritableStream.call(this, options);

  this.path = path;
  this.flags = options.flags === undefined ? 'w' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = 0;
  this.bytesWritten = 0;
  this.isClosed = false;

  this.handle = options.handle === undefined ? null : options.handle;
  this.sftp = sftp;
  this._opening = false;

  if (this.start !== undefined) {
    checkPosition(this.start, 'start');

    this.pos = this.start;
  }

  if (options.encoding)
    this.setDefaultEncoding(options.encoding);

  // Node v6.x only
  this.on('finish', function() {
    if (this._writableState.finalCalled)
      return;
    if (this.autoClose)
      this.destroy();
  });

  if (!Buffer.isBuffer(this.handle))
    this.open();
}
inherits(WriteStream, WritableStream);

WriteStream.prototype._final = function(cb) {
  if (this.autoClose)
    this.destroy();
  cb();
};

WriteStream.prototype.open = function() {
  if (this._opening)
    return;

  this._opening = true;

  this.sftp.open(this.path, this.flags, this.mode, (er, handle) => {
    this._opening = false;

    if (er) {
      this.emit('error', er);
      if (this.autoClose)
        this.destroy();
      return;
    }

    this.handle = handle;

    const tryAgain = (err) => {
      if (err) {
        // Try chmod() for sftp servers that may not support fchmod() for
        // whatever reason
        this.sftp.chmod(this.path, this.mode, (err_) => tryAgain());
        return;
      }

      // SFTPv3 requires absolute offsets, no matter the open flag used
      if (this.flags[0] === 'a') {
        const tryStat = (err, st) => {
          if (err) {
            // Try stat() for sftp servers that may not support fstat() for
            // whatever reason
            this.sftp.stat(this.path, (err_, st_) => {
              if (err_) {
                this.destroy();
                this.emit('error', err);
                return;
              }
              tryStat(null, st_);
            });
            return;
          }

          this.pos = st.size;
          this.emit('open', handle);
          this.emit('ready');
        };

        this.sftp.fstat(handle, tryStat);
        return;
      }

      this.emit('open', handle);
      this.emit('ready');
    };

    this.sftp.fchmod(handle, this.mode, tryAgain);
  });
};

WriteStream.prototype._write = function(data, encoding, cb) {
  if (!Buffer.isBuffer(data)) {
    const err = new ERR_INVALID_ARG_TYPE('data', 'Buffer', data);
    return this.emit('error', err);
  }

  if (!Buffer.isBuffer(this.handle)) {
    return this.once('open', function() {
      this._write(data, encoding, cb);
    });
  }

  this.sftp.write(this.handle,
                  data,
                  0,
                  data.length,
                  this.pos,
                  (er, bytes) => {
    if (er) {
      if (this.autoClose)
        this.destroy();
      return cb(er);
    }
    this.bytesWritten += bytes;
    cb();
  });

  this.pos += data.length;
};

WriteStream.prototype._writev = function(data, cb) {
  if (!Buffer.isBuffer(this.handle)) {
    return this.once('open', function() {
      this._writev(data, cb);
    });
  }

  const sftp = this.sftp;
  const handle = this.handle;
  let writesLeft = data.length;

  const onwrite = (er, bytes) => {
    if (er) {
      this.destroy();
      return cb(er);
    }
    this.bytesWritten += bytes;
    if (--writesLeft === 0)
      cb();
  };

  // TODO: try to combine chunks to reduce number of requests to the server?
  for (let i = 0; i < data.length; ++i) {
    const chunk = data[i].chunk;

    sftp.write(handle, chunk, 0, chunk.length, this.pos, onwrite);
    this.pos += chunk.length;
  }
};

if (typeof WritableStream.prototype.destroy !== 'function')
  WriteStream.prototype.destroy = ReadStream.prototype.destroy;

WriteStream.prototype._destroy = ReadStream.prototype._destroy;
WriteStream.prototype.close = function(cb) {
  if (cb) {
    if (this.isClosed) {
      process.nextTick(cb);
      return;
    }
    this.on('close', cb);
  }

  // If we are not autoClosing, we should call
  // destroy on 'finish'.
  if (!this.autoClose)
    this.on('finish', this.destroy.bind(this));

  this.end();
};

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end;

Object.defineProperty(WriteStream.prototype, 'pending', {
  get() {
    return this.handle === null;
  },
  configurable: true
});
// =============================================================================

module.exports = {
  flagsToString,
  OPEN_MODE,
  SFTP,
  Stats,
  STATUS_CODE,
  stringToFlags,
};
