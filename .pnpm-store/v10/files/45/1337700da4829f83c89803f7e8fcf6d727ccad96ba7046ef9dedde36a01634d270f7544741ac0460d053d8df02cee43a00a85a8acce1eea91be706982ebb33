/**
 * @license
 * web-streams-polyfill v3.3.3
 * Copyright 2024 Mattias Buelens, Diwank Singh Tomer and other contributors.
 * This code is released under the MIT license.
 * SPDX-License-Identifier: MIT
 */
/// <reference lib="es2015.symbol" />
var SymbolPolyfill = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ?
    Symbol :
    function (description) { return "Symbol(".concat(description, ")"); };

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function noop() {
    return undefined;
}

function typeIsObject(x) {
    return (typeof x === 'object' && x !== null) || typeof x === 'function';
}
var rethrowAssertionErrorRejection = noop;
function setFunctionName(fn, name) {
    try {
        Object.defineProperty(fn, 'name', {
            value: name,
            configurable: true
        });
    }
    catch (_a) {
        // This property is non-configurable in older browsers, so ignore if this throws.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#browser_compatibility
    }
}

var originalPromise = Promise;
var originalPromiseThen = Promise.prototype.then;
var originalPromiseReject = Promise.reject.bind(originalPromise);
// https://webidl.spec.whatwg.org/#a-new-promise
function newPromise(executor) {
    return new originalPromise(executor);
}
// https://webidl.spec.whatwg.org/#a-promise-resolved-with
function promiseResolvedWith(value) {
    return newPromise(function (resolve) { return resolve(value); });
}
// https://webidl.spec.whatwg.org/#a-promise-rejected-with
function promiseRejectedWith(reason) {
    return originalPromiseReject(reason);
}
function PerformPromiseThen(promise, onFulfilled, onRejected) {
    // There doesn't appear to be any way to correctly emulate the behaviour from JavaScript, so this is just an
    // approximation.
    return originalPromiseThen.call(promise, onFulfilled, onRejected);
}
// Bluebird logs a warning when a promise is created within a fulfillment handler, but then isn't returned
// from that handler. To prevent this, return null instead of void from all handlers.
// http://bluebirdjs.com/docs/warning-explanations.html#warning-a-promise-was-created-in-a-handler-but-was-not-returned-from-it
function uponPromise(promise, onFulfilled, onRejected) {
    PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), undefined, rethrowAssertionErrorRejection);
}
function uponFulfillment(promise, onFulfilled) {
    uponPromise(promise, onFulfilled);
}
function uponRejection(promise, onRejected) {
    uponPromise(promise, undefined, onRejected);
}
function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
    return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
}
function setPromiseIsHandledToTrue(promise) {
    PerformPromiseThen(promise, undefined, rethrowAssertionErrorRejection);
}
var _queueMicrotask = function (callback) {
    if (typeof queueMicrotask === 'function') {
        _queueMicrotask = queueMicrotask;
    }
    else {
        var resolvedPromise_1 = promiseResolvedWith(undefined);
        _queueMicrotask = function (cb) { return PerformPromiseThen(resolvedPromise_1, cb); };
    }
    return _queueMicrotask(callback);
};
function reflectCall(F, V, args) {
    if (typeof F !== 'function') {
        throw new TypeError('Argument is not a function');
    }
    return Function.prototype.apply.call(F, V, args);
}
function promiseCall(F, V, args) {
    try {
        return promiseResolvedWith(reflectCall(F, V, args));
    }
    catch (value) {
        return promiseRejectedWith(value);
    }
}

// Original from Chromium
// https://chromium.googlesource.com/chromium/src/+/0aee4434a4dba42a42abaea9bfbc0cd196a63bc1/third_party/blink/renderer/core/streams/SimpleQueue.js
var QUEUE_MAX_ARRAY_SIZE = 16384;
/**
 * Simple queue structure.
 *
 * Avoids scalability issues with using a packed array directly by using
 * multiple arrays in a linked list and keeping the array size bounded.
 */
var SimpleQueue = /** @class */ (function () {
    function SimpleQueue() {
        this._cursor = 0;
        this._size = 0;
        // _front and _back are always defined.
        this._front = {
            _elements: [],
            _next: undefined
        };
        this._back = this._front;
        // The cursor is used to avoid calling Array.shift().
        // It contains the index of the front element of the array inside the
        // front-most node. It is always in the range [0, QUEUE_MAX_ARRAY_SIZE).
        this._cursor = 0;
        // When there is only one node, size === elements.length - cursor.
        this._size = 0;
    }
    Object.defineProperty(SimpleQueue.prototype, "length", {
        get: function () {
            return this._size;
        },
        enumerable: false,
        configurable: true
    });
    // For exception safety, this method is structured in order:
    // 1. Read state
    // 2. Calculate required state mutations
    // 3. Perform state mutations
    SimpleQueue.prototype.push = function (element) {
        var oldBack = this._back;
        var newBack = oldBack;
        if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
            newBack = {
                _elements: [],
                _next: undefined
            };
        }
        // push() is the mutation most likely to throw an exception, so it
        // goes first.
        oldBack._elements.push(element);
        if (newBack !== oldBack) {
            this._back = newBack;
            oldBack._next = newBack;
        }
        ++this._size;
    };
    // Like push(), shift() follows the read -> calculate -> mutate pattern for
    // exception safety.
    SimpleQueue.prototype.shift = function () { // must not be called on an empty queue
        var oldFront = this._front;
        var newFront = oldFront;
        var oldCursor = this._cursor;
        var newCursor = oldCursor + 1;
        var elements = oldFront._elements;
        var element = elements[oldCursor];
        if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
            newFront = oldFront._next;
            newCursor = 0;
        }
        // No mutations before this point.
        --this._size;
        this._cursor = newCursor;
        if (oldFront !== newFront) {
            this._front = newFront;
        }
        // Permit shifted element to be garbage collected.
        elements[oldCursor] = undefined;
        return element;
    };
    // The tricky thing about forEach() is that it can be called
    // re-entrantly. The queue may be mutated inside the callback. It is easy to
    // see that push() within the callback has no negative effects since the end
    // of the queue is checked for on every iteration. If shift() is called
    // repeatedly within the callback then the next iteration may return an
    // element that has been removed. In this case the callback will be called
    // with undefined values until we either "catch up" with elements that still
    // exist or reach the back of the queue.
    SimpleQueue.prototype.forEach = function (callback) {
        var i = this._cursor;
        var node = this._front;
        var elements = node._elements;
        while (i !== elements.length || node._next !== undefined) {
            if (i === elements.length) {
                node = node._next;
                elements = node._elements;
                i = 0;
                if (elements.length === 0) {
                    break;
                }
            }
            callback(elements[i]);
            ++i;
        }
    };
    // Return the element that would be returned if shift() was called now,
    // without modifying the queue.
    SimpleQueue.prototype.peek = function () { // must not be called on an empty queue
        var front = this._front;
        var cursor = this._cursor;
        return front._elements[cursor];
    };
    return SimpleQueue;
}());

var AbortSteps = SymbolPolyfill('[[AbortSteps]]');
var ErrorSteps = SymbolPolyfill('[[ErrorSteps]]');
var CancelSteps = SymbolPolyfill('[[CancelSteps]]');
var PullSteps = SymbolPolyfill('[[PullSteps]]');
var ReleaseSteps = SymbolPolyfill('[[ReleaseSteps]]');

function ReadableStreamReaderGenericInitialize(reader, stream) {
    reader._ownerReadableStream = stream;
    stream._reader = reader;
    if (stream._state === 'readable') {
        defaultReaderClosedPromiseInitialize(reader);
    }
    else if (stream._state === 'closed') {
        defaultReaderClosedPromiseInitializeAsResolved(reader);
    }
    else {
        defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
    }
}
// A client of ReadableStreamDefaultReader and ReadableStreamBYOBReader may use these functions directly to bypass state
// check.
function ReadableStreamReaderGenericCancel(reader, reason) {
    var stream = reader._ownerReadableStream;
    return ReadableStreamCancel(stream, reason);
}
function ReadableStreamReaderGenericRelease(reader) {
    var stream = reader._ownerReadableStream;
    if (stream._state === 'readable') {
        defaultReaderClosedPromiseReject(reader, new TypeError("Reader was released and can no longer be used to monitor the stream's closedness"));
    }
    else {
        defaultReaderClosedPromiseResetToRejected(reader, new TypeError("Reader was released and can no longer be used to monitor the stream's closedness"));
    }
    stream._readableStreamController[ReleaseSteps]();
    stream._reader = undefined;
    reader._ownerReadableStream = undefined;
}
// Helper functions for the readers.
function readerLockException(name) {
    return new TypeError('Cannot ' + name + ' a stream using a released reader');
}
// Helper functions for the ReadableStreamDefaultReader.
function defaultReaderClosedPromiseInitialize(reader) {
    reader._closedPromise = newPromise(function (resolve, reject) {
        reader._closedPromise_resolve = resolve;
        reader._closedPromise_reject = reject;
    });
}
function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
    defaultReaderClosedPromiseInitialize(reader);
    defaultReaderClosedPromiseReject(reader, reason);
}
function defaultReaderClosedPromiseInitializeAsResolved(reader) {
    defaultReaderClosedPromiseInitialize(reader);
    defaultReaderClosedPromiseResolve(reader);
}
function defaultReaderClosedPromiseReject(reader, reason) {
    if (reader._closedPromise_reject === undefined) {
        return;
    }
    setPromiseIsHandledToTrue(reader._closedPromise);
    reader._closedPromise_reject(reason);
    reader._closedPromise_resolve = undefined;
    reader._closedPromise_reject = undefined;
}
function defaultReaderClosedPromiseResetToRejected(reader, reason) {
    defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
}
function defaultReaderClosedPromiseResolve(reader) {
    if (reader._closedPromise_resolve === undefined) {
        return;
    }
    reader._closedPromise_resolve(undefined);
    reader._closedPromise_resolve = undefined;
    reader._closedPromise_reject = undefined;
}

/// <reference lib="es2015.core" />
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite#Polyfill
var NumberIsFinite = Number.isFinite || function (x) {
    return typeof x === 'number' && isFinite(x);
};

/// <reference lib="es2015.core" />
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc#Polyfill
var MathTrunc = Math.trunc || function (v) {
    return v < 0 ? Math.ceil(v) : Math.floor(v);
};

// https://heycam.github.io/webidl/#idl-dictionaries
function isDictionary(x) {
    return typeof x === 'object' || typeof x === 'function';
}
function assertDictionary(obj, context) {
    if (obj !== undefined && !isDictionary(obj)) {
        throw new TypeError("".concat(context, " is not an object."));
    }
}
// https://heycam.github.io/webidl/#idl-callback-functions
function assertFunction(x, context) {
    if (typeof x !== 'function') {
        throw new TypeError("".concat(context, " is not a function."));
    }
}
// https://heycam.github.io/webidl/#idl-object
function isObject(x) {
    return (typeof x === 'object' && x !== null) || typeof x === 'function';
}
function assertObject(x, context) {
    if (!isObject(x)) {
        throw new TypeError("".concat(context, " is not an object."));
    }
}
function assertRequiredArgument(x, position, context) {
    if (x === undefined) {
        throw new TypeError("Parameter ".concat(position, " is required in '").concat(context, "'."));
    }
}
function assertRequiredField(x, field, context) {
    if (x === undefined) {
        throw new TypeError("".concat(field, " is required in '").concat(context, "'."));
    }
}
// https://heycam.github.io/webidl/#idl-unrestricted-double
function convertUnrestrictedDouble(value) {
    return Number(value);
}
function censorNegativeZero(x) {
    return x === 0 ? 0 : x;
}
function integerPart(x) {
    return censorNegativeZero(MathTrunc(x));
}
// https://heycam.github.io/webidl/#idl-unsigned-long-long
function convertUnsignedLongLongWithEnforceRange(value, context) {
    var lowerBound = 0;
    var upperBound = Number.MAX_SAFE_INTEGER;
    var x = Number(value);
    x = censorNegativeZero(x);
    if (!NumberIsFinite(x)) {
        throw new TypeError("".concat(context, " is not a finite number"));
    }
    x = integerPart(x);
    if (x < lowerBound || x > upperBound) {
        throw new TypeError("".concat(context, " is outside the accepted range of ").concat(lowerBound, " to ").concat(upperBound, ", inclusive"));
    }
    if (!NumberIsFinite(x) || x === 0) {
        return 0;
    }
    // TODO Use BigInt if supported?
    // let xBigInt = BigInt(integerPart(x));
    // xBigInt = BigInt.asUintN(64, xBigInt);
    // return Number(xBigInt);
    return x;
}

function assertReadableStream(x, context) {
    if (!IsReadableStream(x)) {
        throw new TypeError("".concat(context, " is not a ReadableStream."));
    }
}

// Abstract operations for the ReadableStream.
function AcquireReadableStreamDefaultReader(stream) {
    return new ReadableStreamDefaultReader(stream);
}
// ReadableStream API exposed for controllers.
function ReadableStreamAddReadRequest(stream, readRequest) {
    stream._reader._readRequests.push(readRequest);
}
function ReadableStreamFulfillReadRequest(stream, chunk, done) {
    var reader = stream._reader;
    var readRequest = reader._readRequests.shift();
    if (done) {
        readRequest._closeSteps();
    }
    else {
        readRequest._chunkSteps(chunk);
    }
}
function ReadableStreamGetNumReadRequests(stream) {
    return stream._reader._readRequests.length;
}
function ReadableStreamHasDefaultReader(stream) {
    var reader = stream._reader;
    if (reader === undefined) {
        return false;
    }
    if (!IsReadableStreamDefaultReader(reader)) {
        return false;
    }
    return true;
}
/**
 * A default reader vended by a {@link ReadableStream}.
 *
 * @public
 */
var ReadableStreamDefaultReader = /** @class */ (function () {
    function ReadableStreamDefaultReader(stream) {
        assertRequiredArgument(stream, 1, 'ReadableStreamDefaultReader');
        assertReadableStream(stream, 'First parameter');
        if (IsReadableStreamLocked(stream)) {
            throw new TypeError('This stream has already been locked for exclusive reading by another reader');
        }
        ReadableStreamReaderGenericInitialize(this, stream);
        this._readRequests = new SimpleQueue();
    }
    Object.defineProperty(ReadableStreamDefaultReader.prototype, "closed", {
        /**
         * Returns a promise that will be fulfilled when the stream becomes closed,
         * or rejected if the stream ever errors or the reader's lock is released before the stream finishes closing.
         */
        get: function () {
            if (!IsReadableStreamDefaultReader(this)) {
                return promiseRejectedWith(defaultReaderBrandCheckException('closed'));
            }
            return this._closedPromise;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
     */
    ReadableStreamDefaultReader.prototype.cancel = function (reason) {
        if (reason === void 0) { reason = undefined; }
        if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException('cancel'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('cancel'));
        }
        return ReadableStreamReaderGenericCancel(this, reason);
    };
    /**
     * Returns a promise that allows access to the next chunk from the stream's internal queue, if available.
     *
     * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
     */
    ReadableStreamDefaultReader.prototype.read = function () {
        if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException('read'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('read from'));
        }
        var resolvePromise;
        var rejectPromise;
        var promise = newPromise(function (resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        var readRequest = {
            _chunkSteps: function (chunk) { return resolvePromise({ value: chunk, done: false }); },
            _closeSteps: function () { return resolvePromise({ value: undefined, done: true }); },
            _errorSteps: function (e) { return rejectPromise(e); }
        };
        ReadableStreamDefaultReaderRead(this, readRequest);
        return promise;
    };
    /**
     * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
     * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
     * from now on; otherwise, the reader will appear closed.
     *
     * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
     * the reader's {@link ReadableStreamDefaultReader.read | read()} method has not yet been settled. Attempting to
     * do so will throw a `TypeError` and leave the reader locked to the stream.
     */
    ReadableStreamDefaultReader.prototype.releaseLock = function () {
        if (!IsReadableStreamDefaultReader(this)) {
            throw defaultReaderBrandCheckException('releaseLock');
        }
        if (this._ownerReadableStream === undefined) {
            return;
        }
        ReadableStreamDefaultReaderRelease(this);
    };
    return ReadableStreamDefaultReader;
}());
Object.defineProperties(ReadableStreamDefaultReader.prototype, {
    cancel: { enumerable: true },
    read: { enumerable: true },
    releaseLock: { enumerable: true },
    closed: { enumerable: true }
});
setFunctionName(ReadableStreamDefaultReader.prototype.cancel, 'cancel');
setFunctionName(ReadableStreamDefaultReader.prototype.read, 'read');
setFunctionName(ReadableStreamDefaultReader.prototype.releaseLock, 'releaseLock');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableStreamDefaultReader',
        configurable: true
    });
}
// Abstract operations for the readers.
function IsReadableStreamDefaultReader(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_readRequests')) {
        return false;
    }
    return x instanceof ReadableStreamDefaultReader;
}
function ReadableStreamDefaultReaderRead(reader, readRequest) {
    var stream = reader._ownerReadableStream;
    stream._disturbed = true;
    if (stream._state === 'closed') {
        readRequest._closeSteps();
    }
    else if (stream._state === 'errored') {
        readRequest._errorSteps(stream._storedError);
    }
    else {
        stream._readableStreamController[PullSteps](readRequest);
    }
}
function ReadableStreamDefaultReaderRelease(reader) {
    ReadableStreamReaderGenericRelease(reader);
    var e = new TypeError('Reader was released');
    ReadableStreamDefaultReaderErrorReadRequests(reader, e);
}
function ReadableStreamDefaultReaderErrorReadRequests(reader, e) {
    var readRequests = reader._readRequests;
    reader._readRequests = new SimpleQueue();
    readRequests.forEach(function (readRequest) {
        readRequest._errorSteps(e);
    });
}
// Helper functions for the ReadableStreamDefaultReader.
function defaultReaderBrandCheckException(name) {
    return new TypeError("ReadableStreamDefaultReader.prototype.".concat(name, " can only be used on a ReadableStreamDefaultReader"));
}

