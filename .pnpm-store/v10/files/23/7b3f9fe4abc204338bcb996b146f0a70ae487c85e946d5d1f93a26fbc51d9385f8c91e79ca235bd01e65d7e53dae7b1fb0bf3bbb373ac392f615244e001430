'use strict';

const OriginalAgent = require('http').Agent;
const ms = require('humanize-ms');
const debug = require('util').debuglog('agentkeepalive');
const {
  INIT_SOCKET,
  CURRENT_ID,
  CREATE_ID,
  SOCKET_CREATED_TIME,
  SOCKET_NAME,
  SOCKET_REQUEST_COUNT,
  SOCKET_REQUEST_FINISHED_COUNT,
} = require('./constants');

// OriginalAgent come from
// - https://github.com/nodejs/node/blob/v8.12.0/lib/_http_agent.js
// - https://github.com/nodejs/node/blob/v10.12.0/lib/_http_agent.js

// node <= 10
let defaultTimeoutListenerCount = 1;
const majorVersion = parseInt(process.version.split('.', 1)[0].substring(1));
if (majorVersion >= 11 && majorVersion <= 12) {
  defaultTimeoutListenerCount = 2;
} else if (majorVersion >= 13) {
  defaultTimeoutListenerCount = 3;
}

function deprecate(message) {
  console.log('[agentkeepalive:deprecated] %s', message);
}

class Agent extends OriginalAgent {
  constructor(options) {
    options = options || {};
    options.keepAlive = options.keepAlive !== false;
    // default is keep-alive and 4s free socket timeout
    // see https://medium.com/ssense-tech/reduce-networking-errors-in-nodejs-23b4eb9f2d83
    if (options.freeSocketTimeout === undefined) {
      options.freeSocketTimeout = 4000;
    }
    // Legacy API: keepAliveTimeout should be rename to `freeSocketTimeout`
    if (options.keepAliveTimeout) {
      deprecate('options.keepAliveTimeout is deprecated, please use options.freeSocketTimeout instead');
      options.freeSocketTimeout = options.keepAliveTimeout;
      delete options.keepAliveTimeout;
    }
    // Legacy API: freeSocketKeepAliveTimeout should be rename to `freeSocketTimeout`
    if (options.freeSocketKeepAliveTimeout) {
      deprecate('options.freeSocketKeepAliveTimeout is deprecated, please use options.freeSocketTimeout instead');
      options.freeSocketTimeout = options.freeSocketKeepAliveTimeout;
      delete options.freeSocketKeepAliveTimeout;
    }

    // Sets the socket to timeout after timeout milliseconds of inactivity on the socket.
    // By default is double free socket timeout.
    if (options.timeout === undefined) {
      // make sure socket default inactivity timeout >= 8s
      options.timeout = Math.max(options.freeSocketTimeout * 2, 8000);
    }

    // support humanize format
    options.timeout = ms(options.timeout);
    options.freeSocketTimeout = ms(options.freeSocketTimeout);
    options.socketActiveTTL = options.socketActiveTTL ? ms(options.socketActiveTTL) : 0;

    super(options);

    this[CURRENT_ID] = 0;

    // create socket success counter
    this.createSocketCount = 0;
    this.createSocketCountLastCheck = 0;

    this.createSocketErrorCount = 0;
    this.createSocketErrorCountLastCheck = 0;

    this.closeSocketCount = 0;
    this.closeSocketCountLastCheck = 0;

    // socket error event count
    this.errorSocketCount = 0;
    this.errorSocketCountLastCheck = 0;

    // request finished counter
    this.requestCount = 0;
    this.requestCountLastCheck = 0;

    // including free socket timeout counter
    this.timeoutSocketCount = 0;
    this.timeoutSocketCountLastCheck = 0;

    this.on('free', socket => {
      // https://github.com/nodejs/node/pull/32000
      // Node.js native agent will check socket timeout eqs agent.options.timeout.
      // Use the ttl or freeSocketTimeout to overwrite.
      const timeout = this.calcSocketTimeout(socket);
      if (timeout > 0 && socket.timeout !== timeout) {
        socket.setTimeout(timeout);
      }
    });
  }

