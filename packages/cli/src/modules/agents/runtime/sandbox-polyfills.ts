/**
 * Web API stubs for the isolated-vm sandbox.
 *
 * Bare V8 isolates don't provide Web APIs (streams, fetch, encoding, etc.)
 * but bundled code may reference them at module evaluation time.
 * These stubs are injected so that `require()` calls don't throw — they
 * are never actually called during `describe()` or handler execution.
 *
 * Extracted from AgentSecureRuntime for testability and maintainability.
 */
export const SANDBOX_POLYFILLS = `
if (typeof TransformStream === 'undefined') {
	globalThis.TransformStream = function() {};
	globalThis.ReadableStream = function() {};
	globalThis.WritableStream = function() {};
	globalThis.TextEncoder = function() { this.encode = function(s) { return s; }; };
	globalThis.TextDecoder = function() { this.decode = function(s) { return s; }; };
}
if (typeof URL === 'undefined') {
	globalThis.URL = function(u) { this.href = u; this.toString = function() { return u; }; };
}
if (typeof AbortController === 'undefined') {
	globalThis.AbortController = function() { this.signal = {}; this.abort = function() {}; };
}
if (typeof Event === 'undefined') {
	globalThis.Event = function(type) { this.type = type; };
}
if (typeof EventTarget === 'undefined') {
	globalThis.EventTarget = function() {
		this._listeners = {};
	};
	EventTarget.prototype.addEventListener = function(type, fn) {
		if (!this._listeners[type]) this._listeners[type] = [];
		this._listeners[type].push(fn);
	};
	EventTarget.prototype.removeEventListener = function(type, fn) {
		if (!this._listeners[type]) return;
		this._listeners[type] = this._listeners[type].filter(function(f) { return f !== fn; });
	};
	EventTarget.prototype.dispatchEvent = function() { return true; };
}
if (typeof CustomEvent === 'undefined') {
	globalThis.CustomEvent = function(type, opts) {
		this.type = type;
		this.detail = opts && opts.detail;
	};
}
if (typeof MessageEvent === 'undefined') {
	globalThis.MessageEvent = function(type, opts) {
		this.type = type;
		this.data = opts && opts.data;
	};
}
if (typeof Headers === 'undefined') {
	globalThis.Headers = function(init) {
		this._headers = {};
		if (init) for (var k in init) this._headers[k.toLowerCase()] = init[k];
	};
	Headers.prototype.get = function(k) { return this._headers[k.toLowerCase()] || null; };
	Headers.prototype.set = function(k, v) { this._headers[k.toLowerCase()] = v; };
	Headers.prototype.has = function(k) { return k.toLowerCase() in this._headers; };
}
if (typeof Request === 'undefined') {
	globalThis.Request = function(url) { this.url = url; };
}
if (typeof Response === 'undefined') {
	globalThis.Response = function(body) { this.body = body; };
	Response.json = function(data) { return new Response(JSON.stringify(data)); };
}
if (typeof console === 'undefined') {
	globalThis.console = { log: function() {}, warn: function() {}, error: function() {} };
}
if (typeof setTimeout === 'undefined') {
	globalThis.setTimeout = function(fn) { fn(); return 0; };
	globalThis.clearTimeout = function() {};
}
if (typeof fetch === 'undefined') {
	globalThis.fetch = function() { throw new Error('fetch is not available in the sandbox'); };
}
`;