var _a$1, _b, _c;
function CreateArrayFromList(elements) {
    // We use arrays to represent lists, so this is basically a no-op.
    // Do a slice though just in case we happen to depend on the unique-ness.
    return elements.slice();
}
function CopyDataBlockBytes(dest, destOffset, src, srcOffset, n) {
    new Uint8Array(dest).set(new Uint8Array(src, srcOffset, n), destOffset);
}
var TransferArrayBuffer = function (O) {
    if (typeof O.transfer === 'function') {
        TransferArrayBuffer = function (buffer) { return buffer.transfer(); };
    }
    else if (typeof structuredClone === 'function') {
        TransferArrayBuffer = function (buffer) { return structuredClone(buffer, { transfer: [buffer] }); };
    }
    else {
        // Not implemented correctly
        TransferArrayBuffer = function (buffer) { return buffer; };
    }
    return TransferArrayBuffer(O);
};
var IsDetachedBuffer = function (O) {
    if (typeof O.detached === 'boolean') {
        IsDetachedBuffer = function (buffer) { return buffer.detached; };
    }
    else {
        // Not implemented correctly
        IsDetachedBuffer = function (buffer) { return buffer.byteLength === 0; };
    }
    return IsDetachedBuffer(O);
};
function ArrayBufferSlice(buffer, begin, end) {
    // ArrayBuffer.prototype.slice is not available on IE10
    // https://www.caniuse.com/mdn-javascript_builtins_arraybuffer_slice
    if (buffer.slice) {
        return buffer.slice(begin, end);
    }
    var length = end - begin;
    var slice = new ArrayBuffer(length);
    CopyDataBlockBytes(slice, 0, buffer, begin, length);
    return slice;
}
function GetMethod(receiver, prop) {
    var func = receiver[prop];
    if (func === undefined || func === null) {
        return undefined;
    }
    if (typeof func !== 'function') {
        throw new TypeError("".concat(String(prop), " is not a function"));
    }
    return func;
}
function CreateAsyncFromSyncIterator(syncIteratorRecord) {
    // Instead of re-implementing CreateAsyncFromSyncIterator and %AsyncFromSyncIteratorPrototype%,
    // we use yield* inside an async generator function to achieve the same result.
    var _a;
    // Wrap the sync iterator inside a sync iterable, so we can use it with yield*.
    var syncIterable = (_a = {},
        _a[SymbolPolyfill.iterator] = function () { return syncIteratorRecord.iterator; },
        _a);
    // Create an async generator function and immediately invoke it.
    var asyncIterator = (function () {
        return __asyncGenerator(this, arguments, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(syncIterable)))];
                    case 1: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                    case 2: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }());
    // Return as an async iterator record.
    var nextMethod = asyncIterator.next;
    return { iterator: asyncIterator, nextMethod: nextMethod, done: false };
}
// Aligns with core-js/modules/es.symbol.async-iterator.js
var SymbolAsyncIterator = (_c = (_a$1 = SymbolPolyfill.asyncIterator) !== null && _a$1 !== void 0 ? _a$1 : (_b = SymbolPolyfill.for) === null || _b === void 0 ? void 0 : _b.call(SymbolPolyfill, 'Symbol.asyncIterator')) !== null && _c !== void 0 ? _c : '@@asyncIterator';
function GetIterator(obj, hint, method) {
    if (hint === void 0) { hint = 'sync'; }
    if (method === undefined) {
        if (hint === 'async') {
            method = GetMethod(obj, SymbolAsyncIterator);
            if (method === undefined) {
                var syncMethod = GetMethod(obj, SymbolPolyfill.iterator);
                var syncIteratorRecord = GetIterator(obj, 'sync', syncMethod);
                return CreateAsyncFromSyncIterator(syncIteratorRecord);
            }
        }
        else {
            method = GetMethod(obj, SymbolPolyfill.iterator);
        }
    }
    if (method === undefined) {
        throw new TypeError('The object is not iterable');
    }
    var iterator = reflectCall(method, obj, []);
    if (!typeIsObject(iterator)) {
        throw new TypeError('The iterator method must return an object');
    }
    var nextMethod = iterator.next;
    return { iterator: iterator, nextMethod: nextMethod, done: false };
}
function IteratorNext(iteratorRecord) {
    var result = reflectCall(iteratorRecord.nextMethod, iteratorRecord.iterator, []);
    if (!typeIsObject(result)) {
        throw new TypeError('The iterator.next() method must return an object');
    }
    return result;
}
function IteratorComplete(iterResult) {
    return Boolean(iterResult.done);
}
function IteratorValue(iterResult) {
    return iterResult.value;
}

/// <reference lib="es2018.asynciterable" />
var _a;
// We cannot access %AsyncIteratorPrototype% without non-ES2018 syntax, but we can re-create it.
var AsyncIteratorPrototype = (_a = {},
    // 25.1.3.1 %AsyncIteratorPrototype% [ @@asyncIterator ] ( )
    // https://tc39.github.io/ecma262/#sec-asynciteratorprototype-asynciterator
    _a[SymbolAsyncIterator] = function () {
        return this;
    },
    _a);
Object.defineProperty(AsyncIteratorPrototype, SymbolAsyncIterator, { enumerable: false });

/// <reference lib="es2018.asynciterable" />
var ReadableStreamAsyncIteratorImpl = /** @class */ (function () {
    function ReadableStreamAsyncIteratorImpl(reader, preventCancel) {
        this._ongoingPromise = undefined;
        this._isFinished = false;
        this._reader = reader;
        this._preventCancel = preventCancel;
    }
    ReadableStreamAsyncIteratorImpl.prototype.next = function () {
        var _this = this;
        var nextSteps = function () { return _this._nextSteps(); };
        this._ongoingPromise = this._ongoingPromise ?
            transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) :
            nextSteps();
        return this._ongoingPromise;
    };
    ReadableStreamAsyncIteratorImpl.prototype.return = function (value) {
        var _this = this;
        var returnSteps = function () { return _this._returnSteps(value); };
        return this._ongoingPromise ?
            transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) :
            returnSteps();
    };
    ReadableStreamAsyncIteratorImpl.prototype._nextSteps = function () {
        var _this = this;
        if (this._isFinished) {
            return Promise.resolve({ value: undefined, done: true });
        }
        var reader = this._reader;
        var resolvePromise;
        var rejectPromise;
        var promise = newPromise(function (resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        var readRequest = {
            _chunkSteps: function (chunk) {
                _this._ongoingPromise = undefined;
                // This needs to be delayed by one microtask, otherwise we stop pulling too early which breaks a test.
                // FIXME Is this a bug in the specification, or in the test?
                _queueMicrotask(function () { return resolvePromise({ value: chunk, done: false }); });
            },
            _closeSteps: function () {
                _this._ongoingPromise = undefined;
                _this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: undefined, done: true });
            },
            _errorSteps: function (reason) {
                _this._ongoingPromise = undefined;
                _this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
            }
        };
        ReadableStreamDefaultReaderRead(reader, readRequest);
        return promise;
    };
    ReadableStreamAsyncIteratorImpl.prototype._returnSteps = function (value) {
        if (this._isFinished) {
            return Promise.resolve({ value: value, done: true });
        }
        this._isFinished = true;
        var reader = this._reader;
        if (!this._preventCancel) {
            var result = ReadableStreamReaderGenericCancel(reader, value);
            ReadableStreamReaderGenericRelease(reader);
            return transformPromiseWith(result, function () { return ({ value: value, done: true }); });
        }
        ReadableStreamReaderGenericRelease(reader);
        return promiseResolvedWith({ value: value, done: true });
    };
    return ReadableStreamAsyncIteratorImpl;
}());
var ReadableStreamAsyncIteratorPrototype = {
    next: function () {
        if (!IsReadableStreamAsyncIterator(this)) {
            return promiseRejectedWith(streamAsyncIteratorBrandCheckException('next'));
        }
        return this._asyncIteratorImpl.next();
    },
    return: function (value) {
        if (!IsReadableStreamAsyncIterator(this)) {
            return promiseRejectedWith(streamAsyncIteratorBrandCheckException('return'));
        }
        return this._asyncIteratorImpl.return(value);
    }
};
Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
// Abstract operations for the ReadableStream.
function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
    var reader = AcquireReadableStreamDefaultReader(stream);
    var impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
    var iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
    iterator._asyncIteratorImpl = impl;
    return iterator;
}
function IsReadableStreamAsyncIterator(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_asyncIteratorImpl')) {
        return false;
    }
    try {
        // noinspection SuspiciousTypeOfGuard
        return x._asyncIteratorImpl instanceof
            ReadableStreamAsyncIteratorImpl;
    }
    catch (_a) {
        return false;
    }
}
// Helper functions for the ReadableStream.
function streamAsyncIteratorBrandCheckException(name) {
    return new TypeError("ReadableStreamAsyncIterator.".concat(name, " can only be used on a ReadableSteamAsyncIterator"));
}

/// <reference lib="es2015.core" />
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN#Polyfill
var NumberIsNaN = Number.isNaN || function (x) {
    // eslint-disable-next-line no-self-compare
    return x !== x;
};

function IsNonNegativeNumber(v) {
    if (typeof v !== 'number') {
        return false;
    }
    if (NumberIsNaN(v)) {
        return false;
    }
    if (v < 0) {
        return false;
    }
    return true;
}
function CloneAsUint8Array(O) {
    var buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
    return new Uint8Array(buffer);
}

function DequeueValue(container) {
    var pair = container._queue.shift();
    container._queueTotalSize -= pair.size;
    if (container._queueTotalSize < 0) {
        container._queueTotalSize = 0;
    }
    return pair.value;
}
function EnqueueValueWithSize(container, value, size) {
    if (!IsNonNegativeNumber(size) || size === Infinity) {
        throw new RangeError('Size must be a finite, non-NaN, non-negative number.');
    }
    container._queue.push({ value: value, size: size });
    container._queueTotalSize += size;
}
function PeekQueueValue(container) {
    var pair = container._queue.peek();
    return pair.value;
}
function ResetQueue(container) {
    container._queue = new SimpleQueue();
    container._queueTotalSize = 0;
}

function isDataViewConstructor(ctor) {
    return ctor === DataView;
}
function isDataView(view) {
    return isDataViewConstructor(view.constructor);
}
function arrayBufferViewElementSize(ctor) {
    if (isDataViewConstructor(ctor)) {
        return 1;
    }
    return ctor.BYTES_PER_ELEMENT;
}

/**
 * A pull-into request in a {@link ReadableByteStreamController}.
 *
 * @public
 */
var ReadableStreamBYOBRequest = /** @class */ (function () {
    function ReadableStreamBYOBRequest() {
        throw new TypeError('Illegal constructor');
    }
    Object.defineProperty(ReadableStreamBYOBRequest.prototype, "view", {
        /**
         * Returns the view for writing in to, or `null` if the BYOB request has already been responded to.
         */
        get: function () {
            if (!IsReadableStreamBYOBRequest(this)) {
                throw byobRequestBrandCheckException('view');
            }
            return this._view;
        },
        enumerable: false,
        configurable: true
    });
    ReadableStreamBYOBRequest.prototype.respond = function (bytesWritten) {
        if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException('respond');
        }
        assertRequiredArgument(bytesWritten, 1, 'respond');
        bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, 'First parameter');
        if (this._associatedReadableByteStreamController === undefined) {
            throw new TypeError('This BYOB request has been invalidated');
        }
        if (IsDetachedBuffer(this._view.buffer)) {
            throw new TypeError("The BYOB request's buffer has been detached and so cannot be used as a response");
        }
        ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
    };
    ReadableStreamBYOBRequest.prototype.respondWithNewView = function (view) {
        if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException('respondWithNewView');
        }
        assertRequiredArgument(view, 1, 'respondWithNewView');
        if (!ArrayBuffer.isView(view)) {
            throw new TypeError('You can only respond with array buffer views');
        }
        if (this._associatedReadableByteStreamController === undefined) {
            throw new TypeError('This BYOB request has been invalidated');
        }
        if (IsDetachedBuffer(view.buffer)) {
            throw new TypeError('The given view\'s buffer has been detached and so cannot be used as a response');
        }
        ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
    };
    return ReadableStreamBYOBRequest;
}());
Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
    respond: { enumerable: true },
    respondWithNewView: { enumerable: true },
    view: { enumerable: true }
});
setFunctionName(ReadableStreamBYOBRequest.prototype.respond, 'respond');
setFunctionName(ReadableStreamBYOBRequest.prototype.respondWithNewView, 'respondWithNewView');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableStreamBYOBRequest',
        configurable: true
    });
}
/**
 * Allows control of a {@link ReadableStream | readable byte stream}'s state and internal queue.
 *
 * @public
 */
