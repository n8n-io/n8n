'use strict';

const {
  Duplex: DuplexStream,
  Readable: ReadableStream,
  Writable: WritableStream,
} = require('stream');

const {
  CHANNEL_EXTENDED_DATATYPE: { STDERR },
} = require('./protocol/constants.js');
const { bufferSlice } = require('./protocol/utils.js');

const PACKET_SIZE = 32 * 1024;
const MAX_WINDOW = 2 * 1024 * 1024;
const WINDOW_THRESHOLD = MAX_WINDOW / 2;

class ClientStderr extends ReadableStream {
  constructor(channel, streamOpts) {
    super(streamOpts);

    this._channel = channel;
  }
  _read(n) {
    if (this._channel._waitChanDrain) {
      this._channel._waitChanDrain = false;
      if (this._channel.incoming.window <= WINDOW_THRESHOLD)
        windowAdjust(this._channel);
    }
  }
}

class ServerStderr extends WritableStream {
  constructor(channel) {
    super({ highWaterMark: MAX_WINDOW });

    this._channel = channel;
  }

  _write(data, encoding, cb) {
    const channel = this._channel;
    const protocol = channel._client._protocol;
    const outgoing = channel.outgoing;
    const packetSize = outgoing.packetSize;
    const id = outgoing.id;
    let window = outgoing.window;
    const len = data.length;
    let p = 0;

    if (outgoing.state !== 'open')
      return;

    while (len - p > 0 && window > 0) {
      let sliceLen = len - p;
      if (sliceLen > window)
        sliceLen = window;
      if (sliceLen > packetSize)
        sliceLen = packetSize;

      if (p === 0 && sliceLen === len)
        protocol.channelExtData(id, data, STDERR);
      else
        protocol.channelExtData(id, bufferSlice(data, p, p + sliceLen), STDERR);

      p += sliceLen;
      window -= sliceLen;
    }

    outgoing.window = window;

    if (len - p > 0) {
      if (window === 0)
        channel._waitWindow = true;
      if (p > 0)
        channel._chunkErr = bufferSlice(data, p, len);
      else
        channel._chunkErr = data;
      channel._chunkcbErr = cb;
      return;
    }

    cb();
  }
}

class Channel extends DuplexStream {
  constructor(client, info, opts) {
    const streamOpts = {
      highWaterMark: MAX_WINDOW,
      allowHalfOpen: (!opts || (opts && opts.allowHalfOpen !== false)),
      emitClose: false,
    };
    super(streamOpts);
    this.allowHalfOpen = streamOpts.allowHalfOpen;

    const server = !!(opts && opts.server);

    this.server = server;
    this.type = info.type;
    this.subtype = undefined;

    /*
      incoming and outgoing contain these properties:
      {
        id: undefined,
        window: undefined,
        packetSize: undefined,
        state: 'closed'
      }
    */
    this.incoming = info.incoming;
    this.outgoing = info.outgoing;
    this._callbacks = [];

    this._client = client;
    this._hasX11 = false;
    this._exit = {
      code: undefined,
      signal: undefined,
      dump: undefined,
      desc: undefined,
    };

    this.stdin = this.stdout = this;

    if (server)
      this.stderr = new ServerStderr(this);
    else
      this.stderr = new ClientStderr(this, streamOpts);

    // Outgoing data
    this._waitWindow = false; // SSH-level backpressure

    // Incoming data
    this._waitChanDrain = false; // Channel Readable side backpressure

    this._chunk = undefined;
    this._chunkcb = undefined;
    this._chunkErr = undefined;
    this._chunkcbErr = undefined;

    this.on('finish', onFinish)
        .on('prefinish', onFinish); // For node v0.11+

    this.on('end', onEnd).on('close', onEnd);
  }

  _read(n) {
    if (this._waitChanDrain) {
      this._waitChanDrain = false;
      if (this.incoming.window <= WINDOW_THRESHOLD)
        windowAdjust(this);
    }
  }

  _write(data, encoding, cb) {
    const protocol = this._client._protocol;
    const outgoing = this.outgoing;
    const packetSize = outgoing.packetSize;
    const id = outgoing.id;
    let window = outgoing.window;
    const len = data.length;
    let p = 0;

    if (outgoing.state !== 'open')
      return;

    while (len - p > 0 && window > 0) {
      let sliceLen = len - p;
      if (sliceLen > window)
        sliceLen = window;
      if (sliceLen > packetSize)
        sliceLen = packetSize;

      if (p === 0 && sliceLen === len)
        protocol.channelData(id, data);
      else
        protocol.channelData(id, bufferSlice(data, p, p + sliceLen));

      p += sliceLen;
      window -= sliceLen;
    }

    outgoing.window = window;

    if (len - p > 0) {
      if (window === 0)
        this._waitWindow = true;
      if (p > 0)
        this._chunk = bufferSlice(data, p, len);
      else
        this._chunk = data;
      this._chunkcb = cb;
      return;
    }

    cb();
  }

  eof() {
    if (this.outgoing.state === 'open') {
      this.outgoing.state = 'eof';
      this._client._protocol.channelEOF(this.outgoing.id);
    }
  }

  close() {
    if (this.outgoing.state === 'open' || this.outgoing.state === 'eof') {
      this.outgoing.state = 'closing';
      this._client._protocol.channelClose(this.outgoing.id);
    }
  }

  destroy() {
    this.end();
    this.close();
    return this;
  }

  // Session type-specific methods =============================================
  setWindow(rows, cols, height, width) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (this.type === 'session'
        && (this.subtype === 'shell' || this.subtype === 'exec')
        && this.writable
        && this.outgoing.state === 'open') {
      this._client._protocol.windowChange(this.outgoing.id,
                                          rows,
                                          cols,
                                          height,
                                          width);
    }
  }

  signal(signalName) {
    if (this.server)
      throw new Error('Client-only method called in server mode');

    if (this.type === 'session'
        && this.writable
        && this.outgoing.state === 'open') {
      this._client._protocol.signal(this.outgoing.id, signalName);
    }
  }

  exit(statusOrSignal, coreDumped, msg) {
    if (!this.server)
      throw new Error('Server-only method called in client mode');

    if (this.type === 'session'
        && this.writable
        && this.outgoing.state === 'open') {
      if (typeof statusOrSignal === 'number') {
        this._client._protocol.exitStatus(this.outgoing.id, statusOrSignal);
      } else {
        this._client._protocol.exitSignal(this.outgoing.id,
                                          statusOrSignal,
                                          coreDumped,
                                          msg);
      }
    }
  }

}

function onFinish() {
  this.eof();
  if (this.server || !this.allowHalfOpen)
    this.close();
  this.writable = false;
}

function onEnd() {
  this.readable = false;
}

function windowAdjust(self) {
  if (self.outgoing.state === 'closed')
    return;
  const amt = MAX_WINDOW - self.incoming.window;
  if (amt <= 0)
    return;
  self.incoming.window += amt;
  self._client._protocol.channelWindowAdjust(self.outgoing.id, amt);
}

module.exports = {
  Channel,
  MAX_WINDOW,
  PACKET_SIZE,
  windowAdjust,
  WINDOW_THRESHOLD,
};
