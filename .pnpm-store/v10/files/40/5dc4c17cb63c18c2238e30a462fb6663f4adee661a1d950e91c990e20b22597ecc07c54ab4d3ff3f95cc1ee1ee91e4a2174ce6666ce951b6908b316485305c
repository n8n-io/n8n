//#region src/messages.ts
const TYPE_REQUEST = "q";
const TYPE_RESPONSE = "s";

//#endregion
//#region src/utils.ts
function createPromiseWithResolvers() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
const random = Math.random.bind(Math);
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(size = 21) {
	let id = "";
	let i = size;
	while (i--) id += urlAlphabet[random() * 64 | 0];
	return id;
}

//#endregion
//#region src/main.ts
const DEFAULT_TIMEOUT = 6e4;
const defaultSerialize = (i) => i;
const defaultDeserialize = defaultSerialize;
const { clearTimeout: clearTimeout$1, setTimeout: setTimeout$1 } = globalThis;
function createBirpc($functions, options) {
	const { post, on, off = () => {}, eventNames = [], serialize = defaultSerialize, deserialize = defaultDeserialize, resolver, bind = "rpc", timeout = DEFAULT_TIMEOUT, proxify = true } = options;
	let $closed = false;
	const _rpcPromiseMap = /* @__PURE__ */ new Map();
	let _promiseInit;
	let rpc;
	async function _call(method, args, event, optional) {
		if ($closed) throw new Error(`[birpc] rpc is closed, cannot call "${method}"`);
		const req = {
			m: method,
			a: args,
			t: TYPE_REQUEST
		};
		if (optional) req.o = true;
		const send = async (_req) => post(serialize(_req));
		if (event) {
			await send(req);
			return;
		}
		if (_promiseInit) try {
			await _promiseInit;
		} finally {
			_promiseInit = void 0;
		}
		let { promise, resolve, reject } = createPromiseWithResolvers();
		const id = nanoid();
		req.i = id;
		let timeoutId;
		async function handler(newReq = req) {
			if (timeout >= 0) {
				timeoutId = setTimeout$1(() => {
					try {
						if (options.onTimeoutError?.call(rpc, method, args) !== true) throw new Error(`[birpc] timeout on calling "${method}"`);
					} catch (e) {
						reject(e);
					}
					_rpcPromiseMap.delete(id);
				}, timeout);
				if (typeof timeoutId === "object") timeoutId = timeoutId.unref?.();
			}
			_rpcPromiseMap.set(id, {
				resolve,
				reject,
				timeoutId,
				method
			});
			await send(newReq);
			return promise;
		}
		try {
			if (options.onRequest) await options.onRequest.call(rpc, req, handler, resolve);
			else await handler();
		} catch (e) {
			if (options.onGeneralError?.call(rpc, e) !== true) throw e;
			return;
		} finally {
			clearTimeout$1(timeoutId);
			_rpcPromiseMap.delete(id);
		}
		return promise;
	}
	const builtinMethods = {
		$call: (method, ...args) => _call(method, args, false),
		$callOptional: (method, ...args) => _call(method, args, false, true),
		$callEvent: (method, ...args) => _call(method, args, true),
		$callRaw: (options$1) => _call(options$1.method, options$1.args, options$1.event, options$1.optional),
		$rejectPendingCalls,
		get $closed() {
			return $closed;
		},
		get $meta() {
			return options.meta;
		},
		$close,
		$functions
	};
	if (proxify) rpc = new Proxy({}, { get(_, method) {
		if (Object.prototype.hasOwnProperty.call(builtinMethods, method)) return builtinMethods[method];
		if (method === "then" && !eventNames.includes("then") && !("then" in $functions)) return void 0;
		const sendEvent = (...args) => _call(method, args, true);
		if (eventNames.includes(method)) {
			sendEvent.asEvent = sendEvent;
			return sendEvent;
		}
		const sendCall = (...args) => _call(method, args, false);
		sendCall.asEvent = sendEvent;
		return sendCall;
	} });
	else rpc = builtinMethods;
	function $close(customError) {
		$closed = true;
		_rpcPromiseMap.forEach(({ reject, method }) => {
			const error = /* @__PURE__ */ new Error(`[birpc] rpc is closed, cannot call "${method}"`);
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
		const handlerResults = Array.from(_rpcPromiseMap.values()).map(({ method, reject }) => {
			if (!handler) return reject(/* @__PURE__ */ new Error(`[birpc]: rejected pending call "${method}".`));
			return handler({
				method,
				reject
			});
		});
		_rpcPromiseMap.clear();
		return handlerResults;
	}
	async function onMessage(data, ...extra) {
		let msg;
		try {
			msg = deserialize(data);
		} catch (e) {
			if (options.onGeneralError?.call(rpc, e) !== true) throw e;
			return;
		}
		if (msg.t === TYPE_REQUEST) {
			const { m: method, a: args, o: optional } = msg;
			let result, error;
			let fn = await (resolver ? resolver.call(rpc, method, $functions[method]) : $functions[method]);
			if (optional) fn ||= () => void 0;
			if (!fn) error = /* @__PURE__ */ new Error(`[birpc] function "${method}" not found`);
			else try {
				result = await fn.apply(bind === "rpc" ? rpc : $functions, args);
			} catch (e) {
				error = e;
			}
			if (msg.i) {
				if (error && options.onFunctionError) {
					if (options.onFunctionError.call(rpc, error, method, args) === true) return;
				}
				if (!error) try {
					await post(serialize({
						t: TYPE_RESPONSE,
						i: msg.i,
						r: result
					}), ...extra);
					return;
				} catch (e) {
					error = e;
					if (options.onGeneralError?.call(rpc, e, method, args) !== true) throw e;
				}
				try {
					await post(serialize({
						t: TYPE_RESPONSE,
						i: msg.i,
						e: error
					}), ...extra);
				} catch (e) {
					if (options.onGeneralError?.call(rpc, e, method, args) !== true) throw e;
				}
			}
		} else {
			const { i: ack, r: result, e: error } = msg;
			const promise = _rpcPromiseMap.get(ack);
			if (promise) {
				clearTimeout$1(promise.timeoutId);
				if (error) promise.reject(error);
				else promise.resolve(result);
			}
			_rpcPromiseMap.delete(ack);
		}
	}
	_promiseInit = on(onMessage);
	return rpc;
}

/// <reference types="../types/index.d.ts" />

// (c) 2020-present Andrea Giammarchi

const {parse: $parse, stringify: $stringify} = JSON;
const {keys} = Object;

const Primitive = String;   // it could be Number
const primitive = 'string'; // it could be 'number'

const ignore = {};
const object = 'object';

const noop = (_, value) => value;

const primitives = value => (
  value instanceof Primitive ? Primitive(value) : value
);

const Primitives = (_, value) => (
  typeof value === primitive ? new Primitive(value) : value
);

const revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), {length} = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({k, a: [input, parsed, tmp, $]});
      }
      else
        output[k] = $.call(output, k, tmp);
    }
    else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
  }
  for (let {length} = lazy, i = 0; i < length; i++) {
    const {k, a} = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};