var ReadableByteStreamController = /** @class */ (function () {
    function ReadableByteStreamController() {
        throw new TypeError('Illegal constructor');
    }
    Object.defineProperty(ReadableByteStreamController.prototype, "byobRequest", {
        /**
         * Returns the current BYOB pull request, or `null` if there isn't one.
         */
        get: function () {
            if (!IsReadableByteStreamController(this)) {
                throw byteStreamControllerBrandCheckException('byobRequest');
            }
            return ReadableByteStreamControllerGetBYOBRequest(this);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ReadableByteStreamController.prototype, "desiredSize", {
        /**
         * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
         * over-full. An underlying byte source ought to use this information to determine when and how to apply backpressure.
         */
        get: function () {
            if (!IsReadableByteStreamController(this)) {
                throw byteStreamControllerBrandCheckException('desiredSize');
            }
            return ReadableByteStreamControllerGetDesiredSize(this);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
     * the stream, but once those are read, the stream will become closed.
     */
    ReadableByteStreamController.prototype.close = function () {
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('close');
        }
        if (this._closeRequested) {
            throw new TypeError('The stream has already been closed; do not close it again!');
        }
        var state = this._controlledReadableByteStream._state;
        if (state !== 'readable') {
            throw new TypeError("The stream (in ".concat(state, " state) is not in the readable state and cannot be closed"));
        }
        ReadableByteStreamControllerClose(this);
    };
    ReadableByteStreamController.prototype.enqueue = function (chunk) {
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('enqueue');
        }
        assertRequiredArgument(chunk, 1, 'enqueue');
        if (!ArrayBuffer.isView(chunk)) {
            throw new TypeError('chunk must be an array buffer view');
        }
        if (chunk.byteLength === 0) {
            throw new TypeError('chunk must have non-zero byteLength');
        }
        if (chunk.buffer.byteLength === 0) {
            throw new TypeError("chunk's buffer must have non-zero byteLength");
        }
        if (this._closeRequested) {
            throw new TypeError('stream is closed or draining');
        }
        var state = this._controlledReadableByteStream._state;
        if (state !== 'readable') {
            throw new TypeError("The stream (in ".concat(state, " state) is not in the readable state and cannot be enqueued to"));
        }
        ReadableByteStreamControllerEnqueue(this, chunk);
    };
    /**
     * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
     */
    ReadableByteStreamController.prototype.error = function (e) {
        if (e === void 0) { e = undefined; }
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('error');
        }
        ReadableByteStreamControllerError(this, e);
    };
    /** @internal */
    ReadableByteStreamController.prototype[CancelSteps] = function (reason) {
        ReadableByteStreamControllerClearPendingPullIntos(this);
        ResetQueue(this);
        var result = this._cancelAlgorithm(reason);
        ReadableByteStreamControllerClearAlgorithms(this);
        return result;
    };
    /** @internal */
    ReadableByteStreamController.prototype[PullSteps] = function (readRequest) {
        var stream = this._controlledReadableByteStream;
        if (this._queueTotalSize > 0) {
            ReadableByteStreamControllerFillReadRequestFromQueue(this, readRequest);
            return;
        }
        var autoAllocateChunkSize = this._autoAllocateChunkSize;
        if (autoAllocateChunkSize !== undefined) {
            var buffer = void 0;
            try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
            }
            catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
            }
            var pullIntoDescriptor = {
                buffer: buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                minimumFill: 1,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: 'default'
            };
            this._pendingPullIntos.push(pullIntoDescriptor);
        }
        ReadableStreamAddReadRequest(stream, readRequest);
        ReadableByteStreamControllerCallPullIfNeeded(this);
    };
    /** @internal */
    ReadableByteStreamController.prototype[ReleaseSteps] = function () {
        if (this._pendingPullIntos.length > 0) {
            var firstPullInto = this._pendingPullIntos.peek();
            firstPullInto.readerType = 'none';
            this._pendingPullIntos = new SimpleQueue();
            this._pendingPullIntos.push(firstPullInto);
        }
    };
    return ReadableByteStreamController;
}());
Object.defineProperties(ReadableByteStreamController.prototype, {
    close: { enumerable: true },
    enqueue: { enumerable: true },
    error: { enumerable: true },
    byobRequest: { enumerable: true },
    desiredSize: { enumerable: true }
});
setFunctionName(ReadableByteStreamController.prototype.close, 'close');
setFunctionName(ReadableByteStreamController.prototype.enqueue, 'enqueue');
setFunctionName(ReadableByteStreamController.prototype.error, 'error');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableByteStreamController',
        configurable: true
    });
}
// Abstract operations for the ReadableByteStreamController.
function IsReadableByteStreamController(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_controlledReadableByteStream')) {
        return false;
    }
    return x instanceof ReadableByteStreamController;
}
function IsReadableStreamBYOBRequest(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_associatedReadableByteStreamController')) {
        return false;
    }
    return x instanceof ReadableStreamBYOBRequest;
}
function ReadableByteStreamControllerCallPullIfNeeded(controller) {
    var shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
    if (!shouldPull) {
        return;
    }
    if (controller._pulling) {
        controller._pullAgain = true;
        return;
    }
    controller._pulling = true;
    // TODO: Test controller argument
    var pullPromise = controller._pullAlgorithm();
    uponPromise(pullPromise, function () {
        controller._pulling = false;
        if (controller._pullAgain) {
            controller._pullAgain = false;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        return null;
    }, function (e) {
        ReadableByteStreamControllerError(controller, e);
        return null;
    });
}
function ReadableByteStreamControllerClearPendingPullIntos(controller) {
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    controller._pendingPullIntos = new SimpleQueue();
}
function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
    var done = false;
    if (stream._state === 'closed') {
        done = true;
    }
    var filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
    if (pullIntoDescriptor.readerType === 'default') {
        ReadableStreamFulfillReadRequest(stream, filledView, done);
    }
    else {
        ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
    }
}
function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
    var bytesFilled = pullIntoDescriptor.bytesFilled;
    var elementSize = pullIntoDescriptor.elementSize;
    return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
}
function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
    controller._queue.push({ buffer: buffer, byteOffset: byteOffset, byteLength: byteLength });
    controller._queueTotalSize += byteLength;
}
function ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, buffer, byteOffset, byteLength) {
    var clonedChunk;
    try {
        clonedChunk = ArrayBufferSlice(buffer, byteOffset, byteOffset + byteLength);
    }
    catch (cloneE) {
        ReadableByteStreamControllerError(controller, cloneE);
        throw cloneE;
    }
    ReadableByteStreamControllerEnqueueChunkToQueue(controller, clonedChunk, 0, byteLength);
}
function ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, firstDescriptor) {
    if (firstDescriptor.bytesFilled > 0) {
        ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, firstDescriptor.buffer, firstDescriptor.byteOffset, firstDescriptor.bytesFilled);
    }
    ReadableByteStreamControllerShiftPendingPullInto(controller);
}
function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
    var maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
    var maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
    var totalBytesToCopyRemaining = maxBytesToCopy;
    var ready = false;
    var remainderBytes = maxBytesFilled % pullIntoDescriptor.elementSize;
    var maxAlignedBytes = maxBytesFilled - remainderBytes;
    // A descriptor for a read() request that is not yet filled up to its minimum length will stay at the head
    // of the queue, so the underlying source can keep filling it.
    if (maxAlignedBytes >= pullIntoDescriptor.minimumFill) {
        totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
        ready = true;
    }
    var queue = controller._queue;
    while (totalBytesToCopyRemaining > 0) {
        var headOfQueue = queue.peek();
        var bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
        var destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
        CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
        if (headOfQueue.byteLength === bytesToCopy) {
            queue.shift();
        }
        else {
            headOfQueue.byteOffset += bytesToCopy;
            headOfQueue.byteLength -= bytesToCopy;
        }
        controller._queueTotalSize -= bytesToCopy;
        ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
        totalBytesToCopyRemaining -= bytesToCopy;
    }
    return ready;
}
function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
    pullIntoDescriptor.bytesFilled += size;
}
function ReadableByteStreamControllerHandleQueueDrain(controller) {
    if (controller._queueTotalSize === 0 && controller._closeRequested) {
        ReadableByteStreamControllerClearAlgorithms(controller);
        ReadableStreamClose(controller._controlledReadableByteStream);
    }
    else {
        ReadableByteStreamControllerCallPullIfNeeded(controller);
    }
}
function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
    if (controller._byobRequest === null) {
        return;
    }
    controller._byobRequest._associatedReadableByteStreamController = undefined;
    controller._byobRequest._view = null;
    controller._byobRequest = null;
}
function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
    while (controller._pendingPullIntos.length > 0) {
        if (controller._queueTotalSize === 0) {
            return;
        }
        var pullIntoDescriptor = controller._pendingPullIntos.peek();
        if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
            ReadableByteStreamControllerShiftPendingPullInto(controller);
            ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
        }
    }
}
function ReadableByteStreamControllerProcessReadRequestsUsingQueue(controller) {
    var reader = controller._controlledReadableByteStream._reader;
    while (reader._readRequests.length > 0) {
        if (controller._queueTotalSize === 0) {
            return;
        }
        var readRequest = reader._readRequests.shift();
        ReadableByteStreamControllerFillReadRequestFromQueue(controller, readRequest);
    }
}
function ReadableByteStreamControllerPullInto(controller, view, min, readIntoRequest) {
    var stream = controller._controlledReadableByteStream;
    var ctor = view.constructor;
    var elementSize = arrayBufferViewElementSize(ctor);
    var byteOffset = view.byteOffset, byteLength = view.byteLength;
    var minimumFill = min * elementSize;
    var buffer;
    try {
        buffer = TransferArrayBuffer(view.buffer);
    }
    catch (e) {
        readIntoRequest._errorSteps(e);
        return;
    }
    var pullIntoDescriptor = {
        buffer: buffer,
        bufferByteLength: buffer.byteLength,
        byteOffset: byteOffset,
        byteLength: byteLength,
        bytesFilled: 0,
        minimumFill: minimumFill,
        elementSize: elementSize,
        viewConstructor: ctor,
        readerType: 'byob'
    };
    if (controller._pendingPullIntos.length > 0) {
        controller._pendingPullIntos.push(pullIntoDescriptor);
        // No ReadableByteStreamControllerCallPullIfNeeded() call since:
        // - No change happens on desiredSize
        // - The source has already been notified of that there's at least 1 pending read(view)
        ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
        return;
    }
    if (stream._state === 'closed') {
        var emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
        readIntoRequest._closeSteps(emptyView);
        return;
    }
    if (controller._queueTotalSize > 0) {
        if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
            var filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
            ReadableByteStreamControllerHandleQueueDrain(controller);
            readIntoRequest._chunkSteps(filledView);
            return;
        }
        if (controller._closeRequested) {
            var e = new TypeError('Insufficient bytes to fill elements in the given buffer');
            ReadableByteStreamControllerError(controller, e);
            readIntoRequest._errorSteps(e);
            return;
        }
    }
    controller._pendingPullIntos.push(pullIntoDescriptor);
    ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
    ReadableByteStreamControllerCallPullIfNeeded(controller);
}
function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
    if (firstDescriptor.readerType === 'none') {
        ReadableByteStreamControllerShiftPendingPullInto(controller);
    }
    var stream = controller._controlledReadableByteStream;
    if (ReadableStreamHasBYOBReader(stream)) {
        while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            var pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
            ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
        }
    }
}
function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
    ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
    if (pullIntoDescriptor.readerType === 'none') {
        ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, pullIntoDescriptor);
        ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        return;
    }
    if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.minimumFill) {
        // A descriptor for a read() request that is not yet filled up to its minimum length will stay at the head
        // of the queue, so the underlying source can keep filling it.
        return;
    }
    ReadableByteStreamControllerShiftPendingPullInto(controller);
    var remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
    if (remainderSize > 0) {
        var end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
        ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, pullIntoDescriptor.buffer, end - remainderSize, remainderSize);
    }
    pullIntoDescriptor.bytesFilled -= remainderSize;
    ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
    ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
}
function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
    var firstDescriptor = controller._pendingPullIntos.peek();
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    var state = controller._controlledReadableByteStream._state;
    if (state === 'closed') {
        ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor);
    }
    else {
        ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
    }
    ReadableByteStreamControllerCallPullIfNeeded(controller);
}
function ReadableByteStreamControllerShiftPendingPullInto(controller) {
    var descriptor = controller._pendingPullIntos.shift();
    return descriptor;
}
function ReadableByteStreamControllerShouldCallPull(controller) {
    var stream = controller._controlledReadableByteStream;
    if (stream._state !== 'readable') {
        return false;
    }
    if (controller._closeRequested) {
        return false;
    }
    if (!controller._started) {
        return false;
    }
    if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
        return true;
    }
    if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
        return true;
    }
    var desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
    if (desiredSize > 0) {
        return true;
    }
    return false;
}
function ReadableByteStreamControllerClearAlgorithms(controller) {
    controller._pullAlgorithm = undefined;
    controller._cancelAlgorithm = undefined;
}
// A client of ReadableByteStreamController may use these functions directly to bypass state check.
function ReadableByteStreamControllerClose(controller) {
    var stream = controller._controlledReadableByteStream;
    if (controller._closeRequested || stream._state !== 'readable') {
        return;
    }
    if (controller._queueTotalSize > 0) {
        controller._closeRequested = true;
        return;
    }
    if (controller._pendingPullIntos.length > 0) {
        var firstPendingPullInto = controller._pendingPullIntos.peek();
        if (firstPendingPullInto.bytesFilled % firstPendingPullInto.elementSize !== 0) {
            var e = new TypeError('Insufficient bytes to fill elements in the given buffer');
            ReadableByteStreamControllerError(controller, e);
            throw e;
        }
    }
    ReadableByteStreamControllerClearAlgorithms(controller);
    ReadableStreamClose(stream);
}
function ReadableByteStreamControllerEnqueue(controller, chunk) {
    var stream = controller._controlledReadableByteStream;
    if (controller._closeRequested || stream._state !== 'readable') {
        return;
    }
    var buffer = chunk.buffer, byteOffset = chunk.byteOffset, byteLength = chunk.byteLength;
    if (IsDetachedBuffer(buffer)) {
        throw new TypeError('chunk\'s buffer is detached and so cannot be enqueued');
    }
    var transferredBuffer = TransferArrayBuffer(buffer);
    if (controller._pendingPullIntos.length > 0) {
        var firstPendingPullInto = controller._pendingPullIntos.peek();
        if (IsDetachedBuffer(firstPendingPullInto.buffer)) {
            throw new TypeError('The BYOB request\'s buffer has been detached and so cannot be filled with an enqueued chunk');
        }
        ReadableByteStreamControllerInvalidateBYOBRequest(controller);
        firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
        if (firstPendingPullInto.readerType === 'none') {
            ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, firstPendingPullInto);
        }
    }
    if (ReadableStreamHasDefaultReader(stream)) {
        ReadableByteStreamControllerProcessReadRequestsUsingQueue(controller);
        if (ReadableStreamGetNumReadRequests(stream) === 0) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
        }
        else {
            if (controller._pendingPullIntos.length > 0) {
                ReadableByteStreamControllerShiftPendingPullInto(controller);
            }
            var transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
            ReadableStreamFulfillReadRequest(stream, transferredView, false);
        }
    }
    else if (ReadableStreamHasBYOBReader(stream)) {
        // TODO: Ideally in this branch detaching should happen only if the buffer is not consumed fully.
        ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
        ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
    }
    else {
        ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
    }
    ReadableByteStreamControllerCallPullIfNeeded(controller);
}
function ReadableByteStreamControllerError(controller, e) {
    var stream = controller._controlledReadableByteStream;
    if (stream._state !== 'readable') {
        return;
    }
    ReadableByteStreamControllerClearPendingPullIntos(controller);
    ResetQueue(controller);
    ReadableByteStreamControllerClearAlgorithms(controller);
    ReadableStreamError(stream, e);
}
function ReadableByteStreamControllerFillReadRequestFromQueue(controller, readRequest) {
    var entry = controller._queue.shift();
    controller._queueTotalSize -= entry.byteLength;
    ReadableByteStreamControllerHandleQueueDrain(controller);
    var view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
    readRequest._chunkSteps(view);
}
function ReadableByteStreamControllerGetBYOBRequest(controller) {
    if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
        var firstDescriptor = controller._pendingPullIntos.peek();
        var view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
        var byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
        SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
        controller._byobRequest = byobRequest;
    }
    return controller._byobRequest;
}
function ReadableByteStreamControllerGetDesiredSize(controller) {
    var state = controller._controlledReadableByteStream._state;
    if (state === 'errored') {
        return null;
    }
    if (state === 'closed') {
        return 0;
    }
    return controller._strategyHWM - controller._queueTotalSize;
}
function ReadableByteStreamControllerRespond(controller, bytesWritten) {
    var firstDescriptor = controller._pendingPullIntos.peek();
    var state = controller._controlledReadableByteStream._state;
    if (state === 'closed') {
        if (bytesWritten !== 0) {
            throw new TypeError('bytesWritten must be 0 when calling respond() on a closed stream');
        }
    }
    else {
        if (bytesWritten === 0) {
            throw new TypeError('bytesWritten must be greater than 0 when calling respond() on a readable stream');
        }
        if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
            throw new RangeError('bytesWritten out of range');
        }
    }
    firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
    ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
}
function ReadableByteStreamControllerRespondWithNewView(controller, view) {
    var firstDescriptor = controller._pendingPullIntos.peek();
    var state = controller._controlledReadableByteStream._state;
    if (state === 'closed') {
        if (view.byteLength !== 0) {
            throw new TypeError('The view\'s length must be 0 when calling respondWithNewView() on a closed stream');
        }
    }
    else {
        if (view.byteLength === 0) {
            throw new TypeError('The view\'s length must be greater than 0 when calling respondWithNewView() on a readable stream');
        }
    }
    if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
        throw new RangeError('The region specified by view does not match byobRequest');
    }
    if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
        throw new RangeError('The buffer of view has different capacity than byobRequest');
    }
    if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
        throw new RangeError('The region specified by view is larger than byobRequest');
    }
    var viewByteLength = view.byteLength;
    firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
    ReadableByteStreamControllerRespondInternal(controller, viewByteLength);
}
function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
    controller._controlledReadableByteStream = stream;
    controller._pullAgain = false;
    controller._pulling = false;
    controller._byobRequest = null;
    // Need to set the slots so that the assert doesn't fire. In the spec the slots already exist implicitly.
    controller._queue = controller._queueTotalSize = undefined;
    ResetQueue(controller);
    controller._closeRequested = false;
    controller._started = false;
    controller._strategyHWM = highWaterMark;
    controller._pullAlgorithm = pullAlgorithm;
    controller._cancelAlgorithm = cancelAlgorithm;
    controller._autoAllocateChunkSize = autoAllocateChunkSize;
    controller._pendingPullIntos = new SimpleQueue();
    stream._readableStreamController = controller;
    var startResult = startAlgorithm();
    uponPromise(promiseResolvedWith(startResult), function () {
        controller._started = true;
        ReadableByteStreamControllerCallPullIfNeeded(controller);
        return null;
    }, function (r) {
        ReadableByteStreamControllerError(controller, r);
        return null;
    });
}
function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
    var controller = Object.create(ReadableByteStreamController.prototype);
    var startAlgorithm;
    var pullAlgorithm;
    var cancelAlgorithm;
    if (underlyingByteSource.start !== undefined) {
        startAlgorithm = function () { return underlyingByteSource.start(controller); };
    }
    else {
        startAlgorithm = function () { return undefined; };
    }
    if (underlyingByteSource.pull !== undefined) {
        pullAlgorithm = function () { return underlyingByteSource.pull(controller); };
    }
    else {
        pullAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    if (underlyingByteSource.cancel !== undefined) {
        cancelAlgorithm = function (reason) { return underlyingByteSource.cancel(reason); };
    }
    else {
        cancelAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    var autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
    if (autoAllocateChunkSize === 0) {
        throw new TypeError('autoAllocateChunkSize must be greater than 0');
    }
    SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
}
function SetUpReadableStreamBYOBRequest(request, controller, view) {
    request._associatedReadableByteStreamController = controller;
    request._view = view;
}
// Helper functions for the ReadableStreamBYOBRequest.
function byobRequestBrandCheckException(name) {
    return new TypeError("ReadableStreamBYOBRequest.prototype.".concat(name, " can only be used on a ReadableStreamBYOBRequest"));
}
// Helper functions for the ReadableByteStreamController.
function byteStreamControllerBrandCheckException(name) {
    return new TypeError("ReadableByteStreamController.prototype.".concat(name, " can only be used on a ReadableByteStreamController"));
}

function convertReaderOptions(options, context) {
    assertDictionary(options, context);
    var mode = options === null || options === void 0 ? void 0 : options.mode;
    return {
        mode: mode === undefined ? undefined : convertReadableStreamReaderMode(mode, "".concat(context, " has member 'mode' that"))
    };
}
function convertReadableStreamReaderMode(mode, context) {
    mode = "".concat(mode);
    if (mode !== 'byob') {
        throw new TypeError("".concat(context, " '").concat(mode, "' is not a valid enumeration value for ReadableStreamReaderMode"));
    }
    return mode;
}
function convertByobReadOptions(options, context) {
    var _a;
    assertDictionary(options, context);
    var min = (_a = options === null || options === void 0 ? void 0 : options.min) !== null && _a !== void 0 ? _a : 1;
    return {
        min: convertUnsignedLongLongWithEnforceRange(min, "".concat(context, " has member 'min' that"))
    };
}

// Abstract operations for the ReadableStream.
function AcquireReadableStreamBYOBReader(stream) {
    return new ReadableStreamBYOBReader(stream);
}
// ReadableStream API exposed for controllers.
function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
    stream._reader._readIntoRequests.push(readIntoRequest);
}
function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
    var reader = stream._reader;
    var readIntoRequest = reader._readIntoRequests.shift();
    if (done) {
        readIntoRequest._closeSteps(chunk);
    }
    else {
        readIntoRequest._chunkSteps(chunk);
    }
}
function ReadableStreamGetNumReadIntoRequests(stream) {
    return stream._reader._readIntoRequests.length;
}
function ReadableStreamHasBYOBReader(stream) {
    var reader = stream._reader;
    if (reader === undefined) {
        return false;
    }
    if (!IsReadableStreamBYOBReader(reader)) {
        return false;
    }
    return true;
}
/**
 * A BYOB reader vended by a {@link ReadableStream}.
 *
 * @public
 */
var ReadableStreamBYOBReader = /** @class */ (function () {
    function ReadableStreamBYOBReader(stream) {
        assertRequiredArgument(stream, 1, 'ReadableStreamBYOBReader');
        assertReadableStream(stream, 'First parameter');
        if (IsReadableStreamLocked(stream)) {
            throw new TypeError('This stream has already been locked for exclusive reading by another reader');
        }
        if (!IsReadableByteStreamController(stream._readableStreamController)) {
            throw new TypeError('Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte ' +
                'source');
        }
        ReadableStreamReaderGenericInitialize(this, stream);
        this._readIntoRequests = new SimpleQueue();
    }
    Object.defineProperty(ReadableStreamBYOBReader.prototype, "closed", {
        /**
         * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
         * the reader's lock is released before the stream finishes closing.
         */
        get: function () {
            if (!IsReadableStreamBYOBReader(this)) {
                return promiseRejectedWith(byobReaderBrandCheckException('closed'));
            }
            return this._closedPromise;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
     */
    ReadableStreamBYOBReader.prototype.cancel = function (reason) {
        if (reason === void 0) { reason = undefined; }
        if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException('cancel'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('cancel'));
        }
        return ReadableStreamReaderGenericCancel(this, reason);
    };
    ReadableStreamBYOBReader.prototype.read = function (view, rawOptions) {
        if (rawOptions === void 0) { rawOptions = {}; }
        if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException('read'));
        }
        if (!ArrayBuffer.isView(view)) {
            return promiseRejectedWith(new TypeError('view must be an array buffer view'));
        }
        if (view.byteLength === 0) {
            return promiseRejectedWith(new TypeError('view must have non-zero byteLength'));
        }
        if (view.buffer.byteLength === 0) {
            return promiseRejectedWith(new TypeError("view's buffer must have non-zero byteLength"));
        }
        if (IsDetachedBuffer(view.buffer)) {
            return promiseRejectedWith(new TypeError('view\'s buffer has been detached'));
        }
        var options;
        try {
            options = convertByobReadOptions(rawOptions, 'options');
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
        var min = options.min;
        if (min === 0) {
            return promiseRejectedWith(new TypeError('options.min must be greater than 0'));
        }
        if (!isDataView(view)) {
            if (min > view.length) {
                return promiseRejectedWith(new RangeError('options.min must be less than or equal to view\'s length'));
            }
        }
        else if (min > view.byteLength) {
            return promiseRejectedWith(new RangeError('options.min must be less than or equal to view\'s byteLength'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('read from'));
        }
        var resolvePromise;
        var rejectPromise;
        var promise = newPromise(function (resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        var readIntoRequest = {
            _chunkSteps: function (chunk) { return resolvePromise({ value: chunk, done: false }); },
            _closeSteps: function (chunk) { return resolvePromise({ value: chunk, done: true }); },
            _errorSteps: function (e) { return rejectPromise(e); }
        };
        ReadableStreamBYOBReaderRead(this, view, min, readIntoRequest);
        return promise;
    };
    /**
     * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
     * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
     * from now on; otherwise, the reader will appear closed.
     *
     * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
     * the reader's {@link ReadableStreamBYOBReader.read | read()} method has not yet been settled. Attempting to
     * do so will throw a `TypeError` and leave the reader locked to the stream.
     */
    ReadableStreamBYOBReader.prototype.releaseLock = function () {
        if (!IsReadableStreamBYOBReader(this)) {
            throw byobReaderBrandCheckException('releaseLock');
        }
        if (this._ownerReadableStream === undefined) {
            return;
        }
        ReadableStreamBYOBReaderRelease(this);
    };
    return ReadableStreamBYOBReader;
}());
Object.defineProperties(ReadableStreamBYOBReader.prototype, {
    cancel: { enumerable: true },
    read: { enumerable: true },
    releaseLock: { enumerable: true },
    closed: { enumerable: true }
});
setFunctionName(ReadableStreamBYOBReader.prototype.cancel, 'cancel');
setFunctionName(ReadableStreamBYOBReader.prototype.read, 'read');
setFunctionName(ReadableStreamBYOBReader.prototype.releaseLock, 'releaseLock');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableStreamBYOBReader',
        configurable: true
    });
}
// Abstract operations for the readers.
function IsReadableStreamBYOBReader(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_readIntoRequests')) {
        return false;
    }
    return x instanceof ReadableStreamBYOBReader;
}
function ReadableStreamBYOBReaderRead(reader, view, min, readIntoRequest) {
    var stream = reader._ownerReadableStream;
    stream._disturbed = true;
    if (stream._state === 'errored') {
        readIntoRequest._errorSteps(stream._storedError);
    }
    else {
        ReadableByteStreamControllerPullInto(stream._readableStreamController, view, min, readIntoRequest);
    }
}
function ReadableStreamBYOBReaderRelease(reader) {
    ReadableStreamReaderGenericRelease(reader);
    var e = new TypeError('Reader was released');
    ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e);
}
function ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e) {
    var readIntoRequests = reader._readIntoRequests;
    reader._readIntoRequests = new SimpleQueue();
    readIntoRequests.forEach(function (readIntoRequest) {
        readIntoRequest._errorSteps(e);
    });
}
// Helper functions for the ReadableStreamBYOBReader.
function byobReaderBrandCheckException(name) {
    return new TypeError("ReadableStreamBYOBReader.prototype.".concat(name, " can only be used on a ReadableStreamBYOBReader"));
}

