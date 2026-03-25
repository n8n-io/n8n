/**
 * web-streams-polyfill v3.2.1
 */
/// <reference lib="es2015.symbol" />
const SymbolPolyfill = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ?
    Symbol :
    description => `Symbol(${description})`;

/// <reference lib="dom" />
function noop() {
    return undefined;
}
function getGlobals() {
    if (typeof self !== 'undefined') {
        return self;
    }
    else if (typeof window !== 'undefined') {
        return window;
    }
    else if (typeof global !== 'undefined') {
        return global;
    }
    return undefined;
}
const globals = getGlobals();

function typeIsObject(x) {
    return (typeof x === 'object' && x !== null) || typeof x === 'function';
}
const rethrowAssertionErrorRejection = noop;

const originalPromise = Promise;
const originalPromiseThen = Promise.prototype.then;
const originalPromiseResolve = Promise.resolve.bind(originalPromise);
const originalPromiseReject = Promise.reject.bind(originalPromise);
function newPromise(executor) {
    return new originalPromise(executor);
}
function promiseResolvedWith(value) {
    return originalPromiseResolve(value);
}
function promiseRejectedWith(reason) {
    return originalPromiseReject(reason);
}
function PerformPromiseThen(promise, onFulfilled, onRejected) {
    // There doesn't appear to be any way to correctly emulate the behaviour from JavaScript, so this is just an
    // approximation.
    return originalPromiseThen.call(promise, onFulfilled, onRejected);
}
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
const queueMicrotask = (() => {
    const globalQueueMicrotask = globals && globals.queueMicrotask;
    if (typeof globalQueueMicrotask === 'function') {
        return globalQueueMicrotask;
    }
    const resolvedPromise = promiseResolvedWith(undefined);
    return (fn) => PerformPromiseThen(resolvedPromise, fn);
})();
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
const QUEUE_MAX_ARRAY_SIZE = 16384;
/**
 * Simple queue structure.
 *
 * Avoids scalability issues with using a packed array directly by using
 * multiple arrays in a linked list and keeping the array size bounded.
 */
class SimpleQueue {
    constructor() {
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
    get length() {
        return this._size;
    }
    // For exception safety, this method is structured in order:
    // 1. Read state
    // 2. Calculate required state mutations
    // 3. Perform state mutations
    push(element) {
        const oldBack = this._back;
        let newBack = oldBack;
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
    }
    // Like push(), shift() follows the read -> calculate -> mutate pattern for
    // exception safety.
    shift() { // must not be called on an empty queue
        const oldFront = this._front;
        let newFront = oldFront;
        const oldCursor = this._cursor;
        let newCursor = oldCursor + 1;
        const elements = oldFront._elements;
        const element = elements[oldCursor];
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
    }
    // The tricky thing about forEach() is that it can be called
    // re-entrantly. The queue may be mutated inside the callback. It is easy to
    // see that push() within the callback has no negative effects since the end
    // of the queue is checked for on every iteration. If shift() is called
    // repeatedly within the callback then the next iteration may return an
    // element that has been removed. In this case the callback will be called
    // with undefined values until we either "catch up" with elements that still
    // exist or reach the back of the queue.
    forEach(callback) {
        let i = this._cursor;
        let node = this._front;
        let elements = node._elements;
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
    }
    // Return the element that would be returned if shift() was called now,
    // without modifying the queue.
    peek() { // must not be called on an empty queue
        const front = this._front;
        const cursor = this._cursor;
        return front._elements[cursor];
    }
}

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
    const stream = reader._ownerReadableStream;
    return ReadableStreamCancel(stream, reason);
}
function ReadableStreamReaderGenericRelease(reader) {
    if (reader._ownerReadableStream._state === 'readable') {
        defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
    }
    else {
        defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
    }
    reader._ownerReadableStream._reader = undefined;
    reader._ownerReadableStream = undefined;
}
// Helper functions for the readers.
function readerLockException(name) {
    return new TypeError('Cannot ' + name + ' a stream using a released reader');
}
// Helper functions for the ReadableStreamDefaultReader.
function defaultReaderClosedPromiseInitialize(reader) {
    reader._closedPromise = newPromise((resolve, reject) => {
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

const AbortSteps = SymbolPolyfill('[[AbortSteps]]');
const ErrorSteps = SymbolPolyfill('[[ErrorSteps]]');
const CancelSteps = SymbolPolyfill('[[CancelSteps]]');
const PullSteps = SymbolPolyfill('[[PullSteps]]');

/// <reference lib="es2015.core" />
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite#Polyfill
const NumberIsFinite = Number.isFinite || function (x) {
    return typeof x === 'number' && isFinite(x);
};

/// <reference lib="es2015.core" />
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc#Polyfill
const MathTrunc = Math.trunc || function (v) {
    return v < 0 ? Math.ceil(v) : Math.floor(v);
};

// https://heycam.github.io/webidl/#idl-dictionaries
function isDictionary(x) {
    return typeof x === 'object' || typeof x === 'function';
}
function assertDictionary(obj, context) {
    if (obj !== undefined && !isDictionary(obj)) {
        throw new TypeError(`${context} is not an object.`);
    }
}
// https://heycam.github.io/webidl/#idl-callback-functions
function assertFunction(x, context) {
    if (typeof x !== 'function') {
        throw new TypeError(`${context} is not a function.`);
    }
}
// https://heycam.github.io/webidl/#idl-object
function isObject(x) {
    return (typeof x === 'object' && x !== null) || typeof x === 'function';
}
function assertObject(x, context) {
    if (!isObject(x)) {
        throw new TypeError(`${context} is not an object.`);
    }
}
function assertRequiredArgument(x, position, context) {
    if (x === undefined) {
        throw new TypeError(`Parameter ${position} is required in '${context}'.`);
    }
}
function assertRequiredField(x, field, context) {
    if (x === undefined) {
        throw new TypeError(`${field} is required in '${context}'.`);
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
    const lowerBound = 0;
    const upperBound = Number.MAX_SAFE_INTEGER;
    let x = Number(value);
    x = censorNegativeZero(x);
    if (!NumberIsFinite(x)) {
        throw new TypeError(`${context} is not a finite number`);
    }
    x = integerPart(x);
    if (x < lowerBound || x > upperBound) {
        throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
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
        throw new TypeError(`${context} is not a ReadableStream.`);
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
    const reader = stream._reader;
    const readRequest = reader._readRequests.shift();
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
    const reader = stream._reader;
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
class ReadableStreamDefaultReader {
    constructor(stream) {
        assertRequiredArgument(stream, 1, 'ReadableStreamDefaultReader');
        assertReadableStream(stream, 'First parameter');
        if (IsReadableStreamLocked(stream)) {
            throw new TypeError('This stream has already been locked for exclusive reading by another reader');
        }
        ReadableStreamReaderGenericInitialize(this, stream);
        this._readRequests = new SimpleQueue();
    }
    /**
     * Returns a promise that will be fulfilled when the stream becomes closed,
     * or rejected if the stream ever errors or the reader's lock is released before the stream finishes closing.
     */
    get closed() {
        if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException('closed'));
        }
        return this._closedPromise;
    }
    /**
     * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
     */
    cancel(reason = undefined) {
        if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException('cancel'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('cancel'));
        }
        return ReadableStreamReaderGenericCancel(this, reason);
    }
    /**
     * Returns a promise that allows access to the next chunk from the stream's internal queue, if available.
     *
     * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
     */
    read() {
        if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException('read'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('read from'));
        }
        let resolvePromise;
        let rejectPromise;
        const promise = newPromise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        const readRequest = {
            _chunkSteps: chunk => resolvePromise({ value: chunk, done: false }),
            _closeSteps: () => resolvePromise({ value: undefined, done: true }),
            _errorSteps: e => rejectPromise(e)
        };
        ReadableStreamDefaultReaderRead(this, readRequest);
        return promise;
    }
    /**
     * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
     * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
     * from now on; otherwise, the reader will appear closed.
     *
     * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
     * the reader's {@link ReadableStreamDefaultReader.read | read()} method has not yet been settled. Attempting to
     * do so will throw a `TypeError` and leave the reader locked to the stream.
     */
    releaseLock() {
        if (!IsReadableStreamDefaultReader(this)) {
            throw defaultReaderBrandCheckException('releaseLock');
        }
        if (this._ownerReadableStream === undefined) {
            return;
        }
        if (this._readRequests.length > 0) {
            throw new TypeError('Tried to release a reader lock when that reader has pending read() calls un-settled');
        }
        ReadableStreamReaderGenericRelease(this);
    }
}
Object.defineProperties(ReadableStreamDefaultReader.prototype, {
    cancel: { enumerable: true },
    read: { enumerable: true },
    releaseLock: { enumerable: true },
    closed: { enumerable: true }
});
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
    const stream = reader._ownerReadableStream;
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
// Helper functions for the ReadableStreamDefaultReader.
function defaultReaderBrandCheckException(name) {
    return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
}

/// <reference lib="es2018.asynciterable" />
/* eslint-disable @typescript-eslint/no-empty-function */
const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () { }).prototype);

