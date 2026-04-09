let _open_draft_deferred_promise = require("@open-draft/deferred-promise");
let outvariant = require("outvariant");

//#region src/glossary.ts
const IS_PATCHED_MODULE = Symbol("isPatchedModule");

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
//#region src/getRawRequest.ts
const kRawRequest = Symbol("kRawRequest");
/**
* Returns a raw request instance associated with this request.
*
* @example
* interceptor.on('request', ({ request }) => {
*   const rawRequest = getRawRequest(request)
*
*   if (rawRequest instanceof http.ClientRequest) {
*     console.log(rawRequest.rawHeaders)
*   }
* })
*/
function getRawRequest(request) {
	return Reflect.get(request, kRawRequest);
}
function setRawRequest(request, rawRequest) {
	Reflect.set(request, kRawRequest, rawRequest);
}

//#endregion
Object.defineProperty(exports, 'FetchResponse', {
  enumerable: true,
  get: function () {
    return FetchResponse;
  }
});
Object.defineProperty(exports, 'IS_PATCHED_MODULE', {
  enumerable: true,
  get: function () {
    return IS_PATCHED_MODULE;
  }
});
Object.defineProperty(exports, 'InterceptorError', {
  enumerable: true,
  get: function () {
    return InterceptorError;
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
Object.defineProperty(exports, 'getRawRequest', {
  enumerable: true,
  get: function () {
    return getRawRequest;
  }
});
Object.defineProperty(exports, 'setRawRequest', {
  enumerable: true,
  get: function () {
    return setRawRequest;
  }
});
//# sourceMappingURL=getRawRequest-zx8rUJL2.cjs.map