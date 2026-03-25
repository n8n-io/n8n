'use strict';

const { kMaxLength } = require('buffer');
const {
  createInflate,
  constants: {
    DEFLATE,
    INFLATE,
    Z_DEFAULT_CHUNK,
    Z_DEFAULT_COMPRESSION,
    Z_DEFAULT_MEMLEVEL,
    Z_DEFAULT_STRATEGY,
    Z_DEFAULT_WINDOWBITS,
    Z_PARTIAL_FLUSH,
  }
} = require('zlib');
const ZlibHandle = createInflate()._handle.constructor;

function processCallback() {
  throw new Error('Should not get here');
}

function zlibOnError(message, errno, code) {
  const self = this._owner;
  // There is no way to cleanly recover.
  // Continuing only obscures problems.

  const error = new Error(message);
  error.errno = errno;
  error.code = code;
  self._err = error;
}

function _close(engine) {
  // Caller may invoke .close after a zlib error (which will null _handle).
  if (!engine._handle)
    return;

  engine._handle.close();
  engine._handle = null;
}

class Zlib {
  constructor(mode) {
    const windowBits = Z_DEFAULT_WINDOWBITS;
    const level = Z_DEFAULT_COMPRESSION;
    const memLevel = Z_DEFAULT_MEMLEVEL;
    const strategy = Z_DEFAULT_STRATEGY;
    const dictionary = undefined;

    this._err = undefined;
    this._writeState = new Uint32Array(2);
    this._chunkSize = Z_DEFAULT_CHUNK;
    this._maxOutputLength = kMaxLength;
    this._outBuffer = Buffer.allocUnsafe(this._chunkSize);
    this._outOffset = 0;

    this._handle = new ZlibHandle(mode);
    this._handle._owner = this;
    this._handle.onerror = zlibOnError;
    this._handle.init(windowBits,
                      level,
                      memLevel,
                      strategy,
                      this._writeState,
                      processCallback,
                      dictionary);
  }

  writeSync(chunk, retChunks) {
    const handle = this._handle;
    if (!handle)
      throw new Error('Invalid Zlib instance');

    let availInBefore = chunk.length;
    let availOutBefore = this._chunkSize - this._outOffset;
    let inOff = 0;
    let availOutAfter;
    let availInAfter;

    let buffers;
    let nread = 0;
    const state = this._writeState;
    let buffer = this._outBuffer;
    let offset = this._outOffset;
    const chunkSize = this._chunkSize;

    while (true) {
      handle.writeSync(Z_PARTIAL_FLUSH,
                       chunk, // in
                       inOff, // in_off
                       availInBefore, // in_len
                       buffer, // out
                       offset, // out_off
                       availOutBefore); // out_len
      if (this._err)
        throw this._err;

      availOutAfter = state[0];
      availInAfter = state[1];

      const inDelta = availInBefore - availInAfter;
      const have = availOutBefore - availOutAfter;

      if (have > 0) {
        const out = (offset === 0 && have === buffer.length
                     ? buffer
                     : buffer.slice(offset, offset + have));
        offset += have;
        if (!buffers)
          buffers = out;
        else if (buffers.push === undefined)
          buffers = [buffers, out];
        else
          buffers.push(out);
        nread += out.byteLength;

        if (nread > this._maxOutputLength) {
          _close(this);
          throw new Error(
            `Output length exceeded maximum of ${this._maxOutputLength}`
          );
        }
      } else if (have !== 0) {
        throw new Error('have should not go down');
      }

      // Exhausted the output buffer, or used all the input create a new one.
      if (availOutAfter === 0 || offset >= chunkSize) {
        availOutBefore = chunkSize;
        offset = 0;
        buffer = Buffer.allocUnsafe(chunkSize);
      }

      if (availOutAfter === 0) {
        // Not actually done. Need to reprocess.
        // Also, update the availInBefore to the availInAfter value,
        // so that if we have to hit it a third (fourth, etc.) time,
        // it'll have the correct byte counts.
        inOff += inDelta;
        availInBefore = availInAfter;
      } else {
        break;
      }
    }

    this._outBuffer = buffer;
    this._outOffset = offset;

    if (nread === 0)
      buffers = Buffer.alloc(0);

    if (retChunks) {
      buffers.totalLen = nread;
      return buffers;
    }

    if (buffers.push === undefined)
      return buffers;

    const output = Buffer.allocUnsafe(nread);
    for (let i = 0, p = 0; i < buffers.length; ++i) {
      const buf = buffers[i];
      output.set(buf, p);
      p += buf.length;
    }
    return output;
  }
}

class ZlibPacketWriter {
  constructor(protocol) {
    this.allocStart = 0;
    this.allocStartKEX = 0;
    this._protocol = protocol;
    this._zlib = new Zlib(DEFLATE);
  }

  cleanup() {
    if (this._zlib)
      _close(this._zlib);
  }

  alloc(payloadSize, force) {
    return Buffer.allocUnsafe(payloadSize);
  }

  finalize(payload, force) {
    if (this._protocol._kexinit === undefined || force) {
      const output = this._zlib.writeSync(payload, true);
      const packet = this._protocol._cipher.allocPacket(output.totalLen);
      if (output.push === undefined) {
        packet.set(output, 5);
      } else {
        for (let i = 0, p = 5; i < output.length; ++i) {
          const chunk = output[i];
          packet.set(chunk, p);
          p += chunk.length;
        }
      }
      return packet;
    }
    return payload;
  }
}

class PacketWriter {
  constructor(protocol) {
    this.allocStart = 5;
    this.allocStartKEX = 5;
    this._protocol = protocol;
  }

  cleanup() {}

  alloc(payloadSize, force) {
    if (this._protocol._kexinit === undefined || force)
      return this._protocol._cipher.allocPacket(payloadSize);
    return Buffer.allocUnsafe(payloadSize);
  }

  finalize(packet, force) {
    return packet;
  }
}

class ZlibPacketReader {
  constructor() {
    this._zlib = new Zlib(INFLATE);
  }

  cleanup() {
    if (this._zlib)
      _close(this._zlib);
  }

  read(data) {
    return this._zlib.writeSync(data, false);
  }
}

class PacketReader {
  cleanup() {}

  read(data) {
    return data;
  }
}

module.exports = {
  PacketReader,
  PacketWriter,
  ZlibPacketReader,
  ZlibPacketWriter,
};