/// <reference lib="es2018.asynciterable" />
class ReadableStreamAsyncIteratorImpl {
    constructor(reader, preventCancel) {
        this._ongoingPromise = undefined;
        this._isFinished = false;
        this._reader = reader;
        this._preventCancel = preventCancel;
    }
    next() {
        const nextSteps = () => this._nextSteps();
        this._ongoingPromise = this._ongoingPromise ?
            transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) :
            nextSteps();
        return this._ongoingPromise;
    }
    return(value) {
        const returnSteps = () => this._returnSteps(value);
        return this._ongoingPromise ?
            transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) :
            returnSteps();
    }
    _nextSteps() {
        if (this._isFinished) {
            return Promise.resolve({ value: undefined, done: true });
        }
        const reader = this._reader;
        if (reader._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('iterate'));
        }
        let resolvePromise;
        let rejectPromise;
        const promise = newPromise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        const readRequest = {
            _chunkSteps: chunk => {
                this._ongoingPromise = undefined;
                // This needs to be delayed by one microtask, otherwise we stop pulling too early which breaks a test.
                // FIXME Is this a bug in the specification, or in the test?
                queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
            },
            _closeSteps: () => {
                this._ongoingPromise = undefined;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: undefined, done: true });
            },
            _errorSteps: reason => {
                this._ongoingPromise = undefined;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
            }
        };
        ReadableStreamDefaultReaderRead(reader, readRequest);
        return promise;
    }
    _returnSteps(value) {
        if (this._isFinished) {
            return Promise.resolve({ value, done: true });
        }
        this._isFinished = true;
        const reader = this._reader;
        if (reader._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('finish iterating'));
        }
        if (!this._preventCancel) {
            const result = ReadableStreamReaderGenericCancel(reader, value);
            ReadableStreamReaderGenericRelease(reader);
            return transformPromiseWith(result, () => ({ value, done: true }));
        }
        ReadableStreamReaderGenericRelease(reader);
        return promiseResolvedWith({ value, done: true });
    }
}
const ReadableStreamAsyncIteratorPrototype = {
    next() {
        if (!IsReadableStreamAsyncIterator(this)) {
            return promiseRejectedWith(streamAsyncIteratorBrandCheckException('next'));
        }
        return this._asyncIteratorImpl.next();
    },
    return(value) {
        if (!IsReadableStreamAsyncIterator(this)) {
            return promiseRejectedWith(streamAsyncIteratorBrandCheckException('return'));
        }
        return this._asyncIteratorImpl.return(value);
    }
};
if (AsyncIteratorPrototype !== undefined) {
    Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
}
// Abstract operations for the ReadableStream.
function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
    const reader = AcquireReadableStreamDefaultReader(stream);
    const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
    const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
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
    return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
}

/// <reference lib="es2015.core" />
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN#Polyfill
const NumberIsNaN = Number.isNaN || function (x) {
    // eslint-disable-next-line no-self-compare
    return x !== x;
};

function CreateArrayFromList(elements) {
    // We use arrays to represent lists, so this is basically a no-op.
    // Do a slice though just in case we happen to depend on the unique-ness.
    return elements.slice();
}
function CopyDataBlockBytes(dest, destOffset, src, srcOffset, n) {
    new Uint8Array(dest).set(new Uint8Array(src, srcOffset, n), destOffset);
}
// Not implemented correctly
function TransferArrayBuffer(O) {
    return O;
}
// Not implemented correctly
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IsDetachedBuffer(O) {
    return false;
}
function ArrayBufferSlice(buffer, begin, end) {
    // ArrayBuffer.prototype.slice is not available on IE10
    // https://www.caniuse.com/mdn-javascript_builtins_arraybuffer_slice
    if (buffer.slice) {
        return buffer.slice(begin, end);
    }
    const length = end - begin;
    const slice = new ArrayBuffer(length);
    CopyDataBlockBytes(slice, 0, buffer, begin, length);
    return slice;
}

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
    const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
    return new Uint8Array(buffer);
}

function DequeueValue(container) {
    const pair = container._queue.shift();
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
    container._queue.push({ value, size });
    container._queueTotalSize += size;
}
function PeekQueueValue(container) {
    const pair = container._queue.peek();
    return pair.value;
}
function ResetQueue(container) {
    container._queue = new SimpleQueue();
    container._queueTotalSize = 0;
}

/**
 * A pull-into request in a {@link ReadableByteStreamController}.
 *
 * @public
 */