const set = (known, input, value) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};

/**
 * Converts a specialized flatted string into a JS value.
 * @param {string} text
 * @param {(this: any, key: string, value: any) => any} [reviver]
 * @returns {any}
 */
const parse = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp = typeof value === object && value ?
              revive(input, new Set, value, $) :
              value;
  return $.call({'': tmp}, '', tmp);
};

/**
 * Converts a JS value into a specialized flatted string.
 * @param {any} value
 * @param {((this: any, key: string, value: any) => any) | (string | number)[] | null | undefined} [replacer]
 * @param {string | number | undefined} [space]
 * @returns {string}
 */
const stringify = (value, replacer, space) => {
  const $ = replacer && typeof replacer === object ?
            (k, v) => (k === '' || -1 < replacer.indexOf(k) ? v : void 0) :
            (replacer || noop);
  const known = new Map;
  const input = [];
  const output = [];
  let i = +set(known, input, $.call({'': value}, '', value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
  }
  return '[' + output.join(',') + ']';
  function replace(key, value) {
    if (firstRun) {
      firstRun = !firstRun;
      return value;
    }
    const after = $.call(this, key, value);
    switch (typeof after) {
      case object:
        if (after === null) return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};

/* @__NO_SIDE_EFFECTS__ */
function getBrowserState() {
	// @ts-expect-error not typed global
	return window.__vitest_browser_runner__;
}

const channel = new BroadcastChannel(`vitest:${getBrowserState().sessionId}`);
const globalChannel = new BroadcastChannel("vitest:global");

const PAGE_TYPE = getBrowserState().type;
const PORT = location.port;
const HOST = [location.hostname, PORT].filter(Boolean).join(":");
const RPC_ID = PAGE_TYPE === "orchestrator" ? getBrowserState().sessionId : getBrowserState().testerId;
const METHOD = getBrowserState().method;
const ENTRY_URL = `${location.protocol === "https:" ? "wss:" : "ws:"}//${HOST}/__vitest_browser_api__?type=${PAGE_TYPE}&rpcId=${RPC_ID}&sessionId=${getBrowserState().sessionId}&projectName=${getBrowserState().config.name || ""}&method=${METHOD}&token=${window.VITEST_API_TOKEN || "0"}`;
const onCancelCallbacks = [];
function onCancel(callback) {
	onCancelCallbacks.push(callback);
}
// ws connection can be established before the orchestrator is fully loaded
// in very rare cases in the preview provider
function waitForOrchestrator() {
	return new Promise((resolve, reject) => {
		const type = getBrowserState().type;
		if (type !== "orchestrator") {
			reject(new TypeError("Only orchestrator can create testers."));
			return;
		}
		function check() {
			const orchestrator = getBrowserState().orchestrator;
			if (orchestrator) {
				return resolve(orchestrator);
			}
			setTimeout(check);
		}
		check();
	});
}
function createClient() {
	const reconnectInterval = 2e3;
	const reconnectTries = 10;
	const connectTimeout = 6e4;
	let tries = reconnectTries;
	const ctx = {
		ws: new WebSocket(ENTRY_URL),
		waitForConnection
	};
	let onMessage;
	ctx.rpc = createBirpc({
		async onCancel(reason) {
			await Promise.all(onCancelCallbacks.map((fn) => fn(reason)));
		},
		async createTesters(options) {
			const orchestrator = await waitForOrchestrator();
			return orchestrator.createTesters(options);
		},
		async cleanupTesters() {
			const orchestrator = await waitForOrchestrator();
			return orchestrator.cleanupTesters();
		},
		cdpEvent(event, payload) {
			const cdp = getBrowserState().cdp;
			if (!cdp) {
				return;
			}
			cdp.emit(event, payload);
		},
		async resolveManualMock(url) {
			// @ts-expect-error not typed global API
			const mocker = globalThis.__vitest_mocker__;
			const responseId = getBrowserState().sessionId;
			if (!mocker) {
				return {
					url,
					keys: [],
					responseId
				};
			}
			const exports$1 = await mocker.resolveFactoryModule(url);
			const keys = Object.keys(exports$1);
			return {
				url,
				keys,
				responseId
			};
		}
	}, {
		post: (msg) => ctx.ws.send(msg),
		on: (fn) => onMessage = fn,
		serialize: (e) => stringify(e, (_, v) => {
			if (v instanceof Error) {
				return {
					name: v.name,
					message: v.message,
					stack: v.stack
				};
			}
			return v;
		}),
		deserialize: parse,
		timeout: -1
	});
	let openPromise;
	function reconnect(reset = false) {
		if (reset) {
			tries = reconnectTries;
		}
		ctx.ws = new WebSocket(ENTRY_URL);
		registerWS();
	}
	function registerWS() {
		openPromise = new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Cannot connect to the server in ${connectTimeout / 1e3} seconds`));
			}, connectTimeout);
			if (ctx.ws.OPEN === ctx.ws.readyState) {
				resolve();
			}
			// still have a listener even if it's already open to update tries
			ctx.ws.addEventListener("open", () => {
				tries = reconnectTries;
				resolve();
				clearTimeout(timeout);
			});
		});
		ctx.ws.addEventListener("message", (v) => {
			onMessage(v.data);
		});
		ctx.ws.addEventListener("close", () => {
			tries -= 1;
			if (tries > 0) {
				setTimeout(reconnect, reconnectInterval);
			}
		});
	}
	registerWS();
	function waitForConnection() {
		return openPromise;
	}
	return ctx;
}
const client = createClient();

export { ENTRY_URL, HOST, PORT, RPC_ID, channel, client, globalChannel, onCancel };