function ExtractHighWaterMark(strategy, defaultHWM) {
    var highWaterMark = strategy.highWaterMark;
    if (highWaterMark === undefined) {
        return defaultHWM;
    }
    if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
        throw new RangeError('Invalid highWaterMark');
    }
    return highWaterMark;
}
function ExtractSizeAlgorithm(strategy) {
    var size = strategy.size;
    if (!size) {
        return function () { return 1; };
    }
    return size;
}

function convertQueuingStrategy(init, context) {
    assertDictionary(init, context);
    var highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
    var size = init === null || init === void 0 ? void 0 : init.size;
    return {
        highWaterMark: highWaterMark === undefined ? undefined : convertUnrestrictedDouble(highWaterMark),
        size: size === undefined ? undefined : convertQueuingStrategySize(size, "".concat(context, " has member 'size' that"))
    };
}
function convertQueuingStrategySize(fn, context) {
    assertFunction(fn, context);
    return function (chunk) { return convertUnrestrictedDouble(fn(chunk)); };
}

function convertUnderlyingSink(original, context) {
    assertDictionary(original, context);
    var abort = original === null || original === void 0 ? void 0 : original.abort;
    var close = original === null || original === void 0 ? void 0 : original.close;
    var start = original === null || original === void 0 ? void 0 : original.start;
    var type = original === null || original === void 0 ? void 0 : original.type;
    var write = original === null || original === void 0 ? void 0 : original.write;
    return {
        abort: abort === undefined ?
            undefined :
            convertUnderlyingSinkAbortCallback(abort, original, "".concat(context, " has member 'abort' that")),
        close: close === undefined ?
            undefined :
            convertUnderlyingSinkCloseCallback(close, original, "".concat(context, " has member 'close' that")),
        start: start === undefined ?
            undefined :
            convertUnderlyingSinkStartCallback(start, original, "".concat(context, " has member 'start' that")),
        write: write === undefined ?
            undefined :
            convertUnderlyingSinkWriteCallback(write, original, "".concat(context, " has member 'write' that")),
        type: type
    };
}
function convertUnderlyingSinkAbortCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (reason) { return promiseCall(fn, original, [reason]); };
}
function convertUnderlyingSinkCloseCallback(fn, original, context) {
    assertFunction(fn, context);
    return function () { return promiseCall(fn, original, []); };
}
function convertUnderlyingSinkStartCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (controller) { return reflectCall(fn, original, [controller]); };
}
function convertUnderlyingSinkWriteCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (chunk, controller) { return promiseCall(fn, original, [chunk, controller]); };
}

function assertWritableStream(x, context) {
    if (!IsWritableStream(x)) {
        throw new TypeError("".concat(context, " is not a WritableStream."));
    }
}

function isAbortSignal(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    try {
        return typeof value.aborted === 'boolean';
    }
    catch (_a) {
        // AbortSignal.prototype.aborted throws if its brand check fails
        return false;
    }
}
var supportsAbortController = typeof AbortController === 'function';
/**
 * Construct a new AbortController, if supported by the platform.
 *
 * @internal
 */
function createAbortController() {
    if (supportsAbortController) {
        return new AbortController();
    }
    return undefined;
}

/**
 * A writable stream represents a destination for data, into which you can write.
 *
 * @public
 */
var WritableStream = /** @class */ (function () {
    function WritableStream(rawUnderlyingSink, rawStrategy) {
        if (rawUnderlyingSink === void 0) { rawUnderlyingSink = {}; }
        if (rawStrategy === void 0) { rawStrategy = {}; }
        if (rawUnderlyingSink === undefined) {
            rawUnderlyingSink = null;
        }
        else {
            assertObject(rawUnderlyingSink, 'First parameter');
        }
        var strategy = convertQueuingStrategy(rawStrategy, 'Second parameter');
        var underlyingSink = convertUnderlyingSink(rawUnderlyingSink, 'First parameter');
        InitializeWritableStream(this);
        var type = underlyingSink.type;
        if (type !== undefined) {
            throw new RangeError('Invalid type is specified');
        }
        var sizeAlgorithm = ExtractSizeAlgorithm(strategy);
        var highWaterMark = ExtractHighWaterMark(strategy, 1);
        SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
    }
    Object.defineProperty(WritableStream.prototype, "locked", {
        /**
         * Returns whether or not the writable stream is locked to a writer.
         */
        get: function () {
            if (!IsWritableStream(this)) {
                throw streamBrandCheckException$2('locked');
            }
            return IsWritableStreamLocked(this);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
     * immediately moved to an errored state, with any queued-up writes discarded. This will also execute any abort
     * mechanism of the underlying sink.
     *
     * The returned promise will fulfill if the stream shuts down successfully, or reject if the underlying sink signaled
     * that there was an error doing so. Additionally, it will reject with a `TypeError` (without attempting to cancel
     * the stream) if the stream is currently locked.
     */
    WritableStream.prototype.abort = function (reason) {
        if (reason === void 0) { reason = undefined; }
        if (!IsWritableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$2('abort'));
        }
        if (IsWritableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError('Cannot abort a stream that already has a writer'));
        }
        return WritableStreamAbort(this, reason);
    };
    /**
     * Closes the stream. The underlying sink will finish processing any previously-written chunks, before invoking its
     * close behavior. During this time any further attempts to write will fail (without erroring the stream).
     *
     * The method returns a promise that will fulfill if all remaining chunks are successfully written and the stream
     * successfully closes, or rejects if an error is encountered during this process. Additionally, it will reject with
     * a `TypeError` (without attempting to cancel the stream) if the stream is currently locked.
     */
    WritableStream.prototype.close = function () {
        if (!IsWritableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$2('close'));
        }
        if (IsWritableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError('Cannot close a stream that already has a writer'));
        }
        if (WritableStreamCloseQueuedOrInFlight(this)) {
            return promiseRejectedWith(new TypeError('Cannot close an already-closing stream'));
        }
        return WritableStreamClose(this);
    };
    /**
     * Creates a {@link WritableStreamDefaultWriter | writer} and locks the stream to the new writer. While the stream
     * is locked, no other writer can be acquired until this one is released.
     *
     * This functionality is especially useful for creating abstractions that desire the ability to write to a stream
     * without interruption or interleaving. By getting a writer for the stream, you can ensure nobody else can write at
     * the same time, which would cause the resulting written data to be unpredictable and probably useless.
     */
    WritableStream.prototype.getWriter = function () {
        if (!IsWritableStream(this)) {
            throw streamBrandCheckException$2('getWriter');
        }
        return AcquireWritableStreamDefaultWriter(this);
    };
    return WritableStream;
}());
Object.defineProperties(WritableStream.prototype, {
    abort: { enumerable: true },
    close: { enumerable: true },
    getWriter: { enumerable: true },
    locked: { enumerable: true }
});
setFunctionName(WritableStream.prototype.abort, 'abort');
setFunctionName(WritableStream.prototype.close, 'close');
setFunctionName(WritableStream.prototype.getWriter, 'getWriter');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
        value: 'WritableStream',
        configurable: true
    });
}
// Abstract operations for the WritableStream.
function AcquireWritableStreamDefaultWriter(stream) {
    return new WritableStreamDefaultWriter(stream);
}
// Throws if and only if startAlgorithm throws.
function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
    if (highWaterMark === void 0) { highWaterMark = 1; }
    if (sizeAlgorithm === void 0) { sizeAlgorithm = function () { return 1; }; }
    var stream = Object.create(WritableStream.prototype);
    InitializeWritableStream(stream);
    var controller = Object.create(WritableStreamDefaultController.prototype);
    SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
    return stream;
}
function InitializeWritableStream(stream) {
    stream._state = 'writable';
    // The error that will be reported by new method calls once the state becomes errored. Only set when [[state]] is
    // 'erroring' or 'errored'. May be set to an undefined value.
    stream._storedError = undefined;
    stream._writer = undefined;
    // Initialize to undefined first because the constructor of the controller checks this
    // variable to validate the caller.
    stream._writableStreamController = undefined;
    // This queue is placed here instead of the writer class in order to allow for passing a writer to the next data
    // producer without waiting for the queued writes to finish.
    stream._writeRequests = new SimpleQueue();
    // Write requests are removed from _writeRequests when write() is called on the underlying sink. This prevents
    // them from being erroneously rejected on error. If a write() call is in-flight, the request is stored here.
    stream._inFlightWriteRequest = undefined;
    // The promise that was returned from writer.close(). Stored here because it may be fulfilled after the writer
    // has been detached.
    stream._closeRequest = undefined;
    // Close request is removed from _closeRequest when close() is called on the underlying sink. This prevents it
    // from being erroneously rejected on error. If a close() call is in-flight, the request is stored here.
    stream._inFlightCloseRequest = undefined;
    // The promise that was returned from writer.abort(). This may also be fulfilled after the writer has detached.
    stream._pendingAbortRequest = undefined;
    // The backpressure signal set by the controller.
    stream._backpressure = false;
}
function IsWritableStream(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_writableStreamController')) {
        return false;
    }
    return x instanceof WritableStream;
}
function IsWritableStreamLocked(stream) {
    if (stream._writer === undefined) {
        return false;
    }
    return true;
}
function WritableStreamAbort(stream, reason) {
    var _a;
    if (stream._state === 'closed' || stream._state === 'errored') {
        return promiseResolvedWith(undefined);
    }
    stream._writableStreamController._abortReason = reason;
    (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort(reason);
    // TypeScript narrows the type of `stream._state` down to 'writable' | 'erroring',
    // but it doesn't know that signaling abort runs author code that might have changed the state.
    // Widen the type again by casting to WritableStreamState.
    var state = stream._state;
    if (state === 'closed' || state === 'errored') {
        return promiseResolvedWith(undefined);
    }
    if (stream._pendingAbortRequest !== undefined) {
        return stream._pendingAbortRequest._promise;
    }
    var wasAlreadyErroring = false;
    if (state === 'erroring') {
        wasAlreadyErroring = true;
        // reason will not be used, so don't keep a reference to it.
        reason = undefined;
    }
    var promise = newPromise(function (resolve, reject) {
        stream._pendingAbortRequest = {
            _promise: undefined,
            _resolve: resolve,
            _reject: reject,
            _reason: reason,
            _wasAlreadyErroring: wasAlreadyErroring
        };
    });
    stream._pendingAbortRequest._promise = promise;
    if (!wasAlreadyErroring) {
        WritableStreamStartErroring(stream, reason);
    }
    return promise;
}
function WritableStreamClose(stream) {
    var state = stream._state;
    if (state === 'closed' || state === 'errored') {
        return promiseRejectedWith(new TypeError("The stream (in ".concat(state, " state) is not in the writable state and cannot be closed")));
    }
    var promise = newPromise(function (resolve, reject) {
        var closeRequest = {
            _resolve: resolve,
            _reject: reject
        };
        stream._closeRequest = closeRequest;
    });
    var writer = stream._writer;
    if (writer !== undefined && stream._backpressure && state === 'writable') {
        defaultWriterReadyPromiseResolve(writer);
    }
    WritableStreamDefaultControllerClose(stream._writableStreamController);
    return promise;
}
// WritableStream API exposed for controllers.
function WritableStreamAddWriteRequest(stream) {
    var promise = newPromise(function (resolve, reject) {
        var writeRequest = {
            _resolve: resolve,
            _reject: reject
        };
        stream._writeRequests.push(writeRequest);
    });
    return promise;
}
function WritableStreamDealWithRejection(stream, error) {
    var state = stream._state;
    if (state === 'writable') {
        WritableStreamStartErroring(stream, error);
        return;
    }
    WritableStreamFinishErroring(stream);
}
function WritableStreamStartErroring(stream, reason) {
    var controller = stream._writableStreamController;
    stream._state = 'erroring';
    stream._storedError = reason;
    var writer = stream._writer;
    if (writer !== undefined) {
        WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
    }
    if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
        WritableStreamFinishErroring(stream);
    }
}
function WritableStreamFinishErroring(stream) {
    stream._state = 'errored';
    stream._writableStreamController[ErrorSteps]();
    var storedError = stream._storedError;
    stream._writeRequests.forEach(function (writeRequest) {
        writeRequest._reject(storedError);
    });
    stream._writeRequests = new SimpleQueue();
    if (stream._pendingAbortRequest === undefined) {
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
        return;
    }
    var abortRequest = stream._pendingAbortRequest;
    stream._pendingAbortRequest = undefined;
    if (abortRequest._wasAlreadyErroring) {
        abortRequest._reject(storedError);
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
        return;
    }
    var promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
    uponPromise(promise, function () {
        abortRequest._resolve();
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
        return null;
    }, function (reason) {
        abortRequest._reject(reason);
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
        return null;
    });
}
function WritableStreamFinishInFlightWrite(stream) {
    stream._inFlightWriteRequest._resolve(undefined);
    stream._inFlightWriteRequest = undefined;
}
function WritableStreamFinishInFlightWriteWithError(stream, error) {
    stream._inFlightWriteRequest._reject(error);
    stream._inFlightWriteRequest = undefined;
    WritableStreamDealWithRejection(stream, error);
}
function WritableStreamFinishInFlightClose(stream) {
    stream._inFlightCloseRequest._resolve(undefined);
    stream._inFlightCloseRequest = undefined;
    var state = stream._state;
    if (state === 'erroring') {
        // The error was too late to do anything, so it is ignored.
        stream._storedError = undefined;
        if (stream._pendingAbortRequest !== undefined) {
            stream._pendingAbortRequest._resolve();
            stream._pendingAbortRequest = undefined;
        }
    }
    stream._state = 'closed';
    var writer = stream._writer;
    if (writer !== undefined) {
        defaultWriterClosedPromiseResolve(writer);
    }
}
function WritableStreamFinishInFlightCloseWithError(stream, error) {
    stream._inFlightCloseRequest._reject(error);
    stream._inFlightCloseRequest = undefined;
    // Never execute sink abort() after sink close().
    if (stream._pendingAbortRequest !== undefined) {
        stream._pendingAbortRequest._reject(error);
        stream._pendingAbortRequest = undefined;
    }
    WritableStreamDealWithRejection(stream, error);
}
// TODO(ricea): Fix alphabetical order.
function WritableStreamCloseQueuedOrInFlight(stream) {
    if (stream._closeRequest === undefined && stream._inFlightCloseRequest === undefined) {
        return false;
    }
    return true;
}
function WritableStreamHasOperationMarkedInFlight(stream) {
    if (stream._inFlightWriteRequest === undefined && stream._inFlightCloseRequest === undefined) {
        return false;
    }
    return true;
}
function WritableStreamMarkCloseRequestInFlight(stream) {
    stream._inFlightCloseRequest = stream._closeRequest;
    stream._closeRequest = undefined;
}
function WritableStreamMarkFirstWriteRequestInFlight(stream) {
    stream._inFlightWriteRequest = stream._writeRequests.shift();
}
function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
    if (stream._closeRequest !== undefined) {
        stream._closeRequest._reject(stream._storedError);
        stream._closeRequest = undefined;
    }
    var writer = stream._writer;
    if (writer !== undefined) {
        defaultWriterClosedPromiseReject(writer, stream._storedError);
    }
}
function WritableStreamUpdateBackpressure(stream, backpressure) {
    var writer = stream._writer;
    if (writer !== undefined && backpressure !== stream._backpressure) {
        if (backpressure) {
            defaultWriterReadyPromiseReset(writer);
        }
        else {
            defaultWriterReadyPromiseResolve(writer);
        }
    }
    stream._backpressure = backpressure;
}
/**
 * A default writer vended by a {@link WritableStream}.
 *
 * @public
 */
