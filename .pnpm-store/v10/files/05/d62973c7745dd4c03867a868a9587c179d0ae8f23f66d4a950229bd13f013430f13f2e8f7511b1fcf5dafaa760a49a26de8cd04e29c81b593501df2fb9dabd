'use strict';

const { Agent: HttpAgent } = require('http');
const { Agent: HttpsAgent } = require('https');
const { connect: tlsConnect } = require('tls');

let Client;

for (const ctor of [HttpAgent, HttpsAgent]) {
  class SSHAgent extends ctor {
    constructor(connectCfg, agentOptions) {
      super(agentOptions);

      this._connectCfg = connectCfg;
      this._defaultSrcIP = (agentOptions && agentOptions.srcIP) || 'localhost';
    }

    createConnection(options, cb) {
      const srcIP = (options && options.localAddress) || this._defaultSrcIP;
      const srcPort = (options && options.localPort) || 0;
      const dstIP = options.host;
      const dstPort = options.port;

      if (Client === undefined)
        Client = require('./client.js');

      const client = new Client();
      let triedForward = false;
      client.on('ready', () => {
        client.forwardOut(srcIP, srcPort, dstIP, dstPort, (err, stream) => {
          triedForward = true;
          if (err) {
            client.end();
            return cb(err);
          }
          stream.once('close', () => client.end());
          cb(null, decorateStream(stream, ctor, options));
        });
      }).on('error', cb).on('close', () => {
        if (!triedForward)
          cb(new Error('Unexpected connection close'));
      }).connect(this._connectCfg);
    }
  }

  exports[ctor === HttpAgent ? 'SSHTTPAgent' : 'SSHTTPSAgent'] = SSHAgent;
}

function noop() {}

function decorateStream(stream, ctor, options) {
  if (ctor === HttpAgent) {
    // HTTP
    stream.setKeepAlive = noop;
    stream.setNoDelay = noop;
    stream.setTimeout = noop;
    stream.ref = noop;
    stream.unref = noop;
    stream.destroySoon = stream.destroy;
    return stream;
  }

  // HTTPS
  options.socket = stream;
  const wrapped = tlsConnect(options);

  // This is a workaround for a regression in node v12.16.3+
  // https://github.com/nodejs/node/issues/35904
  const onClose = (() => {
    let called = false;
    return () => {
      if (called)
        return;
      called = true;
      if (stream.isPaused())
        stream.resume();
    };
  })();
  // 'end' listener is needed because 'close' is not emitted in some scenarios
  // in node v12.x for some unknown reason
  wrapped.on('end', onClose).on('close', onClose);

  return wrapped;
}
