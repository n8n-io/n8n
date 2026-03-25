'use strict';

const TYPE_REQUEST = "q";
const TYPE_RESPONSE = "s";
const DEFAULT_TIMEOUT = 6e4;
function defaultSerialize(i) {
  return i;
}
const defaultDeserialize = defaultSerialize;
const { clearTimeout, setTimeout } = globalThis;
const random = Math.random.bind(Math);
function createBirpc($functions, options) {
  const {
    post,
    on,
    off = () => {
    },
    eventNames = [],
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
    resolver,
    bind = "rpc",
    timeout = DEFAULT_TIMEOUT
  } = options;
  let $closed = false;
  const _rpcPromiseMap = /* @__PURE__ */ new Map();
  let _promiseInit;
  async function _call(method, args, event, optional) {
    if ($closed)
      throw new Error(`[birpc] rpc is closed, cannot call "${method}"`);
    const req = { m: method, a: args, t: TYPE_REQUEST };
    if (optional)
      req.o = true;
    const send = async (_req) => post(serialize(_req));
    if (event) {
      await send(req);
      return;
    }
    if (_promiseInit) {
      try {
        await _promiseInit;
      } finally {
        _promiseInit = void 0;
      }
    }
    let { promise, resolve, reject } = createPromiseWithResolvers();
    const id = nanoid();
    req.i = id;
    let timeoutId;
    async function handler(newReq = req) {
      if (timeout >= 0) {
        timeoutId = setTimeout(() => {
          try {
            const handleResult = options.onTimeoutError?.(method, args);
            if (handleResult !== true)
              throw new Error(`[birpc] timeout on calling "${method}"`);
          } catch (e) {
            reject(e);
          }
          _rpcPromiseMap.delete(id);
        }, timeout);
        if (typeof timeoutId === "object")
          timeoutId = timeoutId.unref?.();
      }
      _rpcPromiseMap.set(id, { resolve, reject, timeoutId, method });
      await send(newReq);
      return promise;
    }
    try {
      if (options.onRequest)
        await options.onRequest(req, handler, resolve);
      else
        await handler();
    } catch (e) {
      if (options.onGeneralError?.(e) !== true)
        throw e;
      return;
    } finally {
      clearTimeout(timeoutId);
      _rpcPromiseMap.delete(id);
    }
    return promise;
  }
  const $call = (method, ...args) => _call(method, args, false);
  const $callOptional = (method, ...args) => _call(method, args, false, true);
  const $callEvent = (method, ...args) => _call(method, args, true);
  const $callRaw = (options2) => _call(options2.method, options2.args, options2.event, options2.optional);
  const builtinMethods = {
    $call,
    $callOptional,
    $callEvent,
    $callRaw,
    $rejectPendingCalls,
    get $closed() {
      return $closed;
    },
    $close,
    $functions
  };
  const rpc = new Proxy({}, {
    get(_, method) {
      if (Object.prototype.hasOwnProperty.call(builtinMethods, method))
        return builtinMethods[method];
      if (method === "then" && !eventNames.includes("then") && !("then" in $functions))
        return void 0;
      const sendEvent = (...args) => _call(method, args, true);
      if (eventNames.includes(method)) {
        sendEvent.asEvent = sendEvent;
        return sendEvent;
      }
      const sendCall = (...args) => _call(method, args, false);
      sendCall.asEvent = sendEvent;
      return sendCall;
    }
  });
  function $close(customError) {
    $closed = true;
    _rpcPromiseMap.forEach(({ reject, method }) => {
      const error = new Error(`[birpc] rpc is closed, cannot call "${method}"`);
      if (customError) {
        customError.cause ??= error;
        return reject(customError);
      }
      reject(error);
    });
    _rpcPromiseMap.clear();
    off(onMessage);
  }
  function $rejectPendingCalls(handler) {
    const entries = Array.from(_rpcPromiseMap.values());
    const handlerResults = entries.map(({ method, reject }) => {
      if (!handler) {
        return reject(new Error(`[birpc]: rejected pending call "${method}".`));
      }
      return handler({ method, reject });
    });
    _rpcPromiseMap.clear();
    return handlerResults;
  }
  async function onMessage(data, ...extra) {
    let msg;
    try {
      msg = deserialize(data);
    } catch (e) {
      if (options.onGeneralError?.(e) !== true)
        throw e;
      return;
    }
    if (msg.t === TYPE_REQUEST) {
      const { m: method, a: args, o: optional } = msg;
      let result, error;
      let fn = await (resolver ? resolver(method, $functions[method]) : $functions[method]);
      if (optional)
        fn ||= () => void 0;
      if (!fn) {
        error = new Error(`[birpc] function "${method}" not found`);
      } else {
        try {
          result = await fn.apply(bind === "rpc" ? rpc : $functions, args);
        } catch (e) {
          error = e;
        }
      }
      if (msg.i) {
        if (error && options.onError)
          options.onError(error, method, args);
        if (error && options.onFunctionError) {
          if (options.onFunctionError(error, method, args) === true)
            return;
        }
        if (!error) {
          try {
            await post(serialize({ t: TYPE_RESPONSE, i: msg.i, r: result }), ...extra);
            return;
          } catch (e) {
            error = e;
            if (options.onGeneralError?.(e, method, args) !== true)
              throw e;
          }
        }
        try {
          await post(serialize({ t: TYPE_RESPONSE, i: msg.i, e: error }), ...extra);
        } catch (e) {
          if (options.onGeneralError?.(e, method, args) !== true)
            throw e;
        }
      }
    } else {
      const { i: ack, r: result, e: error } = msg;
      const promise = _rpcPromiseMap.get(ack);
      if (promise) {
        clearTimeout(promise.timeoutId);
        if (error)
          promise.reject(error);
        else
          promise.resolve(result);
      }
      _rpcPromiseMap.delete(ack);
    }
  }
  _promiseInit = on(onMessage);
  return rpc;
}
const cacheMap = /* @__PURE__ */ new WeakMap();
function cachedMap(items, fn) {
  return items.map((i) => {
    let r = cacheMap.get(i);
    if (!r) {
      r = fn(i);
      cacheMap.set(i, r);
    }
    return r;
  });
}
function createBirpcGroup(functions, channels, options = {}) {
  const getChannels = () => typeof channels === "function" ? channels() : channels;
  const getClients = (channels2 = getChannels()) => cachedMap(channels2, (s) => createBirpc(functions, { ...options, ...s }));
  function _boardcast(method, args, event, optional) {
    const clients = getClients();
    return Promise.all(clients.map((c) => c.$callRaw({ method, args, event, optional })));
  }
  function $call(method, ...args) {
    return _boardcast(method, args, false);
  }
  function $callOptional(method, ...args) {
    return _boardcast(method, args, false, true);
  }
  function $callEvent(method, ...args) {
    return _boardcast(method, args, true);
  }
  const broadcastBuiltin = {
    $call,
    $callOptional,
    $callEvent
  };
  const broadcastProxy = new Proxy({}, {
    get(_, method) {
      if (Object.prototype.hasOwnProperty.call(broadcastBuiltin, method))
        return broadcastBuiltin[method];
      const client = getClients();
      const callbacks = client.map((c) => c[method]);
      const sendCall = (...args) => {
        return Promise.all(callbacks.map((i) => i(...args)));
      };
      sendCall.asEvent = async (...args) => {
        await Promise.all(callbacks.map((i) => i.asEvent(...args)));
      };
      return sendCall;
    }
  });
  function updateChannels(fn) {
    const channels2 = getChannels();
    fn?.(channels2);
    return getClients(channels2);
  }
  getClients();
  return {
    get clients() {
      return getClients();
    },
    functions,
    updateChannels,
    broadcast: broadcastProxy,
    /**
     * @deprecated use `broadcast`
     */
    // @ts-expect-error deprecated
    boardcast: broadcastProxy
  };
}
function createPromiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(size = 21) {
  let id = "";
  let i = size;
  while (i--)
    id += urlAlphabet[random() * 64 | 0];
  return id;
}

exports.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;
exports.cachedMap = cachedMap;
exports.createBirpc = createBirpc;
exports.createBirpcGroup = createBirpcGroup;