var WritableStreamDefaultWriter = /** @class */ (function () {
    function WritableStreamDefaultWriter(stream) {
        assertRequiredArgument(stream, 1, 'WritableStreamDefaultWriter');
        assertWritableStream(stream, 'First parameter');
        if (IsWritableStreamLocked(stream)) {
            throw new TypeError('This stream has already been locked for exclusive writing by another writer');
        }
        this._ownerWritableStream = stream;
        stream._writer = this;
        var state = stream._state;
        if (state === 'writable') {
            if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
                defaultWriterReadyPromiseInitialize(this);
            }
            else {
                defaultWriterReadyPromiseInitializeAsResolved(this);
            }
            defaultWriterClosedPromiseInitialize(this);
        }
        else if (state === 'erroring') {
            defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
            defaultWriterClosedPromiseInitialize(this);
        }
        else if (state === 'closed') {
            defaultWriterReadyPromiseInitializeAsResolved(this);
            defaultWriterClosedPromiseInitializeAsResolved(this);
        }
        else {
            var storedError = stream._storedError;
            defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
            defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
        }
    }
    Object.defineProperty(WritableStreamDefaultWriter.prototype, "closed", {
        /**
         * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
         * the writer’s lock is released before the stream finishes closing.
         */
        get: function () {
            if (!IsWritableStreamDefaultWriter(this)) {
                return promiseRejectedWith(defaultWriterBrandCheckException('closed'));
            }
            return this._closedPromise;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WritableStreamDefaultWriter.prototype, "desiredSize", {
        /**
         * Returns the desired size to fill the stream’s internal queue. It can be negative, if the queue is over-full.
         * A producer can use this information to determine the right amount of data to write.
         *
         * It will be `null` if the stream cannot be successfully written to (due to either being errored, or having an abort
         * queued up). It will return zero if the stream is closed. And the getter will throw an exception if invoked when
         * the writer’s lock is released.
         */
        get: function () {
            if (!IsWritableStreamDefaultWriter(this)) {
                throw defaultWriterBrandCheckException('desiredSize');
            }
            if (this._ownerWritableStream === undefined) {
                throw defaultWriterLockException('desiredSize');
            }
            return WritableStreamDefaultWriterGetDesiredSize(this);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WritableStreamDefaultWriter.prototype, "ready", {
        /**
         * Returns a promise that will be fulfilled when the desired size to fill the stream’s internal queue transitions
         * from non-positive to positive, signaling that it is no longer applying backpressure. Once the desired size dips
         * back to zero or below, the getter will return a new promise that stays pending until the next transition.
         *
         * If the stream becomes errored or aborted, or the writer’s lock is released, the returned promise will become
         * rejected.
         */
        get: function () {
            if (!IsWritableStreamDefaultWriter(this)) {
                return promiseRejectedWith(defaultWriterBrandCheckException('ready'));
            }
            return this._readyPromise;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * If the reader is active, behaves the same as {@link WritableStream.abort | stream.abort(reason)}.
     */
    WritableStreamDefaultWriter.prototype.abort = function (reason) {
        if (reason === void 0) { reason = undefined; }
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('abort'));
        }
        if (this._ownerWritableStream === undefined) {
            return promiseRejectedWith(defaultWriterLockException('abort'));
        }
        return WritableStreamDefaultWriterAbort(this, reason);
    };
    /**
     * If the reader is active, behaves the same as {@link WritableStream.close | stream.close()}.
     */
    WritableStreamDefaultWriter.prototype.close = function () {
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('close'));
        }
        var stream = this._ownerWritableStream;
        if (stream === undefined) {
            return promiseRejectedWith(defaultWriterLockException('close'));
        }
        if (WritableStreamCloseQueuedOrInFlight(stream)) {
            return promiseRejectedWith(new TypeError('Cannot close an already-closing stream'));
        }
        return WritableStreamDefaultWriterClose(this);
    };
    /**
     * Releases the writer’s lock on the corresponding stream. After the lock is released, the writer is no longer active.
     * If the associated stream is errored when the lock is released, the writer will appear errored in the same way from
     * now on; otherwise, the writer will appear closed.
     *
     * Note that the lock can still be released even if some ongoing writes have not yet finished (i.e. even if the
     * promises returned from previous calls to {@link WritableStreamDefaultWriter.write | write()} have not yet settled).
     * It’s not necessary to hold the lock on the writer for the duration of the write; the lock instead simply prevents
     * other producers from writing in an interleaved manner.
     */
    WritableStreamDefaultWriter.prototype.releaseLock = function () {
        if (!IsWritableStreamDefaultWriter(this)) {
            throw defaultWriterBrandCheckException('releaseLock');
        }
        var stream = this._ownerWritableStream;
        if (stream === undefined) {
            return;
        }
        WritableStreamDefaultWriterRelease(this);
    };
    WritableStreamDefaultWriter.prototype.write = function (chunk) {
        if (chunk === void 0) { chunk = undefined; }
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('write'));
        }
        if (this._ownerWritableStream === undefined) {
            return promiseRejectedWith(defaultWriterLockException('write to'));
        }
        return WritableStreamDefaultWriterWrite(this, chunk);
    };
    return WritableStreamDefaultWriter;
}());
Object.defineProperties(WritableStreamDefaultWriter.prototype, {
    abort: { enumerable: true },
    close: { enumerable: true },
    releaseLock: { enumerable: true },
    write: { enumerable: true },
    closed: { enumerable: true },
    desiredSize: { enumerable: true },
    ready: { enumerable: true }
});
setFunctionName(WritableStreamDefaultWriter.prototype.abort, 'abort');
setFunctionName(WritableStreamDefaultWriter.prototype.close, 'close');
setFunctionName(WritableStreamDefaultWriter.prototype.releaseLock, 'releaseLock');
setFunctionName(WritableStreamDefaultWriter.prototype.write, 'write');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
        value: 'WritableStreamDefaultWriter',
        configurable: true
    });
}
// Abstract operations for the WritableStreamDefaultWriter.
function IsWritableStreamDefaultWriter(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_ownerWritableStream')) {
        return false;
    }
    return x instanceof WritableStreamDefaultWriter;
}
// A client of WritableStreamDefaultWriter may use these functions directly to bypass state check.
function WritableStreamDefaultWriterAbort(writer, reason) {
    var stream = writer._ownerWritableStream;
    return WritableStreamAbort(stream, reason);
}
function WritableStreamDefaultWriterClose(writer) {
    var stream = writer._ownerWritableStream;
    return WritableStreamClose(stream);
}
function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
    var stream = writer._ownerWritableStream;
    var state = stream._state;
    if (WritableStreamCloseQueuedOrInFlight(stream) || state === 'closed') {
        return promiseResolvedWith(undefined);
    }
    if (state === 'errored') {
        return promiseRejectedWith(stream._storedError);
    }
    return WritableStreamDefaultWriterClose(writer);
}
function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error) {
    if (writer._closedPromiseState === 'pending') {
        defaultWriterClosedPromiseReject(writer, error);
    }
    else {
        defaultWriterClosedPromiseResetToRejected(writer, error);
    }
}
function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error) {
    if (writer._readyPromiseState === 'pending') {
        defaultWriterReadyPromiseReject(writer, error);
    }
    else {
        defaultWriterReadyPromiseResetToRejected(writer, error);
    }
}
function WritableStreamDefaultWriterGetDesiredSize(writer) {
    var stream = writer._ownerWritableStream;
    var state = stream._state;
    if (state === 'errored' || state === 'erroring') {
        return null;
    }
    if (state === 'closed') {
        return 0;
    }
    return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
}
function WritableStreamDefaultWriterRelease(writer) {
    var stream = writer._ownerWritableStream;
    var releasedError = new TypeError("Writer was released and can no longer be used to monitor the stream's closedness");
    WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
    // The state transitions to "errored" before the sink abort() method runs, but the writer.closed promise is not
    // rejected until afterwards. This means that simply testing state will not work.
    WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
    stream._writer = undefined;
    writer._ownerWritableStream = undefined;
}
function WritableStreamDefaultWriterWrite(writer, chunk) {
    var stream = writer._ownerWritableStream;
    var controller = stream._writableStreamController;
    var chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
    if (stream !== writer._ownerWritableStream) {
        return promiseRejectedWith(defaultWriterLockException('write to'));
    }
    var state = stream._state;
    if (state === 'errored') {
        return promiseRejectedWith(stream._storedError);
    }
    if (WritableStreamCloseQueuedOrInFlight(stream) || state === 'closed') {
        return promiseRejectedWith(new TypeError('The stream is closing or closed and cannot be written to'));
    }
    if (state === 'erroring') {
        return promiseRejectedWith(stream._storedError);
    }
    var promise = WritableStreamAddWriteRequest(stream);
    WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
    return promise;
}
var closeSentinel = {};
/**
 * Allows control of a {@link WritableStream | writable stream}'s state and internal queue.
 *
 * @public
 */
var WritableStreamDefaultController = /** @class */ (function () {
    function WritableStreamDefaultController() {
        throw new TypeError('Illegal constructor');
    }
    Object.defineProperty(WritableStreamDefaultController.prototype, "abortReason", {
        /**
         * The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.
         *
         * @deprecated
         *  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.
         *  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.
         */
        get: function () {
            if (!IsWritableStreamDefaultController(this)) {
                throw defaultControllerBrandCheckException$2('abortReason');
            }
            return this._abortReason;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WritableStreamDefaultController.prototype, "signal", {
        /**
         * An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.
         */
        get: function () {
            if (!IsWritableStreamDefaultController(this)) {
                throw defaultControllerBrandCheckException$2('signal');
            }
            if (this._abortController === undefined) {
                // Older browsers or older Node versions may not support `AbortController` or `AbortSignal`.
                // We don't want to bundle and ship an `AbortController` polyfill together with our polyfill,
                // so instead we only implement support for `signal` if we find a global `AbortController` constructor.
                throw new TypeError('WritableStreamDefaultController.prototype.signal is not supported');
            }
            return this._abortController.signal;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Closes the controlled writable stream, making all future interactions with it fail with the given error `e`.
     *
     * This method is rarely used, since usually it suffices to return a rejected promise from one of the underlying
     * sink's methods. However, it can be useful for suddenly shutting down a stream in response to an event outside the
     * normal lifecycle of interactions with the underlying sink.
     */
    WritableStreamDefaultController.prototype.error = function (e) {
        if (e === void 0) { e = undefined; }
        if (!IsWritableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$2('error');
        }
        var state = this._controlledWritableStream._state;
        if (state !== 'writable') {
            // The stream is closed, errored or will be soon. The sink can't do anything useful if it gets an error here, so
            // just treat it as a no-op.
            return;
        }
        WritableStreamDefaultControllerError(this, e);
    };
    /** @internal */
    WritableStreamDefaultController.prototype[AbortSteps] = function (reason) {
        var result = this._abortAlgorithm(reason);
        WritableStreamDefaultControllerClearAlgorithms(this);
        return result;
    };
    /** @internal */
    WritableStreamDefaultController.prototype[ErrorSteps] = function () {
        ResetQueue(this);
    };
    return WritableStreamDefaultController;
}());
Object.defineProperties(WritableStreamDefaultController.prototype, {
    abortReason: { enumerable: true },
    signal: { enumerable: true },
    error: { enumerable: true }
});
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
        value: 'WritableStreamDefaultController',
        configurable: true
    });
}
// Abstract operations implementing interface required by the WritableStream.
function IsWritableStreamDefaultController(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_controlledWritableStream')) {
        return false;
    }
    return x instanceof WritableStreamDefaultController;
}
function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
    controller._controlledWritableStream = stream;
    stream._writableStreamController = controller;
    // Need to set the slots so that the assert doesn't fire. In the spec the slots already exist implicitly.
    controller._queue = undefined;
    controller._queueTotalSize = undefined;
    ResetQueue(controller);
    controller._abortReason = undefined;
    controller._abortController = createAbortController();
    controller._started = false;
    controller._strategySizeAlgorithm = sizeAlgorithm;
    controller._strategyHWM = highWaterMark;
    controller._writeAlgorithm = writeAlgorithm;
    controller._closeAlgorithm = closeAlgorithm;
    controller._abortAlgorithm = abortAlgorithm;
    var backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
    WritableStreamUpdateBackpressure(stream, backpressure);
    var startResult = startAlgorithm();
    var startPromise = promiseResolvedWith(startResult);
    uponPromise(startPromise, function () {
        controller._started = true;
        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        return null;
    }, function (r) {
        controller._started = true;
        WritableStreamDealWithRejection(stream, r);
        return null;
    });
}
function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
    var controller = Object.create(WritableStreamDefaultController.prototype);
    var startAlgorithm;
    var writeAlgorithm;
    var closeAlgorithm;
    var abortAlgorithm;
    if (underlyingSink.start !== undefined) {
        startAlgorithm = function () { return underlyingSink.start(controller); };
    }
    else {
        startAlgorithm = function () { return undefined; };
    }
    if (underlyingSink.write !== undefined) {
        writeAlgorithm = function (chunk) { return underlyingSink.write(chunk, controller); };
    }
    else {
        writeAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    if (underlyingSink.close !== undefined) {
        closeAlgorithm = function () { return underlyingSink.close(); };
    }
    else {
        closeAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    if (underlyingSink.abort !== undefined) {
        abortAlgorithm = function (reason) { return underlyingSink.abort(reason); };
    }
    else {
        abortAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
}
// ClearAlgorithms may be called twice. Erroring the same stream in multiple ways will often result in redundant calls.
function WritableStreamDefaultControllerClearAlgorithms(controller) {
    controller._writeAlgorithm = undefined;
    controller._closeAlgorithm = undefined;
    controller._abortAlgorithm = undefined;
    controller._strategySizeAlgorithm = undefined;
}
function WritableStreamDefaultControllerClose(controller) {
    EnqueueValueWithSize(controller, closeSentinel, 0);
    WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
}
function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
    try {
        return controller._strategySizeAlgorithm(chunk);
    }
    catch (chunkSizeE) {
        WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
        return 1;
    }
}
function WritableStreamDefaultControllerGetDesiredSize(controller) {
    return controller._strategyHWM - controller._queueTotalSize;
}
function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
    try {
        EnqueueValueWithSize(controller, chunk, chunkSize);
    }
    catch (enqueueE) {
        WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
        return;
    }
    var stream = controller._controlledWritableStream;
    if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === 'writable') {
        var backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
        WritableStreamUpdateBackpressure(stream, backpressure);
    }
    WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
}
// Abstract operations for the WritableStreamDefaultController.
function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
    var stream = controller._controlledWritableStream;
    if (!controller._started) {
        return;
    }
    if (stream._inFlightWriteRequest !== undefined) {
        return;
    }
    var state = stream._state;
    if (state === 'erroring') {
        WritableStreamFinishErroring(stream);
        return;
    }
    if (controller._queue.length === 0) {
        return;
    }
    var value = PeekQueueValue(controller);
    if (value === closeSentinel) {
        WritableStreamDefaultControllerProcessClose(controller);
    }
    else {
        WritableStreamDefaultControllerProcessWrite(controller, value);
    }
}
function WritableStreamDefaultControllerErrorIfNeeded(controller, error) {
    if (controller._controlledWritableStream._state === 'writable') {
        WritableStreamDefaultControllerError(controller, error);
    }
}
function WritableStreamDefaultControllerProcessClose(controller) {
    var stream = controller._controlledWritableStream;
    WritableStreamMarkCloseRequestInFlight(stream);
    DequeueValue(controller);
    var sinkClosePromise = controller._closeAlgorithm();
    WritableStreamDefaultControllerClearAlgorithms(controller);
    uponPromise(sinkClosePromise, function () {
        WritableStreamFinishInFlightClose(stream);
        return null;
    }, function (reason) {
        WritableStreamFinishInFlightCloseWithError(stream, reason);
        return null;
    });
}
function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
    var stream = controller._controlledWritableStream;
    WritableStreamMarkFirstWriteRequestInFlight(stream);
    var sinkWritePromise = controller._writeAlgorithm(chunk);
    uponPromise(sinkWritePromise, function () {
        WritableStreamFinishInFlightWrite(stream);
        var state = stream._state;
        DequeueValue(controller);
        if (!WritableStreamCloseQueuedOrInFlight(stream) && state === 'writable') {
            var backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
        }
        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        return null;
    }, function (reason) {
        if (stream._state === 'writable') {
            WritableStreamDefaultControllerClearAlgorithms(controller);
        }
        WritableStreamFinishInFlightWriteWithError(stream, reason);
        return null;
    });
}
function WritableStreamDefaultControllerGetBackpressure(controller) {
    var desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
    return desiredSize <= 0;
}
// A client of WritableStreamDefaultController may use these functions directly to bypass state check.
function WritableStreamDefaultControllerError(controller, error) {
    var stream = controller._controlledWritableStream;
    WritableStreamDefaultControllerClearAlgorithms(controller);
    WritableStreamStartErroring(stream, error);
}
// Helper functions for the WritableStream.
function streamBrandCheckException$2(name) {
    return new TypeError("WritableStream.prototype.".concat(name, " can only be used on a WritableStream"));
}
// Helper functions for the WritableStreamDefaultController.
function defaultControllerBrandCheckException$2(name) {
    return new TypeError("WritableStreamDefaultController.prototype.".concat(name, " can only be used on a WritableStreamDefaultController"));
}
// Helper functions for the WritableStreamDefaultWriter.
function defaultWriterBrandCheckException(name) {
    return new TypeError("WritableStreamDefaultWriter.prototype.".concat(name, " can only be used on a WritableStreamDefaultWriter"));
}
function defaultWriterLockException(name) {
    return new TypeError('Cannot ' + name + ' a stream using a released writer');
}
function defaultWriterClosedPromiseInitialize(writer) {
    writer._closedPromise = newPromise(function (resolve, reject) {
        writer._closedPromise_resolve = resolve;
        writer._closedPromise_reject = reject;
        writer._closedPromiseState = 'pending';
    });
}
function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
    defaultWriterClosedPromiseInitialize(writer);
    defaultWriterClosedPromiseReject(writer, reason);
}
function defaultWriterClosedPromiseInitializeAsResolved(writer) {
    defaultWriterClosedPromiseInitialize(writer);
    defaultWriterClosedPromiseResolve(writer);
}
function defaultWriterClosedPromiseReject(writer, reason) {
    if (writer._closedPromise_reject === undefined) {
        return;
    }
    setPromiseIsHandledToTrue(writer._closedPromise);
    writer._closedPromise_reject(reason);
    writer._closedPromise_resolve = undefined;
    writer._closedPromise_reject = undefined;
    writer._closedPromiseState = 'rejected';
}
function defaultWriterClosedPromiseResetToRejected(writer, reason) {
    defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
}
function defaultWriterClosedPromiseResolve(writer) {
    if (writer._closedPromise_resolve === undefined) {
        return;
    }
    writer._closedPromise_resolve(undefined);
    writer._closedPromise_resolve = undefined;
    writer._closedPromise_reject = undefined;
    writer._closedPromiseState = 'resolved';
}
function defaultWriterReadyPromiseInitialize(writer) {
    writer._readyPromise = newPromise(function (resolve, reject) {
        writer._readyPromise_resolve = resolve;
        writer._readyPromise_reject = reject;
    });
    writer._readyPromiseState = 'pending';
}
function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
    defaultWriterReadyPromiseInitialize(writer);
    defaultWriterReadyPromiseReject(writer, reason);
}
function defaultWriterReadyPromiseInitializeAsResolved(writer) {
    defaultWriterReadyPromiseInitialize(writer);
    defaultWriterReadyPromiseResolve(writer);
}
function defaultWriterReadyPromiseReject(writer, reason) {
    if (writer._readyPromise_reject === undefined) {
        return;
    }
    setPromiseIsHandledToTrue(writer._readyPromise);
    writer._readyPromise_reject(reason);
    writer._readyPromise_resolve = undefined;
    writer._readyPromise_reject = undefined;
    writer._readyPromiseState = 'rejected';
}
function defaultWriterReadyPromiseReset(writer) {
    defaultWriterReadyPromiseInitialize(writer);
}
function defaultWriterReadyPromiseResetToRejected(writer, reason) {
    defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
}
function defaultWriterReadyPromiseResolve(writer) {
    if (writer._readyPromise_resolve === undefined) {
        return;
    }
    writer._readyPromise_resolve(undefined);
    writer._readyPromise_resolve = undefined;
    writer._readyPromise_reject = undefined;
    writer._readyPromiseState = 'fulfilled';
}

/// <reference lib="dom" />
function getGlobals() {
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    else if (typeof self !== 'undefined') {
        return self;
    }
    else if (typeof global !== 'undefined') {
        return global;
    }
    return undefined;
}
var globals = getGlobals();