class ReadableStreamBYOBRequest {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
    /**
     * Returns the view for writing in to, or `null` if the BYOB request has already been responded to.
     */
    get view() {
        if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException('view');
        }
        return this._view;
    }
    respond(bytesWritten) {
        if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException('respond');
        }
        assertRequiredArgument(bytesWritten, 1, 'respond');
        bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, 'First parameter');
        if (this._associatedReadableByteStreamController === undefined) {
            throw new TypeError('This BYOB request has been invalidated');
        }
        if (IsDetachedBuffer(this._view.buffer)) ;
        ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
    }
    respondWithNewView(view) {
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
        if (IsDetachedBuffer(view.buffer)) ;
        ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
    }
}
Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
    respond: { enumerable: true },
    respondWithNewView: { enumerable: true },
    view: { enumerable: true }
});
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
class ReadableByteStreamController {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
    /**
     * Returns the current BYOB pull request, or `null` if there isn't one.
     */
    get byobRequest() {
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('byobRequest');
        }
        return ReadableByteStreamControllerGetBYOBRequest(this);
    }
    /**
     * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
     * over-full. An underlying byte source ought to use this information to determine when and how to apply backpressure.
     */
    get desiredSize() {
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('desiredSize');
        }
        return ReadableByteStreamControllerGetDesiredSize(this);
    }
    /**
     * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
     * the stream, but once those are read, the stream will become closed.
     */
    close() {
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('close');
        }
        if (this._closeRequested) {
            throw new TypeError('The stream has already been closed; do not close it again!');
        }
        const state = this._controlledReadableByteStream._state;
        if (state !== 'readable') {
            throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
        }
        ReadableByteStreamControllerClose(this);
    }
    enqueue(chunk) {
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
            throw new TypeError(`chunk's buffer must have non-zero byteLength`);
        }
        if (this._closeRequested) {
            throw new TypeError('stream is closed or draining');
        }
        const state = this._controlledReadableByteStream._state;
        if (state !== 'readable') {
            throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
        }
        ReadableByteStreamControllerEnqueue(this, chunk);
    }
    /**
     * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
     */
    error(e = undefined) {
        if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException('error');
        }
        ReadableByteStreamControllerError(this, e);
    }
    /** @internal */
    [CancelSteps](reason) {
        ReadableByteStreamControllerClearPendingPullIntos(this);
        ResetQueue(this);
        const result = this._cancelAlgorithm(reason);
        ReadableByteStreamControllerClearAlgorithms(this);
        return result;
    }
    /** @internal */
    [PullSteps](readRequest) {
        const stream = this._controlledReadableByteStream;
        if (this._queueTotalSize > 0) {
            const entry = this._queue.shift();
            this._queueTotalSize -= entry.byteLength;
            ReadableByteStreamControllerHandleQueueDrain(this);
            const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
            readRequest._chunkSteps(view);
            return;
        }
        const autoAllocateChunkSize = this._autoAllocateChunkSize;
        if (autoAllocateChunkSize !== undefined) {
            let buffer;
            try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
            }
            catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
            }
            const pullIntoDescriptor = {
                buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: 'default'
            };
            this._pendingPullIntos.push(pullIntoDescriptor);
        }
        ReadableStreamAddReadRequest(stream, readRequest);
        ReadableByteStreamControllerCallPullIfNeeded(this);
    }
}
Object.defineProperties(ReadableByteStreamController.prototype, {
    close: { enumerable: true },
    enqueue: { enumerable: true },
    error: { enumerable: true },
    byobRequest: { enumerable: true },
    desiredSize: { enumerable: true }
});
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
    const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
    if (!shouldPull) {
        return;
    }
    if (controller._pulling) {
        controller._pullAgain = true;
        return;
    }
    controller._pulling = true;
    // TODO: Test controller argument
    const pullPromise = controller._pullAlgorithm();
    uponPromise(pullPromise, () => {
        controller._pulling = false;
        if (controller._pullAgain) {
            controller._pullAgain = false;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
    }, e => {
        ReadableByteStreamControllerError(controller, e);
    });
}
function ReadableByteStreamControllerClearPendingPullIntos(controller) {
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    controller._pendingPullIntos = new SimpleQueue();
}
function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
    let done = false;
    if (stream._state === 'closed') {
        done = true;
    }
    const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
    if (pullIntoDescriptor.readerType === 'default') {
        ReadableStreamFulfillReadRequest(stream, filledView, done);
    }
    else {
        ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
    }
}
function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
    const bytesFilled = pullIntoDescriptor.bytesFilled;
    const elementSize = pullIntoDescriptor.elementSize;
    return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
}
function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
    controller._queue.push({ buffer, byteOffset, byteLength });
    controller._queueTotalSize += byteLength;
}
function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
    const elementSize = pullIntoDescriptor.elementSize;
    const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
    const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
    const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
    const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
    let totalBytesToCopyRemaining = maxBytesToCopy;
    let ready = false;
    if (maxAlignedBytes > currentAlignedBytes) {
        totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
        ready = true;
    }
    const queue = controller._queue;
    while (totalBytesToCopyRemaining > 0) {
        const headOfQueue = queue.peek();
        const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
        const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
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
        const pullIntoDescriptor = controller._pendingPullIntos.peek();
        if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
            ReadableByteStreamControllerShiftPendingPullInto(controller);
            ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
        }
    }
}
function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
    const stream = controller._controlledReadableByteStream;
    let elementSize = 1;
    if (view.constructor !== DataView) {
        elementSize = view.constructor.BYTES_PER_ELEMENT;
    }
    const ctor = view.constructor;
    // try {
    const buffer = TransferArrayBuffer(view.buffer);
    // } catch (e) {
    //   readIntoRequest._errorSteps(e);
    //   return;
    // }
    const pullIntoDescriptor = {
        buffer,
        bufferByteLength: buffer.byteLength,
        byteOffset: view.byteOffset,
        byteLength: view.byteLength,
        bytesFilled: 0,
        elementSize,
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
        const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
        readIntoRequest._closeSteps(emptyView);
        return;
    }
    if (controller._queueTotalSize > 0) {
        if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
            const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
            ReadableByteStreamControllerHandleQueueDrain(controller);
            readIntoRequest._chunkSteps(filledView);
            return;
        }
        if (controller._closeRequested) {
            const e = new TypeError('Insufficient bytes to fill elements in the given buffer');
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
    const stream = controller._controlledReadableByteStream;
    if (ReadableStreamHasBYOBReader(stream)) {
        while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
            ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
        }
    }
}
function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
    ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
    if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
        return;
    }
    ReadableByteStreamControllerShiftPendingPullInto(controller);
    const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
    if (remainderSize > 0) {
        const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
        const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
        ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
    }
    pullIntoDescriptor.bytesFilled -= remainderSize;
    ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
    ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
}
function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
    const firstDescriptor = controller._pendingPullIntos.peek();
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    const state = controller._controlledReadableByteStream._state;
    if (state === 'closed') {
        ReadableByteStreamControllerRespondInClosedState(controller);
    }
    else {
        ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
    }
    ReadableByteStreamControllerCallPullIfNeeded(controller);
}
function ReadableByteStreamControllerShiftPendingPullInto(controller) {
    const descriptor = controller._pendingPullIntos.shift();
    return descriptor;
}
function ReadableByteStreamControllerShouldCallPull(controller) {
    const stream = controller._controlledReadableByteStream;
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
    const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
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
    const stream = controller._controlledReadableByteStream;
    if (controller._closeRequested || stream._state !== 'readable') {
        return;
    }
    if (controller._queueTotalSize > 0) {
        controller._closeRequested = true;
        return;
    }
    if (controller._pendingPullIntos.length > 0) {
        const firstPendingPullInto = controller._pendingPullIntos.peek();
        if (firstPendingPullInto.bytesFilled > 0) {
            const e = new TypeError('Insufficient bytes to fill elements in the given buffer');
            ReadableByteStreamControllerError(controller, e);
            throw e;
        }
    }
    ReadableByteStreamControllerClearAlgorithms(controller);
    ReadableStreamClose(stream);
}
function ReadableByteStreamControllerEnqueue(controller, chunk) {
    const stream = controller._controlledReadableByteStream;
    if (controller._closeRequested || stream._state !== 'readable') {
        return;
    }
    const buffer = chunk.buffer;
    const byteOffset = chunk.byteOffset;
    const byteLength = chunk.byteLength;
    const transferredBuffer = TransferArrayBuffer(buffer);
    if (controller._pendingPullIntos.length > 0) {
        const firstPendingPullInto = controller._pendingPullIntos.peek();
        if (IsDetachedBuffer(firstPendingPullInto.buffer)) ;
        firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
    }
    ReadableByteStreamControllerInvalidateBYOBRequest(controller);
    if (ReadableStreamHasDefaultReader(stream)) {
        if (ReadableStreamGetNumReadRequests(stream) === 0) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
        }
        else {
            if (controller._pendingPullIntos.length > 0) {
                ReadableByteStreamControllerShiftPendingPullInto(controller);
            }
            const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
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
    const stream = controller._controlledReadableByteStream;
    if (stream._state !== 'readable') {
        return;
    }
    ReadableByteStreamControllerClearPendingPullIntos(controller);
    ResetQueue(controller);
    ReadableByteStreamControllerClearAlgorithms(controller);
    ReadableStreamError(stream, e);
}
function ReadableByteStreamControllerGetBYOBRequest(controller) {
    if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
        const firstDescriptor = controller._pendingPullIntos.peek();
        const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
        const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
        SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
        controller._byobRequest = byobRequest;
    }
    return controller._byobRequest;
}
function ReadableByteStreamControllerGetDesiredSize(controller) {
    const state = controller._controlledReadableByteStream._state;
    if (state === 'errored') {
        return null;
    }
    if (state === 'closed') {
        return 0;
    }
    return controller._strategyHWM - controller._queueTotalSize;
}
function ReadableByteStreamControllerRespond(controller, bytesWritten) {
    const firstDescriptor = controller._pendingPullIntos.peek();
    const state = controller._controlledReadableByteStream._state;
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
    const firstDescriptor = controller._pendingPullIntos.peek();
    const state = controller._controlledReadableByteStream._state;
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
    const viewByteLength = view.byteLength;
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
    const startResult = startAlgorithm();
    uponPromise(promiseResolvedWith(startResult), () => {
        controller._started = true;
        ReadableByteStreamControllerCallPullIfNeeded(controller);
    }, r => {
        ReadableByteStreamControllerError(controller, r);
    });
}
function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
    const controller = Object.create(ReadableByteStreamController.prototype);
    let startAlgorithm = () => undefined;
    let pullAlgorithm = () => promiseResolvedWith(undefined);
    let cancelAlgorithm = () => promiseResolvedWith(undefined);
    if (underlyingByteSource.start !== undefined) {
        startAlgorithm = () => underlyingByteSource.start(controller);
    }
    if (underlyingByteSource.pull !== undefined) {
        pullAlgorithm = () => underlyingByteSource.pull(controller);
    }
    if (underlyingByteSource.cancel !== undefined) {
        cancelAlgorithm = reason => underlyingByteSource.cancel(reason);
    }
    const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
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
    return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
}
// Helper functions for the ReadableByteStreamController.
function byteStreamControllerBrandCheckException(name) {
    return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
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
    const reader = stream._reader;
    const readIntoRequest = reader._readIntoRequests.shift();
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
    const reader = stream._reader;
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
class ReadableStreamBYOBReader {
    constructor(stream) {
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
    /**
     * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
     * the reader's lock is released before the stream finishes closing.
     */
    get closed() {
        if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException('closed'));
        }
        return this._closedPromise;
    }
    /**
     * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
     */
    cancel(reason = undefined) {
        if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException('cancel'));
        }
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('cancel'));
        }
        return ReadableStreamReaderGenericCancel(this, reason);
    }
    /**
     * Attempts to reads bytes into view, and returns a promise resolved with the result.
     *
     * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
     */
    read(view) {
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
            return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
        }
        if (IsDetachedBuffer(view.buffer)) ;
        if (this._ownerReadableStream === undefined) {
            return promiseRejectedWith(readerLockException('read from'));
        }
        let resolvePromise;
        let rejectPromise;
        const promise = newPromise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        const readIntoRequest = {
            _chunkSteps: chunk => resolvePromise({ value: chunk, done: false }),
            _closeSteps: chunk => resolvePromise({ value: chunk, done: true }),
            _errorSteps: e => rejectPromise(e)
        };
        ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
        return promise;
    }
    /**
     * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
     * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
     * from now on; otherwise, the reader will appear closed.
     *
     * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
     * the reader's {@link ReadableStreamBYOBReader.read | read()} method has not yet been settled. Attempting to
     * do so will throw a `TypeError` and leave the reader locked to the stream.
     */
    releaseLock() {
        if (!IsReadableStreamBYOBReader(this)) {
            throw byobReaderBrandCheckException('releaseLock');
        }
        if (this._ownerReadableStream === undefined) {
            return;
        }
        if (this._readIntoRequests.length > 0) {
            throw new TypeError('Tried to release a reader lock when that reader has pending read() calls un-settled');
        }
        ReadableStreamReaderGenericRelease(this);
    }
}
Object.defineProperties(ReadableStreamBYOBReader.prototype, {
    cancel: { enumerable: true },
    read: { enumerable: true },
    releaseLock: { enumerable: true },
    closed: { enumerable: true }
});
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
function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
    const stream = reader._ownerReadableStream;
    stream._disturbed = true;
    if (stream._state === 'errored') {
        readIntoRequest._errorSteps(stream._storedError);
    }
    else {
        ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
    }
}
// Helper functions for the ReadableStreamBYOBReader.
function byobReaderBrandCheckException(name) {
    return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
}

function ExtractHighWaterMark(strategy, defaultHWM) {
    const { highWaterMark } = strategy;
    if (highWaterMark === undefined) {
        return defaultHWM;
    }
    if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
        throw new RangeError('Invalid highWaterMark');
    }
    return highWaterMark;
}
function ExtractSizeAlgorithm(strategy) {
    const { size } = strategy;
    if (!size) {
        return () => 1;
    }
    return size;
}

function convertQueuingStrategy(init, context) {
    assertDictionary(init, context);
    const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
    const size = init === null || init === void 0 ? void 0 : init.size;
    return {
        highWaterMark: highWaterMark === undefined ? undefined : convertUnrestrictedDouble(highWaterMark),
        size: size === undefined ? undefined : convertQueuingStrategySize(size, `${context} has member 'size' that`)
    };
}
function convertQueuingStrategySize(fn, context) {
    assertFunction(fn, context);
    return chunk => convertUnrestrictedDouble(fn(chunk));
}

function convertUnderlyingSink(original, context) {
    assertDictionary(original, context);
    const abort = original === null || original === void 0 ? void 0 : original.abort;
    const close = original === null || original === void 0 ? void 0 : original.close;
    const start = original === null || original === void 0 ? void 0 : original.start;
    const type = original === null || original === void 0 ? void 0 : original.type;
    const write = original === null || original === void 0 ? void 0 : original.write;
    return {
        abort: abort === undefined ?
            undefined :
            convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
        close: close === undefined ?
            undefined :
            convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
        start: start === undefined ?
            undefined :
            convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
        write: write === undefined ?
            undefined :
            convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
        type
    };
}
function convertUnderlyingSinkAbortCallback(fn, original, context) {
    assertFunction(fn, context);
    return (reason) => promiseCall(fn, original, [reason]);
}
function convertUnderlyingSinkCloseCallback(fn, original, context) {
    assertFunction(fn, context);
    return () => promiseCall(fn, original, []);
}
function convertUnderlyingSinkStartCallback(fn, original, context) {
    assertFunction(fn, context);
    return (controller) => reflectCall(fn, original, [controller]);
}
function convertUnderlyingSinkWriteCallback(fn, original, context) {
    assertFunction(fn, context);
    return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
}