  get freeSocketKeepAliveTimeout() {
    deprecate('agent.freeSocketKeepAliveTimeout is deprecated, please use agent.options.freeSocketTimeout instead');
    return this.options.freeSocketTimeout;
  }

  get timeout() {
    deprecate('agent.timeout is deprecated, please use agent.options.timeout instead');
    return this.options.timeout;
  }

  get socketActiveTTL() {
    deprecate('agent.socketActiveTTL is deprecated, please use agent.options.socketActiveTTL instead');
    return this.options.socketActiveTTL;
  }

  calcSocketTimeout(socket) {
    /**
     * return <= 0: should free socket
     * return > 0: should update socket timeout
     * return undefined: not find custom timeout
     */
    let freeSocketTimeout = this.options.freeSocketTimeout;
    const socketActiveTTL = this.options.socketActiveTTL;
    if (socketActiveTTL) {
      // check socketActiveTTL
      const aliveTime = Date.now() - socket[SOCKET_CREATED_TIME];
      const diff = socketActiveTTL - aliveTime;
      if (diff <= 0) {
        return diff;
      }
      if (freeSocketTimeout && diff < freeSocketTimeout) {
        freeSocketTimeout = diff;
      }
    }
    // set freeSocketTimeout
    if (freeSocketTimeout) {
      // set free keepalive timer
      // try to use socket custom freeSocketTimeout first, support headers['keep-alive']
      // https://github.com/node-modules/urllib/blob/b76053020923f4d99a1c93cf2e16e0c5ba10bacf/lib/urllib.js#L498
      const customFreeSocketTimeout = socket.freeSocketTimeout || socket.freeSocketKeepAliveTimeout;
      return customFreeSocketTimeout || freeSocketTimeout;
    }
  }