/// <reference types="node" />
function isDOMExceptionConstructor(ctor) {
    if (!(typeof ctor === 'function' || typeof ctor === 'object')) {
        return false;
    }
    if (ctor.name !== 'DOMException') {
        return false;
    }
    try {
        new ctor();
        return true;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Support:
 * - Web browsers
 * - Node 18 and higher (https://github.com/nodejs/node/commit/e4b1fb5e6422c1ff151234bb9de792d45dd88d87)
 */
function getFromGlobal() {
    var ctor = globals === null || globals === void 0 ? void 0 : globals.DOMException;
    return isDOMExceptionConstructor(ctor) ? ctor : undefined;
}
/**
 * Support:
 * - All platforms
 */
function createPolyfill() {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    var ctor = function DOMException(message, name) {
        this.message = message || '';
        this.name = name || 'Error';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    };
    setFunctionName(ctor, 'DOMException');
    ctor.prototype = Object.create(Error.prototype);
    Object.defineProperty(ctor.prototype, 'constructor', { value: ctor, writable: true, configurable: true });
    return ctor;
}
// eslint-disable-next-line @typescript-eslint/no-redeclare
var DOMException = getFromGlobal() || createPolyfill();

function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
    var reader = AcquireReadableStreamDefaultReader(source);
    var writer = AcquireWritableStreamDefaultWriter(dest);
    source._disturbed = true;
    var shuttingDown = false;
    // This is used to keep track of the spec's requirement that we wait for ongoing writes during shutdown.
    var currentWrite = promiseResolvedWith(undefined);
    return newPromise(function (resolve, reject) {
        var abortAlgorithm;
        if (signal !== undefined) {
            abortAlgorithm = function () {
                var error = signal.reason !== undefined ? signal.reason : new DOMException('Aborted', 'AbortError');
                var actions = [];
                if (!preventAbort) {
                    actions.push(function () {
                        if (dest._state === 'writable') {
                            return WritableStreamAbort(dest, error);
                        }
                        return promiseResolvedWith(undefined);
                    });
                }
                if (!preventCancel) {
                    actions.push(function () {
                        if (source._state === 'readable') {
                            return ReadableStreamCancel(source, error);
                        }
                        return promiseResolvedWith(undefined);
                    });
                }
                shutdownWithAction(function () { return Promise.all(actions.map(function (action) { return action(); })); }, true, error);
            };
            if (signal.aborted) {
                abortAlgorithm();
                return;
            }
            signal.addEventListener('abort', abortAlgorithm);
        }
        // Using reader and writer, read all chunks from this and write them to dest
        // - Backpressure must be enforced
        // - Shutdown must stop all activity
        function pipeLoop() {
            return newPromise(function (resolveLoop, rejectLoop) {
                function next(done) {
                    if (done) {
                        resolveLoop();
                    }
                    else {
                        // Use `PerformPromiseThen` instead of `uponPromise` to avoid
                        // adding unnecessary `.catch(rethrowAssertionErrorRejection)` handlers
                        PerformPromiseThen(pipeStep(), next, rejectLoop);
                    }
                }
                next(false);
            });
        }
        function pipeStep() {
            if (shuttingDown) {
                return promiseResolvedWith(true);
            }
            return PerformPromiseThen(writer._readyPromise, function () {
                return newPromise(function (resolveRead, rejectRead) {
                    ReadableStreamDefaultReaderRead(reader, {
                        _chunkSteps: function (chunk) {
                            currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), undefined, noop);
                            resolveRead(false);
                        },
                        _closeSteps: function () { return resolveRead(true); },
                        _errorSteps: rejectRead
                    });
                });
            });
        }
        // Errors must be propagated forward
        isOrBecomesErrored(source, reader._closedPromise, function (storedError) {
            if (!preventAbort) {
                shutdownWithAction(function () { return WritableStreamAbort(dest, storedError); }, true, storedError);
            }
            else {
                shutdown(true, storedError);
            }
            return null;
        });
        // Errors must be propagated backward
        isOrBecomesErrored(dest, writer._closedPromise, function (storedError) {
            if (!preventCancel) {
                shutdownWithAction(function () { return ReadableStreamCancel(source, storedError); }, true, storedError);
            }
            else {
                shutdown(true, storedError);
            }
            return null;
        });
        // Closing must be propagated forward
        isOrBecomesClosed(source, reader._closedPromise, function () {
            if (!preventClose) {
                shutdownWithAction(function () { return WritableStreamDefaultWriterCloseWithErrorPropagation(writer); });
            }
            else {
                shutdown();
            }
            return null;
        });
        // Closing must be propagated backward
        if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === 'closed') {
            var destClosed_1 = new TypeError('the destination writable stream closed before all data could be piped to it');
            if (!preventCancel) {
                shutdownWithAction(function () { return ReadableStreamCancel(source, destClosed_1); }, true, destClosed_1);
            }
            else {
                shutdown(true, destClosed_1);
            }
        }
        setPromiseIsHandledToTrue(pipeLoop());
        function waitForWritesToFinish() {
            // Another write may have started while we were waiting on this currentWrite, so we have to be sure to wait
            // for that too.
            var oldCurrentWrite = currentWrite;
            return PerformPromiseThen(currentWrite, function () { return oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : undefined; });
        }
        function isOrBecomesErrored(stream, promise, action) {
            if (stream._state === 'errored') {
                action(stream._storedError);
            }
            else {
                uponRejection(promise, action);
            }
        }
        function isOrBecomesClosed(stream, promise, action) {
            if (stream._state === 'closed') {
                action();
            }
            else {
                uponFulfillment(promise, action);
            }
        }
        function shutdownWithAction(action, originalIsError, originalError) {
            if (shuttingDown) {
                return;
            }
            shuttingDown = true;
            if (dest._state === 'writable' && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), doTheRest);
            }
            else {
                doTheRest();
            }
            function doTheRest() {
                uponPromise(action(), function () { return finalize(originalIsError, originalError); }, function (newError) { return finalize(true, newError); });
                return null;
            }
        }
        function shutdown(isError, error) {
            if (shuttingDown) {
                return;
            }
            shuttingDown = true;
            if (dest._state === 'writable' && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), function () { return finalize(isError, error); });
            }
            else {
                finalize(isError, error);
            }
        }
        function finalize(isError, error) {
            WritableStreamDefaultWriterRelease(writer);
            ReadableStreamReaderGenericRelease(reader);
            if (signal !== undefined) {
                signal.removeEventListener('abort', abortAlgorithm);
            }
            if (isError) {
                reject(error);
            }
            else {
                resolve(undefined);
            }
            return null;
        }
    });
}

/**
 * Allows control of a {@link ReadableStream | readable stream}'s state and internal queue.
 *
 * @public
 */
