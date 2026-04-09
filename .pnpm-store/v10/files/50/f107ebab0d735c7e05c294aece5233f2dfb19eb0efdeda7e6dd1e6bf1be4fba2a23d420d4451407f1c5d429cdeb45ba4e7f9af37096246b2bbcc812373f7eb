const require_chunk = require('./chunk-CbDLau6x.cjs');
let _open_draft_logger = require("@open-draft/logger");
let strict_event_emitter = require("strict-event-emitter");
let _open_draft_deferred_promise = require("@open-draft/deferred-promise");
let outvariant = require("outvariant");

//#region src/Interceptor.ts
/**
* Request header name to detect when a single request
* is being handled by nested interceptors (XHR -> ClientRequest).
* Obscure by design to prevent collisions with user-defined headers.
* Ideally, come up with the Interceptor-level mechanism for this.
* @see https://github.com/mswjs/interceptors/issues/378
*/
const INTERNAL_REQUEST_ID_HEADER_NAME = "x-interceptors-internal-request-id";
function getGlobalSymbol(symbol) {
	return globalThis[symbol] || void 0;
}
function setGlobalSymbol(symbol, value) {
	globalThis[symbol] = value;
}
function deleteGlobalSymbol(symbol) {
	delete globalThis[symbol];
}
let InterceptorReadyState = /* @__PURE__ */ function(InterceptorReadyState$1) {
	InterceptorReadyState$1["INACTIVE"] = "INACTIVE";
	InterceptorReadyState$1["APPLYING"] = "APPLYING";
	InterceptorReadyState$1["APPLIED"] = "APPLIED";
	InterceptorReadyState$1["DISPOSING"] = "DISPOSING";
	InterceptorReadyState$1["DISPOSED"] = "DISPOSED";
	return InterceptorReadyState$1;
}({});
var Interceptor = class {
	constructor(symbol) {
		this.symbol = symbol;
		this.readyState = InterceptorReadyState.INACTIVE;
		this.emitter = new strict_event_emitter.Emitter();
		this.subscriptions = [];
		this.logger = new _open_draft_logger.Logger(symbol.description);
		this.emitter.setMaxListeners(0);
		this.logger.info("constructing the interceptor...");
	}
	/**
	* Determine if this interceptor can be applied
	* in the current environment.
	*/
	checkEnvironment() {
		return true;
	}
	/**
	* Apply this interceptor to the current process.
	* Returns an already running interceptor instance if it's present.
	*/
	apply() {
		const logger = this.logger.extend("apply");
		logger.info("applying the interceptor...");
		if (this.readyState === InterceptorReadyState.APPLIED) {
			logger.info("intercepted already applied!");
			return;
		}
		if (!this.checkEnvironment()) {
			logger.info("the interceptor cannot be applied in this environment!");
			return;
		}
		this.readyState = InterceptorReadyState.APPLYING;
		const runningInstance = this.getInstance();
		if (runningInstance) {
			logger.info("found a running instance, reusing...");
			this.on = (event, listener) => {
				logger.info("proxying the \"%s\" listener", event);
				runningInstance.emitter.addListener(event, listener);
				this.subscriptions.push(() => {
					runningInstance.emitter.removeListener(event, listener);
					logger.info("removed proxied \"%s\" listener!", event);
				});
				return this;
			};
			this.readyState = InterceptorReadyState.APPLIED;
			return;
		}
		logger.info("no running instance found, setting up a new instance...");
		this.setup();
		this.setInstance();
		this.readyState = InterceptorReadyState.APPLIED;
	}
	/**
	* Setup the module augments and stubs necessary for this interceptor.
	* This method is not run if there's a running interceptor instance
	* to prevent instantiating an interceptor multiple times.
	*/
	setup() {}
	/**
	* Listen to the interceptor's public events.
	*/
	on(event, listener) {
		const logger = this.logger.extend("on");
		if (this.readyState === InterceptorReadyState.DISPOSING || this.readyState === InterceptorReadyState.DISPOSED) {
			logger.info("cannot listen to events, already disposed!");
			return this;
		}
		logger.info("adding \"%s\" event listener:", event, listener);
		this.emitter.on(event, listener);
		return this;
	}
	once(event, listener) {
		this.emitter.once(event, listener);
		return this;
	}
	off(event, listener) {
		this.emitter.off(event, listener);
		return this;
	}
	removeAllListeners(event) {
		this.emitter.removeAllListeners(event);
		return this;
	}
	/**
	* Disposes of any side-effects this interceptor has introduced.
	*/
	dispose() {
		const logger = this.logger.extend("dispose");
		if (this.readyState === InterceptorReadyState.DISPOSED) {
			logger.info("cannot dispose, already disposed!");
			return;
		}
		logger.info("disposing the interceptor...");
		this.readyState = InterceptorReadyState.DISPOSING;
		if (!this.getInstance()) {
			logger.info("no interceptors running, skipping dispose...");
			return;
		}
		this.clearInstance();
		logger.info("global symbol deleted:", getGlobalSymbol(this.symbol));
		if (this.subscriptions.length > 0) {
			logger.info("disposing of %d subscriptions...", this.subscriptions.length);
			for (const dispose of this.subscriptions) dispose();
			this.subscriptions = [];
			logger.info("disposed of all subscriptions!", this.subscriptions.length);
		}
		this.emitter.removeAllListeners();
		logger.info("destroyed the listener!");
		this.readyState = InterceptorReadyState.DISPOSED;
	}
	getInstance() {
		const instance = getGlobalSymbol(this.symbol);
		this.logger.info("retrieved global instance:", instance?.constructor?.name);
		return instance;
	}
	setInstance() {
		setGlobalSymbol(this.symbol, this);
		this.logger.info("set global instance!", this.symbol.description);
	}
	clearInstance() {
		deleteGlobalSymbol(this.symbol);
		this.logger.info("cleared global instance!", this.symbol.description);
	}
};