  keepSocketAlive(socket) {
    const result = super.keepSocketAlive(socket);
    // should not keepAlive, do nothing
    if (!result) return result;

    const customTimeout = this.calcSocketTimeout(socket);
    if (typeof customTimeout === 'undefined') {
      return true;
    }
    if (customTimeout <= 0) {
      debug('%s(requests: %s, finished: %s) free but need to destroy by TTL, request count %s, diff is %s',
        socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT], customTimeout);
      return false;
    }
    if (socket.timeout !== customTimeout) {
      socket.setTimeout(customTimeout);
    }
    return true;
  }

  // only call on addRequest
  reuseSocket(...args) {
    // reuseSocket(socket, req)
    super.reuseSocket(...args);
    const socket = args[0];
    const req = args[1];
    req.reusedSocket = true;
    const agentTimeout = this.options.timeout;
    if (getSocketTimeout(socket) !== agentTimeout) {
      // reset timeout before use
      socket.setTimeout(agentTimeout);
      debug('%s reset timeout to %sms', socket[SOCKET_NAME], agentTimeout);
    }
    socket[SOCKET_REQUEST_COUNT]++;
    debug('%s(requests: %s, finished: %s) reuse on addRequest, timeout %sms',
      socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT],
      getSocketTimeout(socket));
  }

  [CREATE_ID]() {
    const id = this[CURRENT_ID]++;
    if (this[CURRENT_ID] === Number.MAX_SAFE_INTEGER) this[CURRENT_ID] = 0;
    return id;
  }

  [INIT_SOCKET](socket, options) {
    // bugfix here.
    // https on node 8, 10 won't set agent.options.timeout by default
    // TODO: need to fix on node itself
    if (options.timeout) {
      const timeout = getSocketTimeout(socket);
      if (!timeout) {
        socket.setTimeout(options.timeout);
      }
    }

    if (this.options.keepAlive) {
      // Disable Nagle's algorithm: http://blog.caustik.com/2012/04/08/scaling-node-js-to-100k-concurrent-connections/
      // https://fengmk2.com/benchmark/nagle-algorithm-delayed-ack-mock.html
      socket.setNoDelay(true);
    }
    this.createSocketCount++;
    if (this.options.socketActiveTTL) {
      socket[SOCKET_CREATED_TIME] = Date.now();
    }
    // don't show the hole '-----BEGIN CERTIFICATE----' key string
    socket[SOCKET_NAME] = `sock[${this[CREATE_ID]()}#${options._agentKey}]`.split('-----BEGIN', 1)[0];
    socket[SOCKET_REQUEST_COUNT] = 1;
    socket[SOCKET_REQUEST_FINISHED_COUNT] = 0;
    installListeners(this, socket, options);
  }

  createConnection(options, oncreate) {
    let called = false;
    const onNewCreate = (err, socket) => {
      if (called) return;
      called = true;

      if (err) {
        this.createSocketErrorCount++;
        return oncreate(err);
      }
      this[INIT_SOCKET](socket, options);
      oncreate(err, socket);
    };

    const newSocket = super.createConnection(options, onNewCreate);
    if (newSocket) onNewCreate(null, newSocket);
    return newSocket;
  }

  get statusChanged() {
    const changed = this.createSocketCount !== this.createSocketCountLastCheck ||
      this.createSocketErrorCount !== this.createSocketErrorCountLastCheck ||
      this.closeSocketCount !== this.closeSocketCountLastCheck ||
      this.errorSocketCount !== this.errorSocketCountLastCheck ||
      this.timeoutSocketCount !== this.timeoutSocketCountLastCheck ||
      this.requestCount !== this.requestCountLastCheck;
    if (changed) {
      this.createSocketCountLastCheck = this.createSocketCount;
      this.createSocketErrorCountLastCheck = this.createSocketErrorCount;
      this.closeSocketCountLastCheck = this.closeSocketCount;
      this.errorSocketCountLastCheck = this.errorSocketCount;
      this.timeoutSocketCountLastCheck = this.timeoutSocketCount;
      this.requestCountLastCheck = this.requestCount;
    }
    return changed;
  }

  getCurrentStatus() {
    return {
      createSocketCount: this.createSocketCount,
      createSocketErrorCount: this.createSocketErrorCount,
      closeSocketCount: this.closeSocketCount,
      errorSocketCount: this.errorSocketCount,
      timeoutSocketCount: this.timeoutSocketCount,
      requestCount: this.requestCount,
      freeSockets: inspect(this.freeSockets),
      sockets: inspect(this.sockets),
      requests: inspect(this.requests),
    };
  }
}

// node 8 don't has timeout attribute on socket
// https://github.com/nodejs/node/pull/21204/files#diff-e6ef024c3775d787c38487a6309e491dR408
function getSocketTimeout(socket) {
  return socket.timeout || socket._idleTimeout;
}