var ReadableStreamDefaultController = /** @class */ (function () {
    function ReadableStreamDefaultController() {
        throw new TypeError('Illegal constructor');
    }
    Object.defineProperty(ReadableStreamDefaultController.prototype, "desiredSize", {
        /**
         * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
         * over-full. An underlying source ought to use this information to determine when and how to apply backpressure.
         */
        get: function () {
            if (!IsReadableStreamDefaultController(this)) {
                throw defaultControllerBrandCheckException$1('desiredSize');
            }
            return ReadableStreamDefaultControllerGetDesiredSize(this);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
     * the stream, but once those are read, the stream will become closed.
     */
    ReadableStreamDefaultController.prototype.close = function () {
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('close');
        }
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
            throw new TypeError('The stream is not in a state that permits close');
        }
        ReadableStreamDefaultControllerClose(this);
    };
    ReadableStreamDefaultController.prototype.enqueue = function (chunk) {
        if (chunk === void 0) { chunk = undefined; }
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('enqueue');
        }
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
            throw new TypeError('The stream is not in a state that permits enqueue');
        }
        return ReadableStreamDefaultControllerEnqueue(this, chunk);
    };
    /**
     * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
     */
    ReadableStreamDefaultController.prototype.error = function (e) {
        if (e === void 0) { e = undefined; }
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('error');
        }
        ReadableStreamDefaultControllerError(this, e);
    };
    /** @internal */
    ReadableStreamDefaultController.prototype[CancelSteps] = function (reason) {
        ResetQueue(this);
        var result = this._cancelAlgorithm(reason);
        ReadableStreamDefaultControllerClearAlgorithms(this);
        return result;
    };
    /** @internal */
    ReadableStreamDefaultController.prototype[PullSteps] = function (readRequest) {
        var stream = this._controlledReadableStream;
        if (this._queue.length > 0) {
            var chunk = DequeueValue(this);
            if (this._closeRequested && this._queue.length === 0) {
                ReadableStreamDefaultControllerClearAlgorithms(this);
                ReadableStreamClose(stream);
            }
            else {
                ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
            readRequest._chunkSteps(chunk);
        }
        else {
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableStreamDefaultControllerCallPullIfNeeded(this);
        }
    };
    /** @internal */
    ReadableStreamDefaultController.prototype[ReleaseSteps] = function () {
        // Do nothing.
    };
    return ReadableStreamDefaultController;
}());
Object.defineProperties(ReadableStreamDefaultController.prototype, {
    close: { enumerable: true },
    enqueue: { enumerable: true },
    error: { enumerable: true },
    desiredSize: { enumerable: true }
});
setFunctionName(ReadableStreamDefaultController.prototype.close, 'close');
setFunctionName(ReadableStreamDefaultController.prototype.enqueue, 'enqueue');
setFunctionName(ReadableStreamDefaultController.prototype.error, 'error');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableStreamDefaultController',
        configurable: true
    });
}
// Abstract operations for the ReadableStreamDefaultController.
function IsReadableStreamDefaultController(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_controlledReadableStream')) {
        return false;
    }
    return x instanceof ReadableStreamDefaultController;
}
function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
    var shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
    if (!shouldPull) {
        return;
    }
    if (controller._pulling) {
        controller._pullAgain = true;
        return;
    }
    controller._pulling = true;
    var pullPromise = controller._pullAlgorithm();
    uponPromise(pullPromise, function () {
        controller._pulling = false;
        if (controller._pullAgain) {
            controller._pullAgain = false;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
        return null;
    }, function (e) {
        ReadableStreamDefaultControllerError(controller, e);
        return null;
    });
}
function ReadableStreamDefaultControllerShouldCallPull(controller) {
    var stream = controller._controlledReadableStream;
    if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
        return false;
    }
    if (!controller._started) {
        return false;
    }
    if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
        return true;
    }
    var desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
    if (desiredSize > 0) {
        return true;
    }
    return false;
}
function ReadableStreamDefaultControllerClearAlgorithms(controller) {
    controller._pullAlgorithm = undefined;
    controller._cancelAlgorithm = undefined;
    controller._strategySizeAlgorithm = undefined;
}
// A client of ReadableStreamDefaultController may use these functions directly to bypass state check.
function ReadableStreamDefaultControllerClose(controller) {
    if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
        return;
    }
    var stream = controller._controlledReadableStream;
    controller._closeRequested = true;
    if (controller._queue.length === 0) {
        ReadableStreamDefaultControllerClearAlgorithms(controller);
        ReadableStreamClose(stream);
    }
}
function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
    if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
        return;
    }
    var stream = controller._controlledReadableStream;
    if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
        ReadableStreamFulfillReadRequest(stream, chunk, false);
    }
    else {
        var chunkSize = void 0;
        try {
            chunkSize = controller._strategySizeAlgorithm(chunk);
        }
        catch (chunkSizeE) {
            ReadableStreamDefaultControllerError(controller, chunkSizeE);
            throw chunkSizeE;
        }
        try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
        }
        catch (enqueueE) {
            ReadableStreamDefaultControllerError(controller, enqueueE);
            throw enqueueE;
        }
    }
    ReadableStreamDefaultControllerCallPullIfNeeded(controller);
}
function ReadableStreamDefaultControllerError(controller, e) {
    var stream = controller._controlledReadableStream;
    if (stream._state !== 'readable') {
        return;
    }
    ResetQueue(controller);
    ReadableStreamDefaultControllerClearAlgorithms(controller);
    ReadableStreamError(stream, e);
}
function ReadableStreamDefaultControllerGetDesiredSize(controller) {
    var state = controller._controlledReadableStream._state;
    if (state === 'errored') {
        return null;
    }
    if (state === 'closed') {
        return 0;
    }
    return controller._strategyHWM - controller._queueTotalSize;
}
// This is used in the implementation of TransformStream.
function ReadableStreamDefaultControllerHasBackpressure(controller) {
    if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
        return false;
    }
    return true;
}
function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
    var state = controller._controlledReadableStream._state;
    if (!controller._closeRequested && state === 'readable') {
        return true;
    }
    return false;
}
function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
    controller._controlledReadableStream = stream;
    controller._queue = undefined;
    controller._queueTotalSize = undefined;
    ResetQueue(controller);
    controller._started = false;
    controller._closeRequested = false;
    controller._pullAgain = false;
    controller._pulling = false;
    controller._strategySizeAlgorithm = sizeAlgorithm;
    controller._strategyHWM = highWaterMark;
    controller._pullAlgorithm = pullAlgorithm;
    controller._cancelAlgorithm = cancelAlgorithm;
    stream._readableStreamController = controller;
    var startResult = startAlgorithm();
    uponPromise(promiseResolvedWith(startResult), function () {
        controller._started = true;
        ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        return null;
    }, function (r) {
        ReadableStreamDefaultControllerError(controller, r);
        return null;
    });
}
function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
    var controller = Object.create(ReadableStreamDefaultController.prototype);
    var startAlgorithm;
    var pullAlgorithm;
    var cancelAlgorithm;
    if (underlyingSource.start !== undefined) {
        startAlgorithm = function () { return underlyingSource.start(controller); };
    }
    else {
        startAlgorithm = function () { return undefined; };
    }
    if (underlyingSource.pull !== undefined) {
        pullAlgorithm = function () { return underlyingSource.pull(controller); };
    }
    else {
        pullAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    if (underlyingSource.cancel !== undefined) {
        cancelAlgorithm = function (reason) { return underlyingSource.cancel(reason); };
    }
    else {
        cancelAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
}
// Helper functions for the ReadableStreamDefaultController.
function defaultControllerBrandCheckException$1(name) {
    return new TypeError("ReadableStreamDefaultController.prototype.".concat(name, " can only be used on a ReadableStreamDefaultController"));
}

function ReadableStreamTee(stream, cloneForBranch2) {
    if (IsReadableByteStreamController(stream._readableStreamController)) {
        return ReadableByteStreamTee(stream);
    }
    return ReadableStreamDefaultTee(stream);
}
function ReadableStreamDefaultTee(stream, cloneForBranch2) {
    var reader = AcquireReadableStreamDefaultReader(stream);
    var reading = false;
    var readAgain = false;
    var canceled1 = false;
    var canceled2 = false;
    var reason1;
    var reason2;
    var branch1;
    var branch2;
    var resolveCancelPromise;
    var cancelPromise = newPromise(function (resolve) {
        resolveCancelPromise = resolve;
    });
    function pullAlgorithm() {
        if (reading) {
            readAgain = true;
            return promiseResolvedWith(undefined);
        }
        reading = true;
        var readRequest = {
            _chunkSteps: function (chunk) {
                // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
                // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
                // successful synchronously-available reads get ahead of asynchronously-available errors.
                _queueMicrotask(function () {
                    readAgain = false;
                    var chunk1 = chunk;
                    var chunk2 = chunk;
                    // There is no way to access the cloning code right now in the reference implementation.
                    // If we add one then we'll need an implementation for serializable objects.
                    // if (!canceled2 && cloneForBranch2) {
                    //   chunk2 = StructuredDeserialize(StructuredSerialize(chunk2));
                    // }
                    if (!canceled1) {
                        ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                    }
                    if (!canceled2) {
                        ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                    }
                    reading = false;
                    if (readAgain) {
                        pullAlgorithm();
                    }
                });
            },
            _closeSteps: function () {
                reading = false;
                if (!canceled1) {
                    ReadableStreamDefaultControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                    ReadableStreamDefaultControllerClose(branch2._readableStreamController);
                }
                if (!canceled1 || !canceled2) {
                    resolveCancelPromise(undefined);
                }
            },
            _errorSteps: function () {
                reading = false;
            }
        };
        ReadableStreamDefaultReaderRead(reader, readRequest);
        return promiseResolvedWith(undefined);
    }
    function cancel1Algorithm(reason) {
        canceled1 = true;
        reason1 = reason;
        if (canceled2) {
            var compositeReason = CreateArrayFromList([reason1, reason2]);
            var cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function cancel2Algorithm(reason) {
        canceled2 = true;
        reason2 = reason;
        if (canceled1) {
            var compositeReason = CreateArrayFromList([reason1, reason2]);
            var cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function startAlgorithm() {
        // do nothing
    }
    branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
    branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
    uponRejection(reader._closedPromise, function (r) {
        ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
        ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
        if (!canceled1 || !canceled2) {
            resolveCancelPromise(undefined);
        }
        return null;
    });
    return [branch1, branch2];
}
function ReadableByteStreamTee(stream) {
    var reader = AcquireReadableStreamDefaultReader(stream);
    var reading = false;
    var readAgainForBranch1 = false;
    var readAgainForBranch2 = false;
    var canceled1 = false;
    var canceled2 = false;
    var reason1;
    var reason2;
    var branch1;
    var branch2;
    var resolveCancelPromise;
    var cancelPromise = newPromise(function (resolve) {
        resolveCancelPromise = resolve;
    });
    function forwardReaderError(thisReader) {
        uponRejection(thisReader._closedPromise, function (r) {
            if (thisReader !== reader) {
                return null;
            }
            ReadableByteStreamControllerError(branch1._readableStreamController, r);
            ReadableByteStreamControllerError(branch2._readableStreamController, r);
            if (!canceled1 || !canceled2) {
                resolveCancelPromise(undefined);
            }
            return null;
        });
    }
    function pullWithDefaultReader() {
        if (IsReadableStreamBYOBReader(reader)) {
            ReadableStreamReaderGenericRelease(reader);
            reader = AcquireReadableStreamDefaultReader(stream);
            forwardReaderError(reader);
        }
        var readRequest = {
            _chunkSteps: function (chunk) {
                // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
                // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
                // successful synchronously-available reads get ahead of asynchronously-available errors.
                _queueMicrotask(function () {
                    readAgainForBranch1 = false;
                    readAgainForBranch2 = false;
                    var chunk1 = chunk;
                    var chunk2 = chunk;
                    if (!canceled1 && !canceled2) {
                        try {
                            chunk2 = CloneAsUint8Array(chunk);
                        }
                        catch (cloneE) {
                            ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                            ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                            resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                            return;
                        }
                    }
                    if (!canceled1) {
                        ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                    }
                    if (!canceled2) {
                        ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                    }
                    reading = false;
                    if (readAgainForBranch1) {
                        pull1Algorithm();
                    }
                    else if (readAgainForBranch2) {
                        pull2Algorithm();
                    }
                });
            },
            _closeSteps: function () {
                reading = false;
                if (!canceled1) {
                    ReadableByteStreamControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                    ReadableByteStreamControllerClose(branch2._readableStreamController);
                }
                if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
                }
                if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
                }
                if (!canceled1 || !canceled2) {
                    resolveCancelPromise(undefined);
                }
            },
            _errorSteps: function () {
                reading = false;
            }
        };
        ReadableStreamDefaultReaderRead(reader, readRequest);
    }
    function pullWithBYOBReader(view, forBranch2) {
        if (IsReadableStreamDefaultReader(reader)) {
            ReadableStreamReaderGenericRelease(reader);
            reader = AcquireReadableStreamBYOBReader(stream);
            forwardReaderError(reader);
        }
        var byobBranch = forBranch2 ? branch2 : branch1;
        var otherBranch = forBranch2 ? branch1 : branch2;
        var readIntoRequest = {
            _chunkSteps: function (chunk) {
                // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
                // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
                // successful synchronously-available reads get ahead of asynchronously-available errors.
                _queueMicrotask(function () {
                    readAgainForBranch1 = false;
                    readAgainForBranch2 = false;
                    var byobCanceled = forBranch2 ? canceled2 : canceled1;
                    var otherCanceled = forBranch2 ? canceled1 : canceled2;
                    if (!otherCanceled) {
                        var clonedChunk = void 0;
                        try {
                            clonedChunk = CloneAsUint8Array(chunk);
                        }
                        catch (cloneE) {
                            ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                            ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                            resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                            return;
                        }
                        if (!byobCanceled) {
                            ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                        }
                        ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                    }
                    else if (!byobCanceled) {
                        ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    reading = false;
                    if (readAgainForBranch1) {
                        pull1Algorithm();
                    }
                    else if (readAgainForBranch2) {
                        pull2Algorithm();
                    }
                });
            },
            _closeSteps: function (chunk) {
                reading = false;
                var byobCanceled = forBranch2 ? canceled2 : canceled1;
                var otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!byobCanceled) {
                    ReadableByteStreamControllerClose(byobBranch._readableStreamController);
                }
                if (!otherCanceled) {
                    ReadableByteStreamControllerClose(otherBranch._readableStreamController);
                }
                if (chunk !== undefined) {
                    if (!byobCanceled) {
                        ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                        ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                    }
                }
                if (!byobCanceled || !otherCanceled) {
                    resolveCancelPromise(undefined);
                }
            },
            _errorSteps: function () {
                reading = false;
            }
        };
        ReadableStreamBYOBReaderRead(reader, view, 1, readIntoRequest);
    }
    function pull1Algorithm() {
        if (reading) {
            readAgainForBranch1 = true;
            return promiseResolvedWith(undefined);
        }
        reading = true;
        var byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
        if (byobRequest === null) {
            pullWithDefaultReader();
        }
        else {
            pullWithBYOBReader(byobRequest._view, false);
        }
        return promiseResolvedWith(undefined);
    }
    function pull2Algorithm() {
        if (reading) {
            readAgainForBranch2 = true;
            return promiseResolvedWith(undefined);
        }
        reading = true;
        var byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
        if (byobRequest === null) {
            pullWithDefaultReader();
        }
        else {
            pullWithBYOBReader(byobRequest._view, true);
        }
        return promiseResolvedWith(undefined);
    }
    function cancel1Algorithm(reason) {
        canceled1 = true;
        reason1 = reason;
        if (canceled2) {
            var compositeReason = CreateArrayFromList([reason1, reason2]);
            var cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function cancel2Algorithm(reason) {
        canceled2 = true;
        reason2 = reason;
        if (canceled1) {
            var compositeReason = CreateArrayFromList([reason1, reason2]);
            var cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function startAlgorithm() {
        return;
    }
    branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
    branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
    forwardReaderError(reader);
    return [branch1, branch2];
}

function isReadableStreamLike(stream) {
    return typeIsObject(stream) && typeof stream.getReader !== 'undefined';
}

function ReadableStreamFrom(source) {
    if (isReadableStreamLike(source)) {
        return ReadableStreamFromDefaultReader(source.getReader());
    }
    return ReadableStreamFromIterable(source);
}
function ReadableStreamFromIterable(asyncIterable) {
    var stream;
    var iteratorRecord = GetIterator(asyncIterable, 'async');
    var startAlgorithm = noop;
    function pullAlgorithm() {
        var nextResult;
        try {
            nextResult = IteratorNext(iteratorRecord);
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
        var nextPromise = promiseResolvedWith(nextResult);
        return transformPromiseWith(nextPromise, function (iterResult) {
            if (!typeIsObject(iterResult)) {
                throw new TypeError('The promise returned by the iterator.next() method must fulfill with an object');
            }
            var done = IteratorComplete(iterResult);
            if (done) {
                ReadableStreamDefaultControllerClose(stream._readableStreamController);
            }
            else {
                var value = IteratorValue(iterResult);
                ReadableStreamDefaultControllerEnqueue(stream._readableStreamController, value);
            }
        });
    }
    function cancelAlgorithm(reason) {
        var iterator = iteratorRecord.iterator;
        var returnMethod;
        try {
            returnMethod = GetMethod(iterator, 'return');
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
        if (returnMethod === undefined) {
            return promiseResolvedWith(undefined);
        }
        var returnResult;
        try {
            returnResult = reflectCall(returnMethod, iterator, [reason]);
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
        var returnPromise = promiseResolvedWith(returnResult);
        return transformPromiseWith(returnPromise, function (iterResult) {
            if (!typeIsObject(iterResult)) {
                throw new TypeError('The promise returned by the iterator.return() method must fulfill with an object');
            }
            return undefined;
        });
    }
    stream = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, 0);
    return stream;
}
function ReadableStreamFromDefaultReader(reader) {
    var stream;
    var startAlgorithm = noop;
    function pullAlgorithm() {
        var readPromise;
        try {
            readPromise = reader.read();
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
        return transformPromiseWith(readPromise, function (readResult) {
            if (!typeIsObject(readResult)) {
                throw new TypeError('The promise returned by the reader.read() method must fulfill with an object');
            }
            if (readResult.done) {
                ReadableStreamDefaultControllerClose(stream._readableStreamController);
            }
            else {
                var value = readResult.value;
                ReadableStreamDefaultControllerEnqueue(stream._readableStreamController, value);
            }
        });
    }
    function cancelAlgorithm(reason) {
        try {
            return promiseResolvedWith(reader.cancel(reason));
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
    }
    stream = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, 0);
    return stream;
}

function convertUnderlyingDefaultOrByteSource(source, context) {
    assertDictionary(source, context);
    var original = source;
    var autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
    var cancel = original === null || original === void 0 ? void 0 : original.cancel;
    var pull = original === null || original === void 0 ? void 0 : original.pull;
    var start = original === null || original === void 0 ? void 0 : original.start;
    var type = original === null || original === void 0 ? void 0 : original.type;
    return {
        autoAllocateChunkSize: autoAllocateChunkSize === undefined ?
            undefined :
            convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, "".concat(context, " has member 'autoAllocateChunkSize' that")),
        cancel: cancel === undefined ?
            undefined :
            convertUnderlyingSourceCancelCallback(cancel, original, "".concat(context, " has member 'cancel' that")),
        pull: pull === undefined ?
            undefined :
            convertUnderlyingSourcePullCallback(pull, original, "".concat(context, " has member 'pull' that")),
        start: start === undefined ?
            undefined :
            convertUnderlyingSourceStartCallback(start, original, "".concat(context, " has member 'start' that")),
        type: type === undefined ? undefined : convertReadableStreamType(type, "".concat(context, " has member 'type' that"))
    };
}
function convertUnderlyingSourceCancelCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (reason) { return promiseCall(fn, original, [reason]); };
}
function convertUnderlyingSourcePullCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (controller) { return promiseCall(fn, original, [controller]); };
}
function convertUnderlyingSourceStartCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (controller) { return reflectCall(fn, original, [controller]); };
}
function convertReadableStreamType(type, context) {
    type = "".concat(type);
    if (type !== 'bytes') {
        throw new TypeError("".concat(context, " '").concat(type, "' is not a valid enumeration value for ReadableStreamType"));
    }
    return type;
}

function convertIteratorOptions(options, context) {
    assertDictionary(options, context);
    var preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
    return { preventCancel: Boolean(preventCancel) };
}

function convertPipeOptions(options, context) {
    assertDictionary(options, context);
    var preventAbort = options === null || options === void 0 ? void 0 : options.preventAbort;
    var preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
    var preventClose = options === null || options === void 0 ? void 0 : options.preventClose;
    var signal = options === null || options === void 0 ? void 0 : options.signal;
    if (signal !== undefined) {
        assertAbortSignal(signal, "".concat(context, " has member 'signal' that"));
    }
    return {
        preventAbort: Boolean(preventAbort),
        preventCancel: Boolean(preventCancel),
        preventClose: Boolean(preventClose),
        signal: signal
    };
}
function assertAbortSignal(signal, context) {
    if (!isAbortSignal(signal)) {
        throw new TypeError("".concat(context, " is not an AbortSignal."));
    }
}

function convertReadableWritablePair(pair, context) {
    assertDictionary(pair, context);
    var readable = pair === null || pair === void 0 ? void 0 : pair.readable;
    assertRequiredField(readable, 'readable', 'ReadableWritablePair');
    assertReadableStream(readable, "".concat(context, " has member 'readable' that"));
    var writable = pair === null || pair === void 0 ? void 0 : pair.writable;
    assertRequiredField(writable, 'writable', 'ReadableWritablePair');
    assertWritableStream(writable, "".concat(context, " has member 'writable' that"));
    return { readable: readable, writable: writable };
}

/**
 * A readable stream represents a source of data, from which you can read.
 *
 * @public
 */
var ReadableStream = /** @class */ (function () {
    function ReadableStream(rawUnderlyingSource, rawStrategy) {
        if (rawUnderlyingSource === void 0) { rawUnderlyingSource = {}; }
        if (rawStrategy === void 0) { rawStrategy = {}; }
        if (rawUnderlyingSource === undefined) {
            rawUnderlyingSource = null;
        }
        else {
            assertObject(rawUnderlyingSource, 'First parameter');
        }
        var strategy = convertQueuingStrategy(rawStrategy, 'Second parameter');
        var underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, 'First parameter');
        InitializeReadableStream(this);
        if (underlyingSource.type === 'bytes') {
            if (strategy.size !== undefined) {
                throw new RangeError('The strategy for a byte stream cannot have a size function');
            }
            var highWaterMark = ExtractHighWaterMark(strategy, 0);
            SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
        }
        else {
            var sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            var highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
        }
    }
    Object.defineProperty(ReadableStream.prototype, "locked", {
        /**
         * Whether or not the readable stream is locked to a {@link ReadableStreamDefaultReader | reader}.
         */
        get: function () {
            if (!IsReadableStream(this)) {
                throw streamBrandCheckException$1('locked');
            }
            return IsReadableStreamLocked(this);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Cancels the stream, signaling a loss of interest in the stream by a consumer.
     *
     * The supplied `reason` argument will be given to the underlying source's {@link UnderlyingSource.cancel | cancel()}
     * method, which might or might not use it.
     */
    ReadableStream.prototype.cancel = function (reason) {
        if (reason === void 0) { reason = undefined; }
        if (!IsReadableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$1('cancel'));
        }
        if (IsReadableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError('Cannot cancel a stream that already has a reader'));
        }
        return ReadableStreamCancel(this, reason);
    };
    ReadableStream.prototype.getReader = function (rawOptions) {
        if (rawOptions === void 0) { rawOptions = undefined; }
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('getReader');
        }
        var options = convertReaderOptions(rawOptions, 'First parameter');
        if (options.mode === undefined) {
            return AcquireReadableStreamDefaultReader(this);
        }
        return AcquireReadableStreamBYOBReader(this);
    };
    ReadableStream.prototype.pipeThrough = function (rawTransform, rawOptions) {
        if (rawOptions === void 0) { rawOptions = {}; }
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('pipeThrough');
        }
        assertRequiredArgument(rawTransform, 1, 'pipeThrough');
        var transform = convertReadableWritablePair(rawTransform, 'First parameter');
        var options = convertPipeOptions(rawOptions, 'Second parameter');
        if (IsReadableStreamLocked(this)) {
            throw new TypeError('ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream');
        }
        if (IsWritableStreamLocked(transform.writable)) {
            throw new TypeError('ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream');
        }
        var promise = ReadableStreamPipeTo(this, transform.writable, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
        setPromiseIsHandledToTrue(promise);
        return transform.readable;
    };
    ReadableStream.prototype.pipeTo = function (destination, rawOptions) {
        if (rawOptions === void 0) { rawOptions = {}; }
        if (!IsReadableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$1('pipeTo'));
        }
        if (destination === undefined) {
            return promiseRejectedWith("Parameter 1 is required in 'pipeTo'.");
        }
        if (!IsWritableStream(destination)) {
            return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo's first argument must be a WritableStream"));
        }
        var options;
        try {
            options = convertPipeOptions(rawOptions, 'Second parameter');
        }
        catch (e) {
            return promiseRejectedWith(e);
        }
        if (IsReadableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError('ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream'));
        }
        if (IsWritableStreamLocked(destination)) {
            return promiseRejectedWith(new TypeError('ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream'));
        }
        return ReadableStreamPipeTo(this, destination, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
    };
    /**
     * Tees this readable stream, returning a two-element array containing the two resulting branches as
     * new {@link ReadableStream} instances.
     *
     * Teeing a stream will lock it, preventing any other consumer from acquiring a reader.
     * To cancel the stream, cancel both of the resulting branches; a composite cancellation reason will then be
     * propagated to the stream's underlying source.
     *
     * Note that the chunks seen in each branch will be the same object. If the chunks are not immutable,
     * this could allow interference between the two branches.
     */
    ReadableStream.prototype.tee = function () {
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('tee');
        }
        var branches = ReadableStreamTee(this);
        return CreateArrayFromList(branches);
    };
    ReadableStream.prototype.values = function (rawOptions) {
        if (rawOptions === void 0) { rawOptions = undefined; }
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('values');
        }
        var options = convertIteratorOptions(rawOptions, 'First parameter');
        return AcquireReadableStreamAsyncIterator(this, options.preventCancel);
    };
    ReadableStream.prototype[SymbolAsyncIterator] = function (options) {
        // Stub implementation, overridden below
        return this.values(options);
    };
    /**
     * Creates a new ReadableStream wrapping the provided iterable or async iterable.
     *
     * This can be used to adapt various kinds of objects into a readable stream,
     * such as an array, an async generator, or a Node.js readable stream.
     */
    ReadableStream.from = function (asyncIterable) {
        return ReadableStreamFrom(asyncIterable);
    };
    return ReadableStream;
}());
Object.defineProperties(ReadableStream, {
    from: { enumerable: true }
});
Object.defineProperties(ReadableStream.prototype, {
    cancel: { enumerable: true },
    getReader: { enumerable: true },
    pipeThrough: { enumerable: true },
    pipeTo: { enumerable: true },
    tee: { enumerable: true },
    values: { enumerable: true },
    locked: { enumerable: true }
});
setFunctionName(ReadableStream.from, 'from');
setFunctionName(ReadableStream.prototype.cancel, 'cancel');
setFunctionName(ReadableStream.prototype.getReader, 'getReader');
setFunctionName(ReadableStream.prototype.pipeThrough, 'pipeThrough');
setFunctionName(ReadableStream.prototype.pipeTo, 'pipeTo');
setFunctionName(ReadableStream.prototype.tee, 'tee');
setFunctionName(ReadableStream.prototype.values, 'values');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableStream.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableStream',
        configurable: true
    });
}
Object.defineProperty(ReadableStream.prototype, SymbolAsyncIterator, {
    value: ReadableStream.prototype.values,
    writable: true,
    configurable: true
});
// Abstract operations for the ReadableStream.
// Throws if and only if startAlgorithm throws.
function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
    if (highWaterMark === void 0) { highWaterMark = 1; }
    if (sizeAlgorithm === void 0) { sizeAlgorithm = function () { return 1; }; }
    var stream = Object.create(ReadableStream.prototype);
    InitializeReadableStream(stream);
    var controller = Object.create(ReadableStreamDefaultController.prototype);
    SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
    return stream;
}
// Throws if and only if startAlgorithm throws.
function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
    var stream = Object.create(ReadableStream.prototype);
    InitializeReadableStream(stream);
    var controller = Object.create(ReadableByteStreamController.prototype);
    SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, undefined);
    return stream;
}
function InitializeReadableStream(stream) {
    stream._state = 'readable';
    stream._reader = undefined;
    stream._storedError = undefined;
    stream._disturbed = false;
}
function IsReadableStream(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_readableStreamController')) {
        return false;
    }
    return x instanceof ReadableStream;
}
function IsReadableStreamLocked(stream) {
    if (stream._reader === undefined) {
        return false;
    }
    return true;
}
// ReadableStream API exposed for controllers.
function ReadableStreamCancel(stream, reason) {
    stream._disturbed = true;
    if (stream._state === 'closed') {
        return promiseResolvedWith(undefined);
    }
    if (stream._state === 'errored') {
        return promiseRejectedWith(stream._storedError);
    }
    ReadableStreamClose(stream);
    var reader = stream._reader;
    if (reader !== undefined && IsReadableStreamBYOBReader(reader)) {
        var readIntoRequests = reader._readIntoRequests;
        reader._readIntoRequests = new SimpleQueue();
        readIntoRequests.forEach(function (readIntoRequest) {
            readIntoRequest._closeSteps(undefined);
        });
    }
    var sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
    return transformPromiseWith(sourceCancelPromise, noop);
}
function ReadableStreamClose(stream) {
    stream._state = 'closed';
    var reader = stream._reader;
    if (reader === undefined) {
        return;
    }
    defaultReaderClosedPromiseResolve(reader);
    if (IsReadableStreamDefaultReader(reader)) {
        var readRequests = reader._readRequests;
        reader._readRequests = new SimpleQueue();
        readRequests.forEach(function (readRequest) {
            readRequest._closeSteps();
        });
    }
}
function ReadableStreamError(stream, e) {
    stream._state = 'errored';
    stream._storedError = e;
    var reader = stream._reader;
    if (reader === undefined) {
        return;
    }
    defaultReaderClosedPromiseReject(reader, e);
    if (IsReadableStreamDefaultReader(reader)) {
        ReadableStreamDefaultReaderErrorReadRequests(reader, e);
    }
    else {
        ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e);
    }
}
// Helper functions for the ReadableStream.
function streamBrandCheckException$1(name) {
    return new TypeError("ReadableStream.prototype.".concat(name, " can only be used on a ReadableStream"));
}

function convertQueuingStrategyInit(init, context) {
    assertDictionary(init, context);
    var highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
    assertRequiredField(highWaterMark, 'highWaterMark', 'QueuingStrategyInit');
    return {
        highWaterMark: convertUnrestrictedDouble(highWaterMark)
    };
}

// The size function must not have a prototype property nor be a constructor
var byteLengthSizeFunction = function (chunk) {
    return chunk.byteLength;
};
setFunctionName(byteLengthSizeFunction, 'size');
/**
 * A queuing strategy that counts the number of bytes in each chunk.
 *
 * @public
 */
var ByteLengthQueuingStrategy = /** @class */ (function () {
    function ByteLengthQueuingStrategy(options) {
        assertRequiredArgument(options, 1, 'ByteLengthQueuingStrategy');
        options = convertQueuingStrategyInit(options, 'First parameter');
        this._byteLengthQueuingStrategyHighWaterMark = options.highWaterMark;
    }
    Object.defineProperty(ByteLengthQueuingStrategy.prototype, "highWaterMark", {
        /**
         * Returns the high water mark provided to the constructor.
         */
        get: function () {
            if (!IsByteLengthQueuingStrategy(this)) {
                throw byteLengthBrandCheckException('highWaterMark');
            }
            return this._byteLengthQueuingStrategyHighWaterMark;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ByteLengthQueuingStrategy.prototype, "size", {
        /**
         * Measures the size of `chunk` by returning the value of its `byteLength` property.
         */
        get: function () {
            if (!IsByteLengthQueuingStrategy(this)) {
                throw byteLengthBrandCheckException('size');
            }
            return byteLengthSizeFunction;
        },
        enumerable: false,
        configurable: true
    });
    return ByteLengthQueuingStrategy;
}());
Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
    highWaterMark: { enumerable: true },
    size: { enumerable: true }
});
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
        value: 'ByteLengthQueuingStrategy',
        configurable: true
    });
}
// Helper functions for the ByteLengthQueuingStrategy.
function byteLengthBrandCheckException(name) {
    return new TypeError("ByteLengthQueuingStrategy.prototype.".concat(name, " can only be used on a ByteLengthQueuingStrategy"));
}
function IsByteLengthQueuingStrategy(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_byteLengthQueuingStrategyHighWaterMark')) {
        return false;
    }
    return x instanceof ByteLengthQueuingStrategy;
}

// The size function must not have a prototype property nor be a constructor
var countSizeFunction = function () {
    return 1;
};
setFunctionName(countSizeFunction, 'size');
/**
 * A queuing strategy that counts the number of chunks.
 *
 * @public
 */