//#endregion
//#region src/InterceptorError.ts
var InterceptorError = class InterceptorError extends Error {
	constructor(message) {
		super(message);
		this.name = "InterceptorError";
		Object.setPrototypeOf(this, InterceptorError.prototype);
	}
};

//#endregion
//#region src/RequestController.ts
var RequestController = class RequestController {
	static {
		this.PENDING = 0;
	}
	static {
		this.PASSTHROUGH = 1;
	}
	static {
		this.RESPONSE = 2;
	}
	static {
		this.ERROR = 3;
	}
	constructor(request, source) {
		this.request = request;
		this.source = source;
		this.readyState = RequestController.PENDING;
		this.handled = new _open_draft_deferred_promise.DeferredPromise();
	}
	get #handled() {
		return this.handled;
	}
	/**
	* Perform this request as-is.
	*/
	async passthrough() {
		outvariant.invariant.as(InterceptorError, this.readyState === RequestController.PENDING, "Failed to passthrough the \"%s %s\" request: the request has already been handled", this.request.method, this.request.url);
		this.readyState = RequestController.PASSTHROUGH;
		await this.source.passthrough();
		this.#handled.resolve();
	}
	/**
	* Respond to this request with the given `Response` instance.
	*
	* @example
	* controller.respondWith(new Response())
	* controller.respondWith(Response.json({ id }))
	* controller.respondWith(Response.error())
	*/
	respondWith(response) {
		outvariant.invariant.as(InterceptorError, this.readyState === RequestController.PENDING, "Failed to respond to the \"%s %s\" request with \"%d %s\": the request has already been handled (%d)", this.request.method, this.request.url, response.status, response.statusText || "OK", this.readyState);
		this.readyState = RequestController.RESPONSE;
		this.#handled.resolve();
		/**
		* @note Although `source.respondWith()` is potentially asynchronous,
		* do NOT await it for backward-compatibility. Awaiting it will short-circuit
		* the request listener invocation as soon as a listener responds to a request.
		* Ideally, that's what we want, but that's not what we promise the user.
		*/
		this.source.respondWith(response);
	}
	/**
	* Error this request with the given reason.
	*
	* @example
	* controller.errorWith()
	* controller.errorWith(new Error('Oops!'))
	* controller.errorWith({ message: 'Oops!'})
	*/
	errorWith(reason) {
		outvariant.invariant.as(InterceptorError, this.readyState === RequestController.PENDING, "Failed to error the \"%s %s\" request with \"%s\": the request has already been handled (%d)", this.request.method, this.request.url, reason?.toString(), this.readyState);
		this.readyState = RequestController.ERROR;
		this.source.errorWith(reason);
		this.#handled.resolve();
	}
};

//#endregion
//#region src/createRequestId.ts
/**
* Generate a random ID string to represent a request.
* @example
* createRequestId()
* // "f774b6c9c600f"
*/
function createRequestId() {
	return Math.random().toString(16).slice(2);
}