function assertWritableStream(x, context) {
    if (!IsWritableStream(x)) {
        throw new TypeError(`${context} is not a WritableStream.`);
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
const supportsAbortController = typeof AbortController === 'function';
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
class WritableStream {
    constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
        if (rawUnderlyingSink === undefined) {
            rawUnderlyingSink = null;
        }
        else {
            assertObject(rawUnderlyingSink, 'First parameter');
        }
        const strategy = convertQueuingStrategy(rawStrategy, 'Second parameter');
        const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, 'First parameter');
        InitializeWritableStream(this);
        const type = underlyingSink.type;
        if (type !== undefined) {
            throw new RangeError('Invalid type is specified');
        }
        const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
        const highWaterMark = ExtractHighWaterMark(strategy, 1);
        SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
    }
    /**
     * Returns whether or not the writable stream is locked to a writer.
     */
    get locked() {
        if (!IsWritableStream(this)) {
            throw streamBrandCheckException$2('locked');
        }
        return IsWritableStreamLocked(this);
    }
    /**
     * Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
     * immediately moved to an errored state, with any queued-up writes discarded. This will also execute any abort
     * mechanism of the underlying sink.
     *
     * The returned promise will fulfill if the stream shuts down successfully, or reject if the underlying sink signaled
     * that there was an error doing so. Additionally, it will reject with a `TypeError` (without attempting to cancel
     * the stream) if the stream is currently locked.
     */
    abort(reason = undefined) {
        if (!IsWritableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$2('abort'));
        }
        if (IsWritableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError('Cannot abort a stream that already has a writer'));
        }
        return WritableStreamAbort(this, reason);
    }
    /**
     * Closes the stream. The underlying sink will finish processing any previously-written chunks, before invoking its
     * close behavior. During this time any further attempts to write will fail (without erroring the stream).
     *
     * The method returns a promise that will fulfill if all remaining chunks are successfully written and the stream
     * successfully closes, or rejects if an error is encountered during this process. Additionally, it will reject with
     * a `TypeError` (without attempting to cancel the stream) if the stream is currently locked.
     */
    close() {
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
    }
    /**
     * Creates a {@link WritableStreamDefaultWriter | writer} and locks the stream to the new writer. While the stream
     * is locked, no other writer can be acquired until this one is released.
     *
     * This functionality is especially useful for creating abstractions that desire the ability to write to a stream
     * without interruption or interleaving. By getting a writer for the stream, you can ensure nobody else can write at
     * the same time, which would cause the resulting written data to be unpredictable and probably useless.
     */
    getWriter() {
        if (!IsWritableStream(this)) {
            throw streamBrandCheckException$2('getWriter');
        }
        return AcquireWritableStreamDefaultWriter(this);
    }
}
Object.defineProperties(WritableStream.prototype, {
    abort: { enumerable: true },
    close: { enumerable: true },
    getWriter: { enumerable: true },
    locked: { enumerable: true }
});
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
function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
    const stream = Object.create(WritableStream.prototype);
    InitializeWritableStream(stream);
    const controller = Object.create(WritableStreamDefaultController.prototype);
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
    (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort();
    // TypeScript narrows the type of `stream._state` down to 'writable' | 'erroring',
    // but it doesn't know that signaling abort runs author code that might have changed the state.
    // Widen the type again by casting to WritableStreamState.
    const state = stream._state;
    if (state === 'closed' || state === 'errored') {
        return promiseResolvedWith(undefined);
    }
    if (stream._pendingAbortRequest !== undefined) {
        return stream._pendingAbortRequest._promise;
    }
    let wasAlreadyErroring = false;
    if (state === 'erroring') {
        wasAlreadyErroring = true;
        // reason will not be used, so don't keep a reference to it.
        reason = undefined;
    }
    const promise = newPromise((resolve, reject) => {
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
    const state = stream._state;
    if (state === 'closed' || state === 'errored') {
        return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
    }
    const promise = newPromise((resolve, reject) => {
        const closeRequest = {
            _resolve: resolve,
            _reject: reject
        };
        stream._closeRequest = closeRequest;
    });
    const writer = stream._writer;
    if (writer !== undefined && stream._backpressure && state === 'writable') {
        defaultWriterReadyPromiseResolve(writer);
    }
    WritableStreamDefaultControllerClose(stream._writableStreamController);
    return promise;
}
// WritableStream API exposed for controllers.
function WritableStreamAddWriteRequest(stream) {
    const promise = newPromise((resolve, reject) => {
        const writeRequest = {
            _resolve: resolve,
            _reject: reject
        };
        stream._writeRequests.push(writeRequest);
    });
    return promise;
}
function WritableStreamDealWithRejection(stream, error) {
    const state = stream._state;
    if (state === 'writable') {
        WritableStreamStartErroring(stream, error);
        return;
    }
    WritableStreamFinishErroring(stream);
}
function WritableStreamStartErroring(stream, reason) {
    const controller = stream._writableStreamController;
    stream._state = 'erroring';
    stream._storedError = reason;
    const writer = stream._writer;
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
    const storedError = stream._storedError;
    stream._writeRequests.forEach(writeRequest => {
        writeRequest._reject(storedError);
    });
    stream._writeRequests = new SimpleQueue();
    if (stream._pendingAbortRequest === undefined) {
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
        return;
    }
    const abortRequest = stream._pendingAbortRequest;
    stream._pendingAbortRequest = undefined;
    if (abortRequest._wasAlreadyErroring) {
        abortRequest._reject(storedError);
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
        return;
    }
    const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
    uponPromise(promise, () => {
        abortRequest._resolve();
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
    }, (reason) => {
        abortRequest._reject(reason);
        WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
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
    const state = stream._state;
    if (state === 'erroring') {
        // The error was too late to do anything, so it is ignored.
        stream._storedError = undefined;
        if (stream._pendingAbortRequest !== undefined) {
            stream._pendingAbortRequest._resolve();
            stream._pendingAbortRequest = undefined;
        }
    }
    stream._state = 'closed';
    const writer = stream._writer;
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
    const writer = stream._writer;
    if (writer !== undefined) {
        defaultWriterClosedPromiseReject(writer, stream._storedError);
    }
}
function WritableStreamUpdateBackpressure(stream, backpressure) {
    const writer = stream._writer;
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
class WritableStreamDefaultWriter {
    constructor(stream) {
        assertRequiredArgument(stream, 1, 'WritableStreamDefaultWriter');
        assertWritableStream(stream, 'First parameter');
        if (IsWritableStreamLocked(stream)) {
            throw new TypeError('This stream has already been locked for exclusive writing by another writer');
        }
        this._ownerWritableStream = stream;
        stream._writer = this;
        const state = stream._state;
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
            const storedError = stream._storedError;
            defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
            defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
        }
    }
    /**
     * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
     * the writer’s lock is released before the stream finishes closing.
     */
    get closed() {
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('closed'));
        }
        return this._closedPromise;
    }
    /**
     * Returns the desired size to fill the stream’s internal queue. It can be negative, if the queue is over-full.
     * A producer can use this information to determine the right amount of data to write.
     *
     * It will be `null` if the stream cannot be successfully written to (due to either being errored, or having an abort
     * queued up). It will return zero if the stream is closed. And the getter will throw an exception if invoked when
     * the writer’s lock is released.
     */
    get desiredSize() {
        if (!IsWritableStreamDefaultWriter(this)) {
            throw defaultWriterBrandCheckException('desiredSize');
        }
        if (this._ownerWritableStream === undefined) {
            throw defaultWriterLockException('desiredSize');
        }
        return WritableStreamDefaultWriterGetDesiredSize(this);
    }
    /**
     * Returns a promise that will be fulfilled when the desired size to fill the stream’s internal queue transitions
     * from non-positive to positive, signaling that it is no longer applying backpressure. Once the desired size dips
     * back to zero or below, the getter will return a new promise that stays pending until the next transition.
     *
     * If the stream becomes errored or aborted, or the writer’s lock is released, the returned promise will become
     * rejected.
     */
    get ready() {
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('ready'));
        }
        return this._readyPromise;
    }
    /**
     * If the reader is active, behaves the same as {@link WritableStream.abort | stream.abort(reason)}.
     */
    abort(reason = undefined) {
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('abort'));
        }
        if (this._ownerWritableStream === undefined) {
            return promiseRejectedWith(defaultWriterLockException('abort'));
        }
        return WritableStreamDefaultWriterAbort(this, reason);
    }
    /**
     * If the reader is active, behaves the same as {@link WritableStream.close | stream.close()}.
     */
    close() {
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('close'));
        }
        const stream = this._ownerWritableStream;
        if (stream === undefined) {
            return promiseRejectedWith(defaultWriterLockException('close'));
        }
        if (WritableStreamCloseQueuedOrInFlight(stream)) {
            return promiseRejectedWith(new TypeError('Cannot close an already-closing stream'));
        }
        return WritableStreamDefaultWriterClose(this);
    }
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
    releaseLock() {
        if (!IsWritableStreamDefaultWriter(this)) {
            throw defaultWriterBrandCheckException('releaseLock');
        }
        const stream = this._ownerWritableStream;
        if (stream === undefined) {
            return;
        }
        WritableStreamDefaultWriterRelease(this);
    }
    write(chunk = undefined) {
        if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException('write'));
        }
        if (this._ownerWritableStream === undefined) {
            return promiseRejectedWith(defaultWriterLockException('write to'));
        }
        return WritableStreamDefaultWriterWrite(this, chunk);
    }
}
Object.defineProperties(WritableStreamDefaultWriter.prototype, {
    abort: { enumerable: true },
    close: { enumerable: true },
    releaseLock: { enumerable: true },
    write: { enumerable: true },
    closed: { enumerable: true },
    desiredSize: { enumerable: true },
    ready: { enumerable: true }
});
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
    const stream = writer._ownerWritableStream;
    return WritableStreamAbort(stream, reason);
}
function WritableStreamDefaultWriterClose(writer) {
    const stream = writer._ownerWritableStream;
    return WritableStreamClose(stream);
}
function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
    const stream = writer._ownerWritableStream;
    const state = stream._state;
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
    const stream = writer._ownerWritableStream;
    const state = stream._state;
    if (state === 'errored' || state === 'erroring') {
        return null;
    }
    if (state === 'closed') {
        return 0;
    }
    return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
}
function WritableStreamDefaultWriterRelease(writer) {
    const stream = writer._ownerWritableStream;
    const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
    WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
    // The state transitions to "errored" before the sink abort() method runs, but the writer.closed promise is not
    // rejected until afterwards. This means that simply testing state will not work.
    WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
    stream._writer = undefined;
    writer._ownerWritableStream = undefined;
}
function WritableStreamDefaultWriterWrite(writer, chunk) {
    const stream = writer._ownerWritableStream;
    const controller = stream._writableStreamController;
    const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
    if (stream !== writer._ownerWritableStream) {
        return promiseRejectedWith(defaultWriterLockException('write to'));
    }
    const state = stream._state;
    if (state === 'errored') {
        return promiseRejectedWith(stream._storedError);
    }
    if (WritableStreamCloseQueuedOrInFlight(stream) || state === 'closed') {
        return promiseRejectedWith(new TypeError('The stream is closing or closed and cannot be written to'));
    }
    if (state === 'erroring') {
        return promiseRejectedWith(stream._storedError);
    }
    const promise = WritableStreamAddWriteRequest(stream);
    WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
    return promise;
}
const closeSentinel = {};
/**
 * Allows control of a {@link WritableStream | writable stream}'s state and internal queue.
 *
 * @public
 */
