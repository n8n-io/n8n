Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const http = require('node:http');
require('node:https');

/**
 * This code was originally forked from https://github.com/TooTallNate/proxy-agents/tree/b133295fd16f6475578b6b15bd9b4e33ecb0d0b7
 * With the following LICENSE:
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Nathan Rajlich <nathan@tootallnate.net>*
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:*
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.*
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


const INTERNAL = Symbol('AgentBaseInternalState');

class Agent extends http.Agent {

  // Set by `http.Agent` - missing from `@types/node`

  constructor(opts) {
    super(opts);
    this[INTERNAL] = {};
  }

  /**
   * Determine whether this is an `http` or `https` request.
   */
  isSecureEndpoint(options) {
    if (options) {
      // First check the `secureEndpoint` property explicitly, since this
      // means that a parent `Agent` is "passing through" to this instance.
      if (typeof (options ).secureEndpoint === 'boolean') {
        return options.secureEndpoint;
      }

      // If no explicit `secure` endpoint, check if `protocol` property is
      // set. This will usually be the case since using a full string URL
      // or `URL` instance should be the most common usage.
      if (typeof options.protocol === 'string') {
        return options.protocol === 'https:';
      }
    }

    // Finally, if no `protocol` property was set, then fall back to
    // checking the stack trace of the current call stack, and try to
    // detect the "https" module.
    const { stack } = new Error();
    if (typeof stack !== 'string') return false;
    return stack.split('\n').some(l => l.indexOf('(https.js:') !== -1 || l.indexOf('node:https:') !== -1);
  }

  createSocket(req, options, cb) {
    const connectOpts = {
      ...options,
      secureEndpoint: this.isSecureEndpoint(options),
    };
    Promise.resolve()
      .then(() => this.connect(req, connectOpts))
      .then(socket => {
        if (socket instanceof http.Agent) {
          // @ts-expect-error `addRequest()` isn't defined in `@types/node`
          return socket.addRequest(req, connectOpts);
        }
        this[INTERNAL].currentSocket = socket;
        // @ts-expect-error `createSocket()` isn't defined in `@types/node`
        super.createSocket(req, options, cb);
      }, cb);
  }

  createConnection() {
    const socket = this[INTERNAL].currentSocket;
    this[INTERNAL].currentSocket = undefined;
    if (!socket) {
      throw new Error('No socket was returned in the `connect()` function');
    }
    return socket;
  }

  get defaultPort() {
    return this[INTERNAL].defaultPort ?? (this.protocol === 'https:' ? 443 : 80);
  }

  set defaultPort(v) {
    if (this[INTERNAL]) {
      this[INTERNAL].defaultPort = v;
    }
  }

  get protocol() {
    return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? 'https:' : 'http:');
  }

  set protocol(v) {
    if (this[INTERNAL]) {
      this[INTERNAL].protocol = v;
    }
  }
}

exports.Agent = Agent;
//# sourceMappingURL=base.js.map