//#endregion
//#region src/utils/canParseUrl.ts
/**
* Returns a boolean indicating whether the given URL string
* can be parsed into a `URL` instance.
* A substitute for `URL.canParse()` for Node.js 18.
*/
function canParseUrl(url) {
	try {
		new URL(url);
		return true;
	} catch (_error) {
		return false;
	}
}

//#endregion
//#region src/utils/getValueBySymbol.ts
/**
* Returns the value behind the symbol with the given name.
*/
function getValueBySymbol(symbolName, source) {
	const symbol = Object.getOwnPropertySymbols(source).find((symbol$1) => {
		return symbol$1.description === symbolName;
	});
	if (symbol) return Reflect.get(source, symbol);
}

//#endregion
//#region src/utils/fetchUtils.ts
var FetchResponse = class FetchResponse extends Response {
	static {
		this.STATUS_CODES_WITHOUT_BODY = [
			101,
			103,
			204,
			205,
			304
		];
	}
	static {
		this.STATUS_CODES_WITH_REDIRECT = [
			301,
			302,
			303,
			307,
			308
		];
	}
	static isConfigurableStatusCode(status) {
		return status >= 200 && status <= 599;
	}
	static isRedirectResponse(status) {
		return FetchResponse.STATUS_CODES_WITH_REDIRECT.includes(status);
	}
	/**
	* Returns a boolean indicating whether the given response status
	* code represents a response that can have a body.
	*/
	static isResponseWithBody(status) {
		return !FetchResponse.STATUS_CODES_WITHOUT_BODY.includes(status);
	}
	static setUrl(url, response) {
		if (!url || url === "about:" || !canParseUrl(url)) return;
		const state = getValueBySymbol("state", response);
		if (state) state.urlList.push(new URL(url));
		else Object.defineProperty(response, "url", {
			value: url,
			enumerable: true,
			configurable: true,
			writable: false
		});
	}
	/**
	* Parses the given raw HTTP headers into a Fetch API `Headers` instance.
	*/
	static parseRawHeaders(rawHeaders) {
		const headers = new Headers();
		for (let line = 0; line < rawHeaders.length; line += 2) headers.append(rawHeaders[line], rawHeaders[line + 1]);
		return headers;
	}
	constructor(body, init = {}) {
		const status = init.status ?? 200;
		const safeStatus = FetchResponse.isConfigurableStatusCode(status) ? status : 200;
		const finalBody = FetchResponse.isResponseWithBody(status) ? body : null;
		super(finalBody, {
			status: safeStatus,
			statusText: init.statusText,
			headers: init.headers
		});
		if (status !== safeStatus) {
			/**
			* @note Undici keeps an internal "Symbol(state)" that holds
			* the actual value of response status. Update that in Node.js.
			*/
			const state = getValueBySymbol("state", this);
			if (state) state.status = status;
			else Object.defineProperty(this, "status", {
				value: status,
				enumerable: true,
				configurable: true,
				writable: false
			});
		}
		FetchResponse.setUrl(init.url, this);
	}
};

//#endregion
Object.defineProperty(exports, 'FetchResponse', {
  enumerable: true,
  get: function () {
    return FetchResponse;
  }
});
Object.defineProperty(exports, 'INTERNAL_REQUEST_ID_HEADER_NAME', {
  enumerable: true,
  get: function () {
    return INTERNAL_REQUEST_ID_HEADER_NAME;
  }
});
Object.defineProperty(exports, 'Interceptor', {
  enumerable: true,
  get: function () {
    return Interceptor;
  }
});
Object.defineProperty(exports, 'InterceptorError', {
  enumerable: true,
  get: function () {
    return InterceptorError;
  }
});
Object.defineProperty(exports, 'InterceptorReadyState', {
  enumerable: true,
  get: function () {
    return InterceptorReadyState;
  }
});
Object.defineProperty(exports, 'RequestController', {
  enumerable: true,
  get: function () {
    return RequestController;
  }
});
Object.defineProperty(exports, 'canParseUrl', {
  enumerable: true,
  get: function () {
    return canParseUrl;
  }
});
Object.defineProperty(exports, 'createRequestId', {
  enumerable: true,
  get: function () {
    return createRequestId;
  }
});
Object.defineProperty(exports, 'deleteGlobalSymbol', {
  enumerable: true,
  get: function () {
    return deleteGlobalSymbol;
  }
});
Object.defineProperty(exports, 'getGlobalSymbol', {
  enumerable: true,
  get: function () {
    return getGlobalSymbol;
  }
});
//# sourceMappingURL=fetchUtils-BaY5iWXw.cjs.map