class WritableStreamDefaultController {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
    /**
     * The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.
     *
     * @deprecated
     *  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.
     *  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.
     */
    get abortReason() {
        if (!IsWritableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$2('abortReason');
        }
        return this._abortReason;
    }
    /**
     * An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.
     */
    get signal() {
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
    }
    /**
     * Closes the controlled writable stream, making all future interactions with it fail with the given error `e`.
     *
     * This method is rarely used, since usually it suffices to return a rejected promise from one of the underlying
     * sink's methods. However, it can be useful for suddenly shutting down a stream in response to an event outside the
     * normal lifecycle of interactions with the underlying sink.
     */
    error(e = undefined) {
        if (!IsWritableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$2('error');
        }
        const state = this._controlledWritableStream._state;
        if (state !== 'writable') {
            // The stream is closed, errored or will be soon. The sink can't do anything useful if it gets an error here, so
            // just treat it as a no-op.
            return;
        }
        WritableStreamDefaultControllerError(this, e);
    }
    /** @internal */
    [AbortSteps](reason) {
        const result = this._abortAlgorithm(reason);
        WritableStreamDefaultControllerClearAlgorithms(this);
        return result;
    }
    /** @internal */
    [ErrorSteps]() {
        ResetQueue(this);
    }
}
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
    const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
    WritableStreamUpdateBackpressure(stream, backpressure);
    const startResult = startAlgorithm();
    const startPromise = promiseResolvedWith(startResult);
    uponPromise(startPromise, () => {
        controller._started = true;
        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
    }, r => {
        controller._started = true;
        WritableStreamDealWithRejection(stream, r);
    });
}
function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
    const controller = Object.create(WritableStreamDefaultController.prototype);
    let startAlgorithm = () => undefined;
    let writeAlgorithm = () => promiseResolvedWith(undefined);
    let closeAlgorithm = () => promiseResolvedWith(undefined);
    let abortAlgorithm = () => promiseResolvedWith(undefined);
    if (underlyingSink.start !== undefined) {
        startAlgorithm = () => underlyingSink.start(controller);
    }
    if (underlyingSink.write !== undefined) {
        writeAlgorithm = chunk => underlyingSink.write(chunk, controller);
    }
    if (underlyingSink.close !== undefined) {
        closeAlgorithm = () => underlyingSink.close();
    }
    if (underlyingSink.abort !== undefined) {
        abortAlgorithm = reason => underlyingSink.abort(reason);
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
    const stream = controller._controlledWritableStream;
    if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === 'writable') {
        const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
        WritableStreamUpdateBackpressure(stream, backpressure);
    }
    WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
}
// Abstract operations for the WritableStreamDefaultController.
function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
    const stream = controller._controlledWritableStream;
    if (!controller._started) {
        return;
    }
    if (stream._inFlightWriteRequest !== undefined) {
        return;
    }
    const state = stream._state;
    if (state === 'erroring') {
        WritableStreamFinishErroring(stream);
        return;
    }
    if (controller._queue.length === 0) {
        return;
    }
    const value = PeekQueueValue(controller);
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
    const stream = controller._controlledWritableStream;
    WritableStreamMarkCloseRequestInFlight(stream);
    DequeueValue(controller);
    const sinkClosePromise = controller._closeAlgorithm();
    WritableStreamDefaultControllerClearAlgorithms(controller);
    uponPromise(sinkClosePromise, () => {
        WritableStreamFinishInFlightClose(stream);
    }, reason => {
        WritableStreamFinishInFlightCloseWithError(stream, reason);
    });
}
function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
    const stream = controller._controlledWritableStream;
    WritableStreamMarkFirstWriteRequestInFlight(stream);
    const sinkWritePromise = controller._writeAlgorithm(chunk);
    uponPromise(sinkWritePromise, () => {
        WritableStreamFinishInFlightWrite(stream);
        const state = stream._state;
        DequeueValue(controller);
        if (!WritableStreamCloseQueuedOrInFlight(stream) && state === 'writable') {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
        }
        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
    }, reason => {
        if (stream._state === 'writable') {
            WritableStreamDefaultControllerClearAlgorithms(controller);
        }
        WritableStreamFinishInFlightWriteWithError(stream, reason);
    });
}
function WritableStreamDefaultControllerGetBackpressure(controller) {
    const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
    return desiredSize <= 0;
}
// A client of WritableStreamDefaultController may use these functions directly to bypass state check.
function WritableStreamDefaultControllerError(controller, error) {
    const stream = controller._controlledWritableStream;
    WritableStreamDefaultControllerClearAlgorithms(controller);
    WritableStreamStartErroring(stream, error);
}
// Helper functions for the WritableStream.
function streamBrandCheckException$2(name) {
    return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
}
// Helper functions for the WritableStreamDefaultController.
function defaultControllerBrandCheckException$2(name) {
    return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
}
// Helper functions for the WritableStreamDefaultWriter.
function defaultWriterBrandCheckException(name) {
    return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
}
function defaultWriterLockException(name) {
    return new TypeError('Cannot ' + name + ' a stream using a released writer');
}
function defaultWriterClosedPromiseInitialize(writer) {
    writer._closedPromise = newPromise((resolve, reject) => {
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
    writer._readyPromise = newPromise((resolve, reject) => {
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
const NativeDOMException = typeof DOMException !== 'undefined' ? DOMException : undefined;

/// <reference types="node" />
function isDOMExceptionConstructor(ctor) {
    if (!(typeof ctor === 'function' || typeof ctor === 'object')) {
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
function createDOMExceptionPolyfill() {
    // eslint-disable-next-line no-shadow
    const ctor = function DOMException(message, name) {
        this.message = message || '';
        this.name = name || 'Error';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    };
    ctor.prototype = Object.create(Error.prototype);
    Object.defineProperty(ctor.prototype, 'constructor', { value: ctor, writable: true, configurable: true });
    return ctor;
}
// eslint-disable-next-line no-redeclare
const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();

function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
    const reader = AcquireReadableStreamDefaultReader(source);
    const writer = AcquireWritableStreamDefaultWriter(dest);
    source._disturbed = true;
    let shuttingDown = false;
    // This is used to keep track of the spec's requirement that we wait for ongoing writes during shutdown.
    let currentWrite = promiseResolvedWith(undefined);
    return newPromise((resolve, reject) => {
        let abortAlgorithm;
        if (signal !== undefined) {
            abortAlgorithm = () => {
                const error = new DOMException$1('Aborted', 'AbortError');
                const actions = [];
                if (!preventAbort) {
                    actions.push(() => {
                        if (dest._state === 'writable') {
                            return WritableStreamAbort(dest, error);
                        }
                        return promiseResolvedWith(undefined);
                    });
                }
                if (!preventCancel) {
                    actions.push(() => {
                        if (source._state === 'readable') {
                            return ReadableStreamCancel(source, error);
                        }
                        return promiseResolvedWith(undefined);
                    });
                }
                shutdownWithAction(() => Promise.all(actions.map(action => action())), true, error);
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
            return newPromise((resolveLoop, rejectLoop) => {
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
            return PerformPromiseThen(writer._readyPromise, () => {
                return newPromise((resolveRead, rejectRead) => {
                    ReadableStreamDefaultReaderRead(reader, {
                        _chunkSteps: chunk => {
                            currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), undefined, noop);
                            resolveRead(false);
                        },
                        _closeSteps: () => resolveRead(true),
                        _errorSteps: rejectRead
                    });
                });
            });
        }
        // Errors must be propagated forward
        isOrBecomesErrored(source, reader._closedPromise, storedError => {
            if (!preventAbort) {
                shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
            }
            else {
                shutdown(true, storedError);
            }
        });
        // Errors must be propagated backward
        isOrBecomesErrored(dest, writer._closedPromise, storedError => {
            if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
            }
            else {
                shutdown(true, storedError);
            }
        });
        // Closing must be propagated forward
        isOrBecomesClosed(source, reader._closedPromise, () => {
            if (!preventClose) {
                shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
            }
            else {
                shutdown();
            }
        });
        // Closing must be propagated backward
        if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === 'closed') {
            const destClosed = new TypeError('the destination writable stream closed before all data could be piped to it');
            if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
            }
            else {
                shutdown(true, destClosed);
            }
        }
        setPromiseIsHandledToTrue(pipeLoop());
        function waitForWritesToFinish() {
            // Another write may have started while we were waiting on this currentWrite, so we have to be sure to wait
            // for that too.
            const oldCurrentWrite = currentWrite;
            return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : undefined);
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
                uponPromise(action(), () => finalize(originalIsError, originalError), newError => finalize(true, newError));
            }
        }
        function shutdown(isError, error) {
            if (shuttingDown) {
                return;
            }
            shuttingDown = true;
            if (dest._state === 'writable' && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error));
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
        }
    });
}

/**
 * Allows control of a {@link ReadableStream | readable stream}'s state and internal queue.
 *
 * @public
 */
class ReadableStreamDefaultController {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
    /**
     * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
     * over-full. An underlying source ought to use this information to determine when and how to apply backpressure.
     */
    get desiredSize() {
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('desiredSize');
        }
        return ReadableStreamDefaultControllerGetDesiredSize(this);
    }
    /**
     * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
     * the stream, but once those are read, the stream will become closed.
     */
    close() {
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('close');
        }
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
            throw new TypeError('The stream is not in a state that permits close');
        }
        ReadableStreamDefaultControllerClose(this);
    }
    enqueue(chunk = undefined) {
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('enqueue');
        }
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
            throw new TypeError('The stream is not in a state that permits enqueue');
        }
        return ReadableStreamDefaultControllerEnqueue(this, chunk);
    }
    /**
     * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
     */
    error(e = undefined) {
        if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1('error');
        }
        ReadableStreamDefaultControllerError(this, e);
    }
    /** @internal */
    [CancelSteps](reason) {
        ResetQueue(this);
        const result = this._cancelAlgorithm(reason);
        ReadableStreamDefaultControllerClearAlgorithms(this);
        return result;
    }
    /** @internal */
    [PullSteps](readRequest) {
        const stream = this._controlledReadableStream;
        if (this._queue.length > 0) {
            const chunk = DequeueValue(this);
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
    }
}
Object.defineProperties(ReadableStreamDefaultController.prototype, {
    close: { enumerable: true },
    enqueue: { enumerable: true },
    error: { enumerable: true },
    desiredSize: { enumerable: true }
});
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
    const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
    if (!shouldPull) {
        return;
    }
    if (controller._pulling) {
        controller._pullAgain = true;
        return;
    }
    controller._pulling = true;
    const pullPromise = controller._pullAlgorithm();
    uponPromise(pullPromise, () => {
        controller._pulling = false;
        if (controller._pullAgain) {
            controller._pullAgain = false;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
    }, e => {
        ReadableStreamDefaultControllerError(controller, e);
    });
}
function ReadableStreamDefaultControllerShouldCallPull(controller) {
    const stream = controller._controlledReadableStream;
    if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
        return false;
    }
    if (!controller._started) {
        return false;
    }
    if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
        return true;
    }
    const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
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
    const stream = controller._controlledReadableStream;
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
    const stream = controller._controlledReadableStream;
    if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
        ReadableStreamFulfillReadRequest(stream, chunk, false);
    }
    else {
        let chunkSize;
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
    const stream = controller._controlledReadableStream;
    if (stream._state !== 'readable') {
        return;
    }
    ResetQueue(controller);
    ReadableStreamDefaultControllerClearAlgorithms(controller);
    ReadableStreamError(stream, e);
}
function ReadableStreamDefaultControllerGetDesiredSize(controller) {
    const state = controller._controlledReadableStream._state;
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
    const state = controller._controlledReadableStream._state;
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
    const startResult = startAlgorithm();
    uponPromise(promiseResolvedWith(startResult), () => {
        controller._started = true;
        ReadableStreamDefaultControllerCallPullIfNeeded(controller);
    }, r => {
        ReadableStreamDefaultControllerError(controller, r);
    });
}
function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
    const controller = Object.create(ReadableStreamDefaultController.prototype);
    let startAlgorithm = () => undefined;
    let pullAlgorithm = () => promiseResolvedWith(undefined);
    let cancelAlgorithm = () => promiseResolvedWith(undefined);
    if (underlyingSource.start !== undefined) {
        startAlgorithm = () => underlyingSource.start(controller);
    }
    if (underlyingSource.pull !== undefined) {
        pullAlgorithm = () => underlyingSource.pull(controller);
    }
    if (underlyingSource.cancel !== undefined) {
        cancelAlgorithm = reason => underlyingSource.cancel(reason);
    }
    SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
}
// Helper functions for the ReadableStreamDefaultController.
function defaultControllerBrandCheckException$1(name) {
    return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
}