function installListeners(agent, socket, options) {
  debug('%s create, timeout %sms', socket[SOCKET_NAME], getSocketTimeout(socket));

  // listener socket events: close, timeout, error, free
  function onFree() {
    // create and socket.emit('free') logic
    // https://github.com/nodejs/node/blob/master/lib/_http_agent.js#L311
    // no req on the socket, it should be the new socket
    if (!socket._httpMessage && socket[SOCKET_REQUEST_COUNT] === 1) return;

    socket[SOCKET_REQUEST_FINISHED_COUNT]++;
    agent.requestCount++;
    debug('%s(requests: %s, finished: %s) free',
      socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT]);

    // should reuse on pedding requests?
    const name = agent.getName(options);
    if (socket.writable && agent.requests[name] && agent.requests[name].length) {
      // will be reuse on agent free listener
      socket[SOCKET_REQUEST_COUNT]++;
      debug('%s(requests: %s, finished: %s) will be reuse on agent free event',
        socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT]);
    }
  }
  socket.on('free', onFree);

  function onClose(isError) {
    debug('%s(requests: %s, finished: %s) close, isError: %s',
      socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT], isError);
    agent.closeSocketCount++;
  }
  socket.on('close', onClose);

  // start socket timeout handler
  function onTimeout() {
    // onTimeout and emitRequestTimeout(_http_client.js)
    // https://github.com/nodejs/node/blob/v12.x/lib/_http_client.js#L711
    const listenerCount = socket.listeners('timeout').length;
    // node <= 10, default listenerCount is 1, onTimeout
    // 11 < node <= 12, default listenerCount is 2, onTimeout and emitRequestTimeout
    // node >= 13, default listenerCount is 3, onTimeout,
    //   onTimeout(https://github.com/nodejs/node/pull/32000/files#diff-5f7fb0850412c6be189faeddea6c5359R333)
    //   and emitRequestTimeout
    const timeout = getSocketTimeout(socket);
    const req = socket._httpMessage;
    const reqTimeoutListenerCount = req && req.listeners('timeout').length || 0;
    debug('%s(requests: %s, finished: %s) timeout after %sms, listeners %s, defaultTimeoutListenerCount %s, hasHttpRequest %s, HttpRequest timeoutListenerCount %s',
      socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT],
      timeout, listenerCount, defaultTimeoutListenerCount, !!req, reqTimeoutListenerCount);
    if (debug.enabled) {
      debug('timeout listeners: %s', socket.listeners('timeout').map(f => f.name).join(', '));
    }
    agent.timeoutSocketCount++;
    const name = agent.getName(options);
    if (agent.freeSockets[name] && agent.freeSockets[name].indexOf(socket) !== -1) {
      // free socket timeout, destroy quietly
      socket.destroy();
      // Remove it from freeSockets list immediately to prevent new requests
      // from being sent through this socket.
      agent.removeSocket(socket, options);
      debug('%s is free, destroy quietly', socket[SOCKET_NAME]);
    } else {
      // if there is no any request socket timeout handler,
      // agent need to handle socket timeout itself.
      //
      // custom request socket timeout handle logic must follow these rules:
      //  1. Destroy socket first
      //  2. Must emit socket 'agentRemove' event tell agent remove socket
      //     from freeSockets list immediately.
      //     Otherise you may be get 'socket hang up' error when reuse
      //     free socket and timeout happen in the same time.
      if (reqTimeoutListenerCount === 0) {
        const error = new Error('Socket timeout');
        error.code = 'ERR_SOCKET_TIMEOUT';
        error.timeout = timeout;
        // must manually call socket.end() or socket.destroy() to end the connection.
        // https://nodejs.org/dist/latest-v10.x/docs/api/net.html#net_socket_settimeout_timeout_callback
        socket.destroy(error);
        agent.removeSocket(socket, options);
        debug('%s destroy with timeout error', socket[SOCKET_NAME]);
      }
    }
  }
  socket.on('timeout', onTimeout);

  function onError(err) {
    const listenerCount = socket.listeners('error').length;
    debug('%s(requests: %s, finished: %s) error: %s, listenerCount: %s',
      socket[SOCKET_NAME], socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT],
      err, listenerCount);
    agent.errorSocketCount++;
    if (listenerCount === 1) {
      // if socket don't contain error event handler, don't catch it, emit it again
      debug('%s emit uncaught error event', socket[SOCKET_NAME]);
      socket.removeListener('error', onError);
      socket.emit('error', err);
    }
  }
  socket.on('error', onError);

  function onRemove() {
    debug('%s(requests: %s, finished: %s) agentRemove',
      socket[SOCKET_NAME],
      socket[SOCKET_REQUEST_COUNT], socket[SOCKET_REQUEST_FINISHED_COUNT]);
    // We need this function for cases like HTTP 'upgrade'
    // (defined by WebSockets) where we need to remove a socket from the
    // pool because it'll be locked up indefinitely
    socket.removeListener('close', onClose);
    socket.removeListener('error', onError);
    socket.removeListener('free', onFree);
    socket.removeListener('timeout', onTimeout);
    socket.removeListener('agentRemove', onRemove);
  }
  socket.on('agentRemove', onRemove);
}

module.exports = Agent;

function inspect(obj) {
  const res = {};
  for (const key in obj) {
    res[key] = obj[key].length;
  }
  return res;
}