var CountQueuingStrategy = /** @class */ (function () {
    function CountQueuingStrategy(options) {
        assertRequiredArgument(options, 1, 'CountQueuingStrategy');
        options = convertQueuingStrategyInit(options, 'First parameter');
        this._countQueuingStrategyHighWaterMark = options.highWaterMark;
    }
    Object.defineProperty(CountQueuingStrategy.prototype, "highWaterMark", {
        /**
         * Returns the high water mark provided to the constructor.
         */
        get: function () {
            if (!IsCountQueuingStrategy(this)) {
                throw countBrandCheckException('highWaterMark');
            }
            return this._countQueuingStrategyHighWaterMark;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CountQueuingStrategy.prototype, "size", {
        /**
         * Measures the size of `chunk` by always returning 1.
         * This ensures that the total queue size is a count of the number of chunks in the queue.
         */
        get: function () {
            if (!IsCountQueuingStrategy(this)) {
                throw countBrandCheckException('size');
            }
            return countSizeFunction;
        },
        enumerable: false,
        configurable: true
    });
    return CountQueuingStrategy;
}());
Object.defineProperties(CountQueuingStrategy.prototype, {
    highWaterMark: { enumerable: true },
    size: { enumerable: true }
});
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
        value: 'CountQueuingStrategy',
        configurable: true
    });
}
// Helper functions for the CountQueuingStrategy.
function countBrandCheckException(name) {
    return new TypeError("CountQueuingStrategy.prototype.".concat(name, " can only be used on a CountQueuingStrategy"));
}
function IsCountQueuingStrategy(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_countQueuingStrategyHighWaterMark')) {
        return false;
    }
    return x instanceof CountQueuingStrategy;
}

function convertTransformer(original, context) {
    assertDictionary(original, context);
    var cancel = original === null || original === void 0 ? void 0 : original.cancel;
    var flush = original === null || original === void 0 ? void 0 : original.flush;
    var readableType = original === null || original === void 0 ? void 0 : original.readableType;
    var start = original === null || original === void 0 ? void 0 : original.start;
    var transform = original === null || original === void 0 ? void 0 : original.transform;
    var writableType = original === null || original === void 0 ? void 0 : original.writableType;
    return {
        cancel: cancel === undefined ?
            undefined :
            convertTransformerCancelCallback(cancel, original, "".concat(context, " has member 'cancel' that")),
        flush: flush === undefined ?
            undefined :
            convertTransformerFlushCallback(flush, original, "".concat(context, " has member 'flush' that")),
        readableType: readableType,
        start: start === undefined ?
            undefined :
            convertTransformerStartCallback(start, original, "".concat(context, " has member 'start' that")),
        transform: transform === undefined ?
            undefined :
            convertTransformerTransformCallback(transform, original, "".concat(context, " has member 'transform' that")),
        writableType: writableType
    };
}
function convertTransformerFlushCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (controller) { return promiseCall(fn, original, [controller]); };
}
function convertTransformerStartCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (controller) { return reflectCall(fn, original, [controller]); };
}
function convertTransformerTransformCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (chunk, controller) { return promiseCall(fn, original, [chunk, controller]); };
}
function convertTransformerCancelCallback(fn, original, context) {
    assertFunction(fn, context);
    return function (reason) { return promiseCall(fn, original, [reason]); };
}

// Class TransformStream
/**
 * A transform stream consists of a pair of streams: a {@link WritableStream | writable stream},
 * known as its writable side, and a {@link ReadableStream | readable stream}, known as its readable side.
 * In a manner specific to the transform stream in question, writes to the writable side result in new data being
 * made available for reading from the readable side.
 *
 * @public
 */
var TransformStream = /** @class */ (function () {
    function TransformStream(rawTransformer, rawWritableStrategy, rawReadableStrategy) {
        if (rawTransformer === void 0) { rawTransformer = {}; }
        if (rawWritableStrategy === void 0) { rawWritableStrategy = {}; }
        if (rawReadableStrategy === void 0) { rawReadableStrategy = {}; }
        if (rawTransformer === undefined) {
            rawTransformer = null;
        }
        var writableStrategy = convertQueuingStrategy(rawWritableStrategy, 'Second parameter');
        var readableStrategy = convertQueuingStrategy(rawReadableStrategy, 'Third parameter');
        var transformer = convertTransformer(rawTransformer, 'First parameter');
        if (transformer.readableType !== undefined) {
            throw new RangeError('Invalid readableType specified');
        }
        if (transformer.writableType !== undefined) {
            throw new RangeError('Invalid writableType specified');
        }
        var readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
        var readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
        var writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
        var writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
        var startPromise_resolve;
        var startPromise = newPromise(function (resolve) {
            startPromise_resolve = resolve;
        });
        InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
        SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
        if (transformer.start !== undefined) {
            startPromise_resolve(transformer.start(this._transformStreamController));
        }
        else {
            startPromise_resolve(undefined);
        }
    }
    Object.defineProperty(TransformStream.prototype, "readable", {
        /**
         * The readable side of the transform stream.
         */
        get: function () {
            if (!IsTransformStream(this)) {
                throw streamBrandCheckException('readable');
            }
            return this._readable;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TransformStream.prototype, "writable", {
        /**
         * The writable side of the transform stream.
         */
        get: function () {
            if (!IsTransformStream(this)) {
                throw streamBrandCheckException('writable');
            }
            return this._writable;
        },
        enumerable: false,
        configurable: true
    });
    return TransformStream;
}());
Object.defineProperties(TransformStream.prototype, {
    readable: { enumerable: true },
    writable: { enumerable: true }
});
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
        value: 'TransformStream',
        configurable: true
    });
}
function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
    function startAlgorithm() {
        return startPromise;
    }
    function writeAlgorithm(chunk) {
        return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
    }
    function abortAlgorithm(reason) {
        return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
    }
    function closeAlgorithm() {
        return TransformStreamDefaultSinkCloseAlgorithm(stream);
    }
    stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
    function pullAlgorithm() {
        return TransformStreamDefaultSourcePullAlgorithm(stream);
    }
    function cancelAlgorithm(reason) {
        return TransformStreamDefaultSourceCancelAlgorithm(stream, reason);
    }
    stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
    // The [[backpressure]] slot is set to undefined so that it can be initialised by TransformStreamSetBackpressure.
    stream._backpressure = undefined;
    stream._backpressureChangePromise = undefined;
    stream._backpressureChangePromise_resolve = undefined;
    TransformStreamSetBackpressure(stream, true);
    stream._transformStreamController = undefined;
}
function IsTransformStream(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_transformStreamController')) {
        return false;
    }
    return x instanceof TransformStream;
}
// This is a no-op if both sides are already errored.
function TransformStreamError(stream, e) {
    ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e);
    TransformStreamErrorWritableAndUnblockWrite(stream, e);
}
function TransformStreamErrorWritableAndUnblockWrite(stream, e) {
    TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
    WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e);
    TransformStreamUnblockWrite(stream);
}
function TransformStreamUnblockWrite(stream) {
    if (stream._backpressure) {
        // Pretend that pull() was called to permit any pending write() calls to complete. TransformStreamSetBackpressure()
        // cannot be called from enqueue() or pull() once the ReadableStream is errored, so this will will be the final time
        // _backpressure is set.
        TransformStreamSetBackpressure(stream, false);
    }
}
function TransformStreamSetBackpressure(stream, backpressure) {
    // Passes also when called during construction.
    if (stream._backpressureChangePromise !== undefined) {
        stream._backpressureChangePromise_resolve();
    }
    stream._backpressureChangePromise = newPromise(function (resolve) {
        stream._backpressureChangePromise_resolve = resolve;
    });
    stream._backpressure = backpressure;
}
// Class TransformStreamDefaultController
/**
 * Allows control of the {@link ReadableStream} and {@link WritableStream} of the associated {@link TransformStream}.
 *
 * @public
 */
var TransformStreamDefaultController = /** @class */ (function () {
    function TransformStreamDefaultController() {
        throw new TypeError('Illegal constructor');
    }
    Object.defineProperty(TransformStreamDefaultController.prototype, "desiredSize", {
        /**
         * Returns the desired size to fill the readable side’s internal queue. It can be negative, if the queue is over-full.
         */
        get: function () {
            if (!IsTransformStreamDefaultController(this)) {
                throw defaultControllerBrandCheckException('desiredSize');
            }
            var readableController = this._controlledTransformStream._readable._readableStreamController;
            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
        },
        enumerable: false,
        configurable: true
    });
    TransformStreamDefaultController.prototype.enqueue = function (chunk) {
        if (chunk === void 0) { chunk = undefined; }
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('enqueue');
        }
        TransformStreamDefaultControllerEnqueue(this, chunk);
    };
    /**
     * Errors both the readable side and the writable side of the controlled transform stream, making all future
     * interactions with it fail with the given error `e`. Any chunks queued for transformation will be discarded.
     */
    TransformStreamDefaultController.prototype.error = function (reason) {
        if (reason === void 0) { reason = undefined; }
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('error');
        }
        TransformStreamDefaultControllerError(this, reason);
    };
    /**
     * Closes the readable side and errors the writable side of the controlled transform stream. This is useful when the
     * transformer only needs to consume a portion of the chunks written to the writable side.
     */
    TransformStreamDefaultController.prototype.terminate = function () {
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('terminate');
        }
        TransformStreamDefaultControllerTerminate(this);
    };
    return TransformStreamDefaultController;
}());
Object.defineProperties(TransformStreamDefaultController.prototype, {
    enqueue: { enumerable: true },
    error: { enumerable: true },
    terminate: { enumerable: true },
    desiredSize: { enumerable: true }
});
setFunctionName(TransformStreamDefaultController.prototype.enqueue, 'enqueue');
setFunctionName(TransformStreamDefaultController.prototype.error, 'error');
setFunctionName(TransformStreamDefaultController.prototype.terminate, 'terminate');
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
        value: 'TransformStreamDefaultController',
        configurable: true
    });
}
// Transform Stream Default Controller Abstract Operations
function IsTransformStreamDefaultController(x) {
    if (!typeIsObject(x)) {
        return false;
    }
    if (!Object.prototype.hasOwnProperty.call(x, '_controlledTransformStream')) {
        return false;
    }
    return x instanceof TransformStreamDefaultController;
}
function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm, cancelAlgorithm) {
    controller._controlledTransformStream = stream;
    stream._transformStreamController = controller;
    controller._transformAlgorithm = transformAlgorithm;
    controller._flushAlgorithm = flushAlgorithm;
    controller._cancelAlgorithm = cancelAlgorithm;
    controller._finishPromise = undefined;
    controller._finishPromise_resolve = undefined;
    controller._finishPromise_reject = undefined;
}
function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
    var controller = Object.create(TransformStreamDefaultController.prototype);
    var transformAlgorithm;
    var flushAlgorithm;
    var cancelAlgorithm;
    if (transformer.transform !== undefined) {
        transformAlgorithm = function (chunk) { return transformer.transform(chunk, controller); };
    }
    else {
        transformAlgorithm = function (chunk) {
            try {
                TransformStreamDefaultControllerEnqueue(controller, chunk);
                return promiseResolvedWith(undefined);
            }
            catch (transformResultE) {
                return promiseRejectedWith(transformResultE);
            }
        };
    }
    if (transformer.flush !== undefined) {
        flushAlgorithm = function () { return transformer.flush(controller); };
    }
    else {
        flushAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    if (transformer.cancel !== undefined) {
        cancelAlgorithm = function (reason) { return transformer.cancel(reason); };
    }
    else {
        cancelAlgorithm = function () { return promiseResolvedWith(undefined); };
    }
    SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm, cancelAlgorithm);
}
function TransformStreamDefaultControllerClearAlgorithms(controller) {
    controller._transformAlgorithm = undefined;
    controller._flushAlgorithm = undefined;
    controller._cancelAlgorithm = undefined;
}
function TransformStreamDefaultControllerEnqueue(controller, chunk) {
    var stream = controller._controlledTransformStream;
    var readableController = stream._readable._readableStreamController;
    if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
        throw new TypeError('Readable side is not in a state that permits enqueue');
    }
    // We throttle transform invocations based on the backpressure of the ReadableStream, but we still
    // accept TransformStreamDefaultControllerEnqueue() calls.
    try {
        ReadableStreamDefaultControllerEnqueue(readableController, chunk);
    }
    catch (e) {
        // This happens when readableStrategy.size() throws.
        TransformStreamErrorWritableAndUnblockWrite(stream, e);
        throw stream._readable._storedError;
    }
    var backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
    if (backpressure !== stream._backpressure) {
        TransformStreamSetBackpressure(stream, true);
    }
}
function TransformStreamDefaultControllerError(controller, e) {
    TransformStreamError(controller._controlledTransformStream, e);
}
function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
    var transformPromise = controller._transformAlgorithm(chunk);
    return transformPromiseWith(transformPromise, undefined, function (r) {
        TransformStreamError(controller._controlledTransformStream, r);
        throw r;
    });
}
function TransformStreamDefaultControllerTerminate(controller) {
    var stream = controller._controlledTransformStream;
    var readableController = stream._readable._readableStreamController;
    ReadableStreamDefaultControllerClose(readableController);
    var error = new TypeError('TransformStream terminated');
    TransformStreamErrorWritableAndUnblockWrite(stream, error);
}
// TransformStreamDefaultSink Algorithms
function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
    var controller = stream._transformStreamController;
    if (stream._backpressure) {
        var backpressureChangePromise = stream._backpressureChangePromise;
        return transformPromiseWith(backpressureChangePromise, function () {
            var writable = stream._writable;
            var state = writable._state;
            if (state === 'erroring') {
                throw writable._storedError;
            }
            return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        });
    }
    return TransformStreamDefaultControllerPerformTransform(controller, chunk);
}
function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
    var controller = stream._transformStreamController;
    if (controller._finishPromise !== undefined) {
        return controller._finishPromise;
    }
    // stream._readable cannot change after construction, so caching it across a call to user code is safe.
    var readable = stream._readable;
    // Assign the _finishPromise now so that if _cancelAlgorithm calls readable.cancel() internally,
    // we don't run the _cancelAlgorithm again.
    controller._finishPromise = newPromise(function (resolve, reject) {
        controller._finishPromise_resolve = resolve;
        controller._finishPromise_reject = reject;
    });
    var cancelPromise = controller._cancelAlgorithm(reason);
    TransformStreamDefaultControllerClearAlgorithms(controller);
    uponPromise(cancelPromise, function () {
        if (readable._state === 'errored') {
            defaultControllerFinishPromiseReject(controller, readable._storedError);
        }
        else {
            ReadableStreamDefaultControllerError(readable._readableStreamController, reason);
            defaultControllerFinishPromiseResolve(controller);
        }
        return null;
    }, function (r) {
        ReadableStreamDefaultControllerError(readable._readableStreamController, r);
        defaultControllerFinishPromiseReject(controller, r);
        return null;
    });
    return controller._finishPromise;
}
function TransformStreamDefaultSinkCloseAlgorithm(stream) {
    var controller = stream._transformStreamController;
    if (controller._finishPromise !== undefined) {
        return controller._finishPromise;
    }
    // stream._readable cannot change after construction, so caching it across a call to user code is safe.
    var readable = stream._readable;
    // Assign the _finishPromise now so that if _flushAlgorithm calls readable.cancel() internally,
    // we don't also run the _cancelAlgorithm.
    controller._finishPromise = newPromise(function (resolve, reject) {
        controller._finishPromise_resolve = resolve;
        controller._finishPromise_reject = reject;
    });
    var flushPromise = controller._flushAlgorithm();
    TransformStreamDefaultControllerClearAlgorithms(controller);
    uponPromise(flushPromise, function () {
        if (readable._state === 'errored') {
            defaultControllerFinishPromiseReject(controller, readable._storedError);
        }
        else {
            ReadableStreamDefaultControllerClose(readable._readableStreamController);
            defaultControllerFinishPromiseResolve(controller);
        }
        return null;
    }, function (r) {
        ReadableStreamDefaultControllerError(readable._readableStreamController, r);
        defaultControllerFinishPromiseReject(controller, r);
        return null;
    });
    return controller._finishPromise;
}
// TransformStreamDefaultSource Algorithms
function TransformStreamDefaultSourcePullAlgorithm(stream) {
    // Invariant. Enforced by the promises returned by start() and pull().
    TransformStreamSetBackpressure(stream, false);
    // Prevent the next pull() call until there is backpressure.
    return stream._backpressureChangePromise;
}
function TransformStreamDefaultSourceCancelAlgorithm(stream, reason) {
    var controller = stream._transformStreamController;
    if (controller._finishPromise !== undefined) {
        return controller._finishPromise;
    }
    // stream._writable cannot change after construction, so caching it across a call to user code is safe.
    var writable = stream._writable;
    // Assign the _finishPromise now so that if _flushAlgorithm calls writable.abort() or
    // writable.cancel() internally, we don't run the _cancelAlgorithm again, or also run the
    // _flushAlgorithm.
    controller._finishPromise = newPromise(function (resolve, reject) {
        controller._finishPromise_resolve = resolve;
        controller._finishPromise_reject = reject;
    });
    var cancelPromise = controller._cancelAlgorithm(reason);
    TransformStreamDefaultControllerClearAlgorithms(controller);
    uponPromise(cancelPromise, function () {
        if (writable._state === 'errored') {
            defaultControllerFinishPromiseReject(controller, writable._storedError);
        }
        else {
            WritableStreamDefaultControllerErrorIfNeeded(writable._writableStreamController, reason);
            TransformStreamUnblockWrite(stream);
            defaultControllerFinishPromiseResolve(controller);
        }
        return null;
    }, function (r) {
        WritableStreamDefaultControllerErrorIfNeeded(writable._writableStreamController, r);
        TransformStreamUnblockWrite(stream);
        defaultControllerFinishPromiseReject(controller, r);
        return null;
    });
    return controller._finishPromise;
}
// Helper functions for the TransformStreamDefaultController.
function defaultControllerBrandCheckException(name) {
    return new TypeError("TransformStreamDefaultController.prototype.".concat(name, " can only be used on a TransformStreamDefaultController"));
}
function defaultControllerFinishPromiseResolve(controller) {
    if (controller._finishPromise_resolve === undefined) {
        return;
    }
    controller._finishPromise_resolve();
    controller._finishPromise_resolve = undefined;
    controller._finishPromise_reject = undefined;
}
function defaultControllerFinishPromiseReject(controller, reason) {
    if (controller._finishPromise_reject === undefined) {
        return;
    }
    setPromiseIsHandledToTrue(controller._finishPromise);
    controller._finishPromise_reject(reason);
    controller._finishPromise_resolve = undefined;
    controller._finishPromise_reject = undefined;
}
// Helper functions for the TransformStream.
function streamBrandCheckException(name) {
    return new TypeError("TransformStream.prototype.".concat(name, " can only be used on a TransformStream"));
}

export { ByteLengthQueuingStrategy, CountQueuingStrategy, ReadableByteStreamController, ReadableStream, ReadableStreamBYOBReader, ReadableStreamBYOBRequest, ReadableStreamDefaultController, ReadableStreamDefaultReader, TransformStream, TransformStreamDefaultController, WritableStream, WritableStreamDefaultController, WritableStreamDefaultWriter };
//# sourceMappingURL=ponyfill.mjs.map