function ReadableStreamTee(stream, cloneForBranch2) {
    if (IsReadableByteStreamController(stream._readableStreamController)) {
        return ReadableByteStreamTee(stream);
    }
    return ReadableStreamDefaultTee(stream);
}
function ReadableStreamDefaultTee(stream, cloneForBranch2) {
    const reader = AcquireReadableStreamDefaultReader(stream);
    let reading = false;
    let readAgain = false;
    let canceled1 = false;
    let canceled2 = false;
    let reason1;
    let reason2;
    let branch1;
    let branch2;
    let resolveCancelPromise;
    const cancelPromise = newPromise(resolve => {
        resolveCancelPromise = resolve;
    });
    function pullAlgorithm() {
        if (reading) {
            readAgain = true;
            return promiseResolvedWith(undefined);
        }
        reading = true;
        const readRequest = {
            _chunkSteps: chunk => {
                // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
                // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
                // successful synchronously-available reads get ahead of asynchronously-available errors.
                queueMicrotask(() => {
                    readAgain = false;
                    const chunk1 = chunk;
                    const chunk2 = chunk;
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
            _closeSteps: () => {
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
            _errorSteps: () => {
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
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function cancel2Algorithm(reason) {
        canceled2 = true;
        reason2 = reason;
        if (canceled1) {
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function startAlgorithm() {
        // do nothing
    }
    branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
    branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
    uponRejection(reader._closedPromise, (r) => {
        ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
        ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
        if (!canceled1 || !canceled2) {
            resolveCancelPromise(undefined);
        }
    });
    return [branch1, branch2];
}
function ReadableByteStreamTee(stream) {
    let reader = AcquireReadableStreamDefaultReader(stream);
    let reading = false;
    let readAgainForBranch1 = false;
    let readAgainForBranch2 = false;
    let canceled1 = false;
    let canceled2 = false;
    let reason1;
    let reason2;
    let branch1;
    let branch2;
    let resolveCancelPromise;
    const cancelPromise = newPromise(resolve => {
        resolveCancelPromise = resolve;
    });
    function forwardReaderError(thisReader) {
        uponRejection(thisReader._closedPromise, r => {
            if (thisReader !== reader) {
                return;
            }
            ReadableByteStreamControllerError(branch1._readableStreamController, r);
            ReadableByteStreamControllerError(branch2._readableStreamController, r);
            if (!canceled1 || !canceled2) {
                resolveCancelPromise(undefined);
            }
        });
    }
    function pullWithDefaultReader() {
        if (IsReadableStreamBYOBReader(reader)) {
            ReadableStreamReaderGenericRelease(reader);
            reader = AcquireReadableStreamDefaultReader(stream);
            forwardReaderError(reader);
        }
        const readRequest = {
            _chunkSteps: chunk => {
                // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
                // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
                // successful synchronously-available reads get ahead of asynchronously-available errors.
                queueMicrotask(() => {
                    readAgainForBranch1 = false;
                    readAgainForBranch2 = false;
                    const chunk1 = chunk;
                    let chunk2 = chunk;
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
            _closeSteps: () => {
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
            _errorSteps: () => {
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
        const byobBranch = forBranch2 ? branch2 : branch1;
        const otherBranch = forBranch2 ? branch1 : branch2;
        const readIntoRequest = {
            _chunkSteps: chunk => {
                // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
                // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
                // successful synchronously-available reads get ahead of asynchronously-available errors.
                queueMicrotask(() => {
                    readAgainForBranch1 = false;
                    readAgainForBranch2 = false;
                    const byobCanceled = forBranch2 ? canceled2 : canceled1;
                    const otherCanceled = forBranch2 ? canceled1 : canceled2;
                    if (!otherCanceled) {
                        let clonedChunk;
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
            _closeSteps: chunk => {
                reading = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
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
            _errorSteps: () => {
                reading = false;
            }
        };
        ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
    }
    function pull1Algorithm() {
        if (reading) {
            readAgainForBranch1 = true;
            return promiseResolvedWith(undefined);
        }
        reading = true;
        const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
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
        const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
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
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
        }
        return cancelPromise;
    }
    function cancel2Algorithm(reason) {
        canceled2 = true;
        reason2 = reason;
        if (canceled1) {
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
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

function convertUnderlyingDefaultOrByteSource(source, context) {
    assertDictionary(source, context);
    const original = source;
    const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
    const cancel = original === null || original === void 0 ? void 0 : original.cancel;
    const pull = original === null || original === void 0 ? void 0 : original.pull;
    const start = original === null || original === void 0 ? void 0 : original.start;
    const type = original === null || original === void 0 ? void 0 : original.type;
    return {
        autoAllocateChunkSize: autoAllocateChunkSize === undefined ?
            undefined :
            convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
        cancel: cancel === undefined ?
            undefined :
            convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
        pull: pull === undefined ?
            undefined :
            convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
        start: start === undefined ?
            undefined :
            convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
        type: type === undefined ? undefined : convertReadableStreamType(type, `${context} has member 'type' that`)
    };
}
function convertUnderlyingSourceCancelCallback(fn, original, context) {
    assertFunction(fn, context);
    return (reason) => promiseCall(fn, original, [reason]);
}
function convertUnderlyingSourcePullCallback(fn, original, context) {
    assertFunction(fn, context);
    return (controller) => promiseCall(fn, original, [controller]);
}
function convertUnderlyingSourceStartCallback(fn, original, context) {
    assertFunction(fn, context);
    return (controller) => reflectCall(fn, original, [controller]);
}
function convertReadableStreamType(type, context) {
    type = `${type}`;
    if (type !== 'bytes') {
        throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
    }
    return type;
}

function convertReaderOptions(options, context) {
    assertDictionary(options, context);
    const mode = options === null || options === void 0 ? void 0 : options.mode;
    return {
        mode: mode === undefined ? undefined : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
    };
}
function convertReadableStreamReaderMode(mode, context) {
    mode = `${mode}`;
    if (mode !== 'byob') {
        throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
    }
    return mode;
}

function convertIteratorOptions(options, context) {
    assertDictionary(options, context);
    const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
    return { preventCancel: Boolean(preventCancel) };
}

function convertPipeOptions(options, context) {
    assertDictionary(options, context);
    const preventAbort = options === null || options === void 0 ? void 0 : options.preventAbort;
    const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
    const preventClose = options === null || options === void 0 ? void 0 : options.preventClose;
    const signal = options === null || options === void 0 ? void 0 : options.signal;
    if (signal !== undefined) {
        assertAbortSignal(signal, `${context} has member 'signal' that`);
    }
    return {
        preventAbort: Boolean(preventAbort),
        preventCancel: Boolean(preventCancel),
        preventClose: Boolean(preventClose),
        signal
    };
}
function assertAbortSignal(signal, context) {
    if (!isAbortSignal(signal)) {
        throw new TypeError(`${context} is not an AbortSignal.`);
    }
}

function convertReadableWritablePair(pair, context) {
    assertDictionary(pair, context);
    const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
    assertRequiredField(readable, 'readable', 'ReadableWritablePair');
    assertReadableStream(readable, `${context} has member 'readable' that`);
    const writable = pair === null || pair === void 0 ? void 0 : pair.writable;
    assertRequiredField(writable, 'writable', 'ReadableWritablePair');
    assertWritableStream(writable, `${context} has member 'writable' that`);
    return { readable, writable };
}

/**
 * A readable stream represents a source of data, from which you can read.
 *
 * @public
 */
class ReadableStream {
    constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
        if (rawUnderlyingSource === undefined) {
            rawUnderlyingSource = null;
        }
        else {
            assertObject(rawUnderlyingSource, 'First parameter');
        }
        const strategy = convertQueuingStrategy(rawStrategy, 'Second parameter');
        const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, 'First parameter');
        InitializeReadableStream(this);
        if (underlyingSource.type === 'bytes') {
            if (strategy.size !== undefined) {
                throw new RangeError('The strategy for a byte stream cannot have a size function');
            }
            const highWaterMark = ExtractHighWaterMark(strategy, 0);
            SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
        }
        else {
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
        }
    }
    /**
     * Whether or not the readable stream is locked to a {@link ReadableStreamDefaultReader | reader}.
     */
    get locked() {
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('locked');
        }
        return IsReadableStreamLocked(this);
    }
    /**
     * Cancels the stream, signaling a loss of interest in the stream by a consumer.
     *
     * The supplied `reason` argument will be given to the underlying source's {@link UnderlyingSource.cancel | cancel()}
     * method, which might or might not use it.
     */
    cancel(reason = undefined) {
        if (!IsReadableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$1('cancel'));
        }
        if (IsReadableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError('Cannot cancel a stream that already has a reader'));
        }
        return ReadableStreamCancel(this, reason);
    }
    getReader(rawOptions = undefined) {
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('getReader');
        }
        const options = convertReaderOptions(rawOptions, 'First parameter');
        if (options.mode === undefined) {
            return AcquireReadableStreamDefaultReader(this);
        }
        return AcquireReadableStreamBYOBReader(this);
    }
    pipeThrough(rawTransform, rawOptions = {}) {
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('pipeThrough');
        }
        assertRequiredArgument(rawTransform, 1, 'pipeThrough');
        const transform = convertReadableWritablePair(rawTransform, 'First parameter');
        const options = convertPipeOptions(rawOptions, 'Second parameter');
        if (IsReadableStreamLocked(this)) {
            throw new TypeError('ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream');
        }
        if (IsWritableStreamLocked(transform.writable)) {
            throw new TypeError('ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream');
        }
        const promise = ReadableStreamPipeTo(this, transform.writable, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
        setPromiseIsHandledToTrue(promise);
        return transform.readable;
    }
    pipeTo(destination, rawOptions = {}) {
        if (!IsReadableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$1('pipeTo'));
        }
        if (destination === undefined) {
            return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
        }
        if (!IsWritableStream(destination)) {
            return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
        }
        let options;
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
    }
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
    tee() {
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('tee');
        }
        const branches = ReadableStreamTee(this);
        return CreateArrayFromList(branches);
    }
    values(rawOptions = undefined) {
        if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1('values');
        }
        const options = convertIteratorOptions(rawOptions, 'First parameter');
        return AcquireReadableStreamAsyncIterator(this, options.preventCancel);
    }
}
Object.defineProperties(ReadableStream.prototype, {
    cancel: { enumerable: true },
    getReader: { enumerable: true },
    pipeThrough: { enumerable: true },
    pipeTo: { enumerable: true },
    tee: { enumerable: true },
    values: { enumerable: true },
    locked: { enumerable: true }
});
if (typeof SymbolPolyfill.toStringTag === 'symbol') {
    Object.defineProperty(ReadableStream.prototype, SymbolPolyfill.toStringTag, {
        value: 'ReadableStream',
        configurable: true
    });
}
if (typeof SymbolPolyfill.asyncIterator === 'symbol') {
    Object.defineProperty(ReadableStream.prototype, SymbolPolyfill.asyncIterator, {
        value: ReadableStream.prototype.values,
        writable: true,
        configurable: true
    });
}
// Abstract operations for the ReadableStream.
// Throws if and only if startAlgorithm throws.
function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
    const stream = Object.create(ReadableStream.prototype);
    InitializeReadableStream(stream);
    const controller = Object.create(ReadableStreamDefaultController.prototype);
    SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
    return stream;
}
// Throws if and only if startAlgorithm throws.
function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
    const stream = Object.create(ReadableStream.prototype);
    InitializeReadableStream(stream);
    const controller = Object.create(ReadableByteStreamController.prototype);
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
    const reader = stream._reader;
    if (reader !== undefined && IsReadableStreamBYOBReader(reader)) {
        reader._readIntoRequests.forEach(readIntoRequest => {
            readIntoRequest._closeSteps(undefined);
        });
        reader._readIntoRequests = new SimpleQueue();
    }
    const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
    return transformPromiseWith(sourceCancelPromise, noop);
}
function ReadableStreamClose(stream) {
    stream._state = 'closed';
    const reader = stream._reader;
    if (reader === undefined) {
        return;
    }
    defaultReaderClosedPromiseResolve(reader);
    if (IsReadableStreamDefaultReader(reader)) {
        reader._readRequests.forEach(readRequest => {
            readRequest._closeSteps();
        });
        reader._readRequests = new SimpleQueue();
    }
}
function ReadableStreamError(stream, e) {
    stream._state = 'errored';
    stream._storedError = e;
    const reader = stream._reader;
    if (reader === undefined) {
        return;
    }
    defaultReaderClosedPromiseReject(reader, e);
    if (IsReadableStreamDefaultReader(reader)) {
        reader._readRequests.forEach(readRequest => {
            readRequest._errorSteps(e);
        });
        reader._readRequests = new SimpleQueue();
    }
    else {
        reader._readIntoRequests.forEach(readIntoRequest => {
            readIntoRequest._errorSteps(e);
        });
        reader._readIntoRequests = new SimpleQueue();
    }
}
// Helper functions for the ReadableStream.
function streamBrandCheckException$1(name) {
    return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
}

function convertQueuingStrategyInit(init, context) {
    assertDictionary(init, context);
    const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
    assertRequiredField(highWaterMark, 'highWaterMark', 'QueuingStrategyInit');
    return {
        highWaterMark: convertUnrestrictedDouble(highWaterMark)
    };
}

// The size function must not have a prototype property nor be a constructor
const byteLengthSizeFunction = (chunk) => {
    return chunk.byteLength;
};
try {
    Object.defineProperty(byteLengthSizeFunction, 'name', {
        value: 'size',
        configurable: true
    });
}
catch (_a) {
    // This property is non-configurable in older browsers, so ignore if this throws.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#browser_compatibility
}
/**
 * A queuing strategy that counts the number of bytes in each chunk.
 *
 * @public
 */
class ByteLengthQueuingStrategy {
    constructor(options) {
        assertRequiredArgument(options, 1, 'ByteLengthQueuingStrategy');
        options = convertQueuingStrategyInit(options, 'First parameter');
        this._byteLengthQueuingStrategyHighWaterMark = options.highWaterMark;
    }
    /**
     * Returns the high water mark provided to the constructor.
     */
    get highWaterMark() {
        if (!IsByteLengthQueuingStrategy(this)) {
            throw byteLengthBrandCheckException('highWaterMark');
        }
        return this._byteLengthQueuingStrategyHighWaterMark;
    }
    /**
     * Measures the size of `chunk` by returning the value of its `byteLength` property.
     */
    get size() {
        if (!IsByteLengthQueuingStrategy(this)) {
            throw byteLengthBrandCheckException('size');
        }
        return byteLengthSizeFunction;
    }
}
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
    return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
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
const countSizeFunction = () => {
    return 1;
};
try {
    Object.defineProperty(countSizeFunction, 'name', {
        value: 'size',
        configurable: true
    });
}
catch (_a) {
    // This property is non-configurable in older browsers, so ignore if this throws.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#browser_compatibility
}
/**
 * A queuing strategy that counts the number of chunks.
 *
 * @public
 */
class CountQueuingStrategy {
    constructor(options) {
        assertRequiredArgument(options, 1, 'CountQueuingStrategy');
        options = convertQueuingStrategyInit(options, 'First parameter');
        this._countQueuingStrategyHighWaterMark = options.highWaterMark;
    }
    /**
     * Returns the high water mark provided to the constructor.
     */
    get highWaterMark() {
        if (!IsCountQueuingStrategy(this)) {
            throw countBrandCheckException('highWaterMark');
        }
        return this._countQueuingStrategyHighWaterMark;
    }
    /**
     * Measures the size of `chunk` by always returning 1.
     * This ensures that the total queue size is a count of the number of chunks in the queue.
     */
    get size() {
        if (!IsCountQueuingStrategy(this)) {
            throw countBrandCheckException('size');
        }
        return countSizeFunction;
    }
}
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
    return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
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
    const flush = original === null || original === void 0 ? void 0 : original.flush;
    const readableType = original === null || original === void 0 ? void 0 : original.readableType;
    const start = original === null || original === void 0 ? void 0 : original.start;
    const transform = original === null || original === void 0 ? void 0 : original.transform;
    const writableType = original === null || original === void 0 ? void 0 : original.writableType;
    return {
        flush: flush === undefined ?
            undefined :
            convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
        readableType,
        start: start === undefined ?
            undefined :
            convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
        transform: transform === undefined ?
            undefined :
            convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
        writableType
    };
}
function convertTransformerFlushCallback(fn, original, context) {
    assertFunction(fn, context);
    return (controller) => promiseCall(fn, original, [controller]);
}
function convertTransformerStartCallback(fn, original, context) {
    assertFunction(fn, context);
    return (controller) => reflectCall(fn, original, [controller]);
}
function convertTransformerTransformCallback(fn, original, context) {
    assertFunction(fn, context);
    return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
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
class TransformStream {
    constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
        if (rawTransformer === undefined) {
            rawTransformer = null;
        }
        const writableStrategy = convertQueuingStrategy(rawWritableStrategy, 'Second parameter');
        const readableStrategy = convertQueuingStrategy(rawReadableStrategy, 'Third parameter');
        const transformer = convertTransformer(rawTransformer, 'First parameter');
        if (transformer.readableType !== undefined) {
            throw new RangeError('Invalid readableType specified');
        }
        if (transformer.writableType !== undefined) {
            throw new RangeError('Invalid writableType specified');
        }
        const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
        const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
        const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
        const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
        let startPromise_resolve;
        const startPromise = newPromise(resolve => {
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
    /**
     * The readable side of the transform stream.
     */
    get readable() {
        if (!IsTransformStream(this)) {
            throw streamBrandCheckException('readable');
        }
        return this._readable;
    }
    /**
     * The writable side of the transform stream.
     */
    get writable() {
        if (!IsTransformStream(this)) {
            throw streamBrandCheckException('writable');
        }
        return this._writable;
    }
}
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
        TransformStreamErrorWritableAndUnblockWrite(stream, reason);
        return promiseResolvedWith(undefined);
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
    stream._backpressureChangePromise = newPromise(resolve => {
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
class TransformStreamDefaultController {
    constructor() {
        throw new TypeError('Illegal constructor');
    }
    /**
     * Returns the desired size to fill the readable side’s internal queue. It can be negative, if the queue is over-full.
     */
    get desiredSize() {
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('desiredSize');
        }
        const readableController = this._controlledTransformStream._readable._readableStreamController;
        return ReadableStreamDefaultControllerGetDesiredSize(readableController);
    }
    enqueue(chunk = undefined) {
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('enqueue');
        }
        TransformStreamDefaultControllerEnqueue(this, chunk);
    }
    /**
     * Errors both the readable side and the writable side of the controlled transform stream, making all future
     * interactions with it fail with the given error `e`. Any chunks queued for transformation will be discarded.
     */
    error(reason = undefined) {
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('error');
        }
        TransformStreamDefaultControllerError(this, reason);
    }
    /**
     * Closes the readable side and errors the writable side of the controlled transform stream. This is useful when the
     * transformer only needs to consume a portion of the chunks written to the writable side.
     */
    terminate() {
        if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException('terminate');
        }
        TransformStreamDefaultControllerTerminate(this);
    }
}
Object.defineProperties(TransformStreamDefaultController.prototype, {
    enqueue: { enumerable: true },
    error: { enumerable: true },
    terminate: { enumerable: true },
    desiredSize: { enumerable: true }
});
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
function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
    controller._controlledTransformStream = stream;
    stream._transformStreamController = controller;
    controller._transformAlgorithm = transformAlgorithm;
    controller._flushAlgorithm = flushAlgorithm;
}
function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
    const controller = Object.create(TransformStreamDefaultController.prototype);
    let transformAlgorithm = (chunk) => {
        try {
            TransformStreamDefaultControllerEnqueue(controller, chunk);
            return promiseResolvedWith(undefined);
        }
        catch (transformResultE) {
            return promiseRejectedWith(transformResultE);
        }
    };
    let flushAlgorithm = () => promiseResolvedWith(undefined);
    if (transformer.transform !== undefined) {
        transformAlgorithm = chunk => transformer.transform(chunk, controller);
    }
    if (transformer.flush !== undefined) {
        flushAlgorithm = () => transformer.flush(controller);
    }
    SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
}
function TransformStreamDefaultControllerClearAlgorithms(controller) {
    controller._transformAlgorithm = undefined;
    controller._flushAlgorithm = undefined;
}
function TransformStreamDefaultControllerEnqueue(controller, chunk) {
    const stream = controller._controlledTransformStream;
    const readableController = stream._readable._readableStreamController;
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
    const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
    if (backpressure !== stream._backpressure) {
        TransformStreamSetBackpressure(stream, true);
    }
}
function TransformStreamDefaultControllerError(controller, e) {
    TransformStreamError(controller._controlledTransformStream, e);
}
function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
    const transformPromise = controller._transformAlgorithm(chunk);
    return transformPromiseWith(transformPromise, undefined, r => {
        TransformStreamError(controller._controlledTransformStream, r);
        throw r;
    });
}
function TransformStreamDefaultControllerTerminate(controller) {
    const stream = controller._controlledTransformStream;
    const readableController = stream._readable._readableStreamController;
    ReadableStreamDefaultControllerClose(readableController);
    const error = new TypeError('TransformStream terminated');
    TransformStreamErrorWritableAndUnblockWrite(stream, error);
}
// TransformStreamDefaultSink Algorithms
function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
    const controller = stream._transformStreamController;
    if (stream._backpressure) {
        const backpressureChangePromise = stream._backpressureChangePromise;
        return transformPromiseWith(backpressureChangePromise, () => {
            const writable = stream._writable;
            const state = writable._state;
            if (state === 'erroring') {
                throw writable._storedError;
            }
            return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        });
    }
    return TransformStreamDefaultControllerPerformTransform(controller, chunk);
}
function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
    // abort() is not called synchronously, so it is possible for abort() to be called when the stream is already
    // errored.
    TransformStreamError(stream, reason);
    return promiseResolvedWith(undefined);
}
function TransformStreamDefaultSinkCloseAlgorithm(stream) {
    // stream._readable cannot change after construction, so caching it across a call to user code is safe.
    const readable = stream._readable;
    const controller = stream._transformStreamController;
    const flushPromise = controller._flushAlgorithm();
    TransformStreamDefaultControllerClearAlgorithms(controller);
    // Return a promise that is fulfilled with undefined on success.
    return transformPromiseWith(flushPromise, () => {
        if (readable._state === 'errored') {
            throw readable._storedError;
        }
        ReadableStreamDefaultControllerClose(readable._readableStreamController);
    }, r => {
        TransformStreamError(stream, r);
        throw readable._storedError;
    });
}
// TransformStreamDefaultSource Algorithms
function TransformStreamDefaultSourcePullAlgorithm(stream) {
    // Invariant. Enforced by the promises returned by start() and pull().
    TransformStreamSetBackpressure(stream, false);
    // Prevent the next pull() call until there is backpressure.
    return stream._backpressureChangePromise;
}
// Helper functions for the TransformStreamDefaultController.
function defaultControllerBrandCheckException(name) {
    return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
}
// Helper functions for the TransformStream.
function streamBrandCheckException(name) {
    return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
}

export { ByteLengthQueuingStrategy, CountQueuingStrategy, ReadableByteStreamController, ReadableStream, ReadableStreamBYOBReader, ReadableStreamBYOBRequest, ReadableStreamDefaultController, ReadableStreamDefaultReader, TransformStream, TransformStreamDefaultController, WritableStream, WritableStreamDefaultController, WritableStreamDefaultWriter };
//# sourceMappingURL=ponyfill.es2018.mjs.map
