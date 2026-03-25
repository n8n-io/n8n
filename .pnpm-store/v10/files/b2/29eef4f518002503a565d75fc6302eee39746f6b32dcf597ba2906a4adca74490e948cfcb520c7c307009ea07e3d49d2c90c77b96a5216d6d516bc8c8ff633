// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Upload_instances, _Upload_gcclGcsCmd, _Upload_resetLocalBuffersCache, _Upload_addLocalBufferCache;
import AbortController from 'abort-controller';
import { createHash } from 'crypto';
import * as gaxios from 'gaxios';
import { DEFAULT_UNIVERSE, GoogleAuth, } from 'google-auth-library';
import { Readable, Writable } from 'stream';
import AsyncRetry from 'async-retry';
import * as uuid from 'uuid';
import { getRuntimeTrackingString, getModuleFormat, getUserAgentString, } from './util.js';
import { GCCL_GCS_CMD_KEY } from './nodejs-common/util.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getPackageJSON } from './package-json-helper.cjs';
const NOT_FOUND_STATUS_CODE = 404;
const RESUMABLE_INCOMPLETE_STATUS_CODE = 308;
const packageJson = getPackageJSON();
export const PROTOCOL_REGEX = /^(\w*):\/\//;
export class Upload extends Writable {
    constructor(cfg) {
        var _a;
        super(cfg);
        _Upload_instances.add(this);
        this.numBytesWritten = 0;
        this.numRetries = 0;
        this.currentInvocationId = {
            checkUploadStatus: uuid.v4(),
            chunk: uuid.v4(),
            uri: uuid.v4(),
        };
        /**
         * A cache of buffers written to this instance, ready for consuming
         */
        this.writeBuffers = [];
        this.numChunksReadInRequest = 0;
        /**
         * An array of buffers used for caching the most recent upload chunk.
         * We should not assume that the server received all bytes sent in the request.
         *  - https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload
         */
        this.localWriteCache = [];
        this.localWriteCacheByteLength = 0;
        this.upstreamEnded = false;
        _Upload_gcclGcsCmd.set(this, void 0);
        cfg = cfg || {};
        if (!cfg.bucket || !cfg.file) {
            throw new Error('A bucket and file name are required');
        }
        if (cfg.offset && !cfg.uri) {
            throw new RangeError('Cannot provide an `offset` without providing a `uri`');
        }
        if (cfg.isPartialUpload && !cfg.chunkSize) {
            throw new RangeError('Cannot set `isPartialUpload` without providing a `chunkSize`');
        }
        cfg.authConfig = cfg.authConfig || {};
        cfg.authConfig.scopes = [
            'https://www.googleapis.com/auth/devstorage.full_control',
        ];
        this.authClient = cfg.authClient || new GoogleAuth(cfg.authConfig);
        const universe = cfg.universeDomain || DEFAULT_UNIVERSE;
        this.apiEndpoint = `https://storage.${universe}`;
        if (cfg.apiEndpoint && cfg.apiEndpoint !== this.apiEndpoint) {
            this.apiEndpoint = this.sanitizeEndpoint(cfg.apiEndpoint);
            const hostname = new URL(this.apiEndpoint).hostname;
            // check if it is a domain of a known universe
            const isDomain = hostname === universe;
            const isDefaultUniverseDomain = hostname === DEFAULT_UNIVERSE;
            // check if it is a subdomain of a known universe
            // by checking a last (universe's length + 1) of a hostname
            const isSubDomainOfUniverse = hostname.slice(-(universe.length + 1)) === `.${universe}`;
            const isSubDomainOfDefaultUniverse = hostname.slice(-(DEFAULT_UNIVERSE.length + 1)) ===
                `.${DEFAULT_UNIVERSE}`;
            if (!isDomain &&
                !isDefaultUniverseDomain &&
                !isSubDomainOfUniverse &&
                !isSubDomainOfDefaultUniverse) {
                // a custom, non-universe domain,
                // use gaxios
                this.authClient = gaxios;
            }
        }
        this.baseURI = `${this.apiEndpoint}/upload/storage/v1/b`;
        this.bucket = cfg.bucket;
        const cacheKeyElements = [cfg.bucket, cfg.file];
        if (typeof cfg.generation === 'number') {
            cacheKeyElements.push(`${cfg.generation}`);
        }
        this.cacheKey = cacheKeyElements.join('/');
        this.customRequestOptions = cfg.customRequestOptions || {};
        this.file = cfg.file;
        this.generation = cfg.generation;
        this.kmsKeyName = cfg.kmsKeyName;
        this.metadata = cfg.metadata || {};
        this.offset = cfg.offset;
        this.origin = cfg.origin;
        this.params = cfg.params || {};
        this.userProject = cfg.userProject;
        this.chunkSize = cfg.chunkSize;
        this.retryOptions = cfg.retryOptions;
        this.isPartialUpload = (_a = cfg.isPartialUpload) !== null && _a !== void 0 ? _a : false;
        if (cfg.key) {
            const base64Key = Buffer.from(cfg.key).toString('base64');
            this.encryption = {
                key: base64Key,
                hash: createHash('sha256').update(cfg.key).digest('base64'),
            };
        }
        this.predefinedAcl = cfg.predefinedAcl;
        if (cfg.private)
            this.predefinedAcl = 'private';
        if (cfg.public)
            this.predefinedAcl = 'publicRead';
        const autoRetry = cfg.retryOptions.autoRetry;
        this.uriProvidedManually = !!cfg.uri;
        this.uri = cfg.uri;
        if (this.offset) {
            // we're resuming an incomplete upload
            this.numBytesWritten = this.offset;
        }
        this.numRetries = 0; // counter for number of retries currently executed
        if (!autoRetry) {
            cfg.retryOptions.maxRetries = 0;
        }
        this.timeOfFirstRequest = Date.now();
        const contentLength = cfg.metadata
            ? Number(cfg.metadata.contentLength)
            : NaN;
        this.contentLength = isNaN(contentLength) ? '*' : contentLength;
        __classPrivateFieldSet(this, _Upload_gcclGcsCmd, cfg[GCCL_GCS_CMD_KEY], "f");
        this.once('writing', () => {
            if (this.uri) {
                this.continueUploading();
            }
            else {
                this.createURI(err => {
                    if (err) {
                        return this.destroy(err);
                    }
                    this.startUploading();
                    return;
                });
            }
        });
    }
    /**
     * Prevent 'finish' event until the upload has succeeded.
     *
     * @param fireFinishEvent The finish callback
     */
    _final(fireFinishEvent = () => { }) {
        this.upstreamEnded = true;
        this.once('uploadFinished', fireFinishEvent);
        process.nextTick(() => {
            this.emit('upstreamFinished');
            // it's possible `_write` may not be called - namely for empty object uploads
            this.emit('writing');
        });
    }
    /**
     * Handles incoming data from upstream
     *
     * @param chunk The chunk to append to the buffer
     * @param encoding The encoding of the chunk
     * @param readCallback A callback for when the buffer has been read downstream
     */
    _write(chunk, encoding, readCallback = () => { }) {
        // Backwards-compatible event
        this.emit('writing');
        this.writeBuffers.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk);
        this.once('readFromChunkBuffer', readCallback);
        process.nextTick(() => this.emit('wroteToChunkBuffer'));
    }
    /**
     * Prepends the local buffer to write buffer and resets it.
     *
     * @param keepLastBytes number of bytes to keep from the end of the local buffer.
     */
    prependLocalBufferToUpstream(keepLastBytes) {
        // Typically, the upstream write buffers should be smaller than the local
        // cache, so we can save time by setting the local cache as the new
        // upstream write buffer array and appending the old array to it
        let initialBuffers = [];
        if (keepLastBytes) {
            // we only want the last X bytes
            let bytesKept = 0;
            while (keepLastBytes > bytesKept) {
                // load backwards because we want the last X bytes
                // note: `localWriteCacheByteLength` is reset below
                let buf = this.localWriteCache.pop();
                if (!buf)
                    break;
                bytesKept += buf.byteLength;
                if (bytesKept > keepLastBytes) {
                    // we have gone over the amount desired, let's keep the last X bytes
                    // of this buffer
                    const diff = bytesKept - keepLastBytes;
                    buf = buf.subarray(diff);
                    bytesKept -= diff;
                }
                initialBuffers.unshift(buf);
            }
        }
        else {
            // we're keeping all of the local cache, simply use it as the initial buffer
            initialBuffers = this.localWriteCache;
        }
        // Append the old upstream to the new
        const append = this.writeBuffers;
        this.writeBuffers = initialBuffers;
        for (const buf of append) {
            this.writeBuffers.push(buf);
        }
        // reset last buffers sent
        __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_resetLocalBuffersCache).call(this);
    }
    /**
     * Retrieves data from upstream's buffer.
     *
     * @param limit The maximum amount to return from the buffer.
     */
    *pullFromChunkBuffer(limit) {
        while (limit) {
            const buf = this.writeBuffers.shift();
            if (!buf)
                break;
            let bufToYield = buf;
            if (buf.byteLength > limit) {
                bufToYield = buf.subarray(0, limit);
                this.writeBuffers.unshift(buf.subarray(limit));
                limit = 0;
            }
            else {
                limit -= buf.byteLength;
            }
            yield bufToYield;
            // Notify upstream we've read from the buffer and we're able to consume
            // more. It can also potentially send more data down as we're currently
            // iterating.
            this.emit('readFromChunkBuffer');
        }
    }
    /**
     * A handler for determining if data is ready to be read from upstream.
     *
     * @returns If there will be more chunks to read in the future
     */
    async waitForNextChunk() {
        const willBeMoreChunks = await new Promise(resolve => {
            // There's data available - it should be digested
            if (this.writeBuffers.length) {
                return resolve(true);
            }
            // The upstream writable ended, we shouldn't expect any more data.
            if (this.upstreamEnded) {
                return resolve(false);
            }
            // Nothing immediate seems to be determined. We need to prepare some
            // listeners to determine next steps...
            const wroteToChunkBufferCallback = () => {
                removeListeners();
                return resolve(true);
            };
            const upstreamFinishedCallback = () => {
                removeListeners();
                // this should be the last chunk, if there's anything there
                if (this.writeBuffers.length)
                    return resolve(true);
                return resolve(false);
            };
            // Remove listeners when we're ready to callback.
            const removeListeners = () => {
                this.removeListener('wroteToChunkBuffer', wroteToChunkBufferCallback);
                this.removeListener('upstreamFinished', upstreamFinishedCallback);
            };
            // If there's data recently written it should be digested
            this.once('wroteToChunkBuffer', wroteToChunkBufferCallback);
            // If the upstream finishes let's see if there's anything to grab
            this.once('upstreamFinished', upstreamFinishedCallback);
        });
        return willBeMoreChunks;
    }
    /**
     * Reads data from upstream up to the provided `limit`.
     * Ends when the limit has reached or no data is expected to be pushed from upstream.
     *
     * @param limit The most amount of data this iterator should return. `Infinity` by default.
     */
    async *upstreamIterator(limit = Infinity) {
        // read from upstream chunk buffer
        while (limit && (await this.waitForNextChunk())) {
            // read until end or limit has been reached
            for (const chunk of this.pullFromChunkBuffer(limit)) {
                limit -= chunk.byteLength;
                yield chunk;
            }
        }
    }
    createURI(callback) {
        if (!callback) {
            return this.createURIAsync();
        }
        this.createURIAsync().then(r => callback(null, r), callback);
    }
    async createURIAsync() {
        const metadata = { ...this.metadata };
        const headers = {};
        // Delete content length and content type from metadata if they exist.
        // These are headers and should not be sent as part of the metadata.
        if (metadata.contentLength) {
            headers['X-Upload-Content-Length'] = metadata.contentLength.toString();
            delete metadata.contentLength;
        }
        if (metadata.contentType) {
            headers['X-Upload-Content-Type'] = metadata.contentType;
            delete metadata.contentType;
        }
        let googAPIClient = `${getRuntimeTrackingString()} gccl/${packageJson.version}-${getModuleFormat()} gccl-invocation-id/${this.currentInvocationId.uri}`;
        if (__classPrivateFieldGet(this, _Upload_gcclGcsCmd, "f")) {
            googAPIClient += ` gccl-gcs-cmd/${__classPrivateFieldGet(this, _Upload_gcclGcsCmd, "f")}`;
        }
        // Check if headers already exist before creating new ones
        const reqOpts = {
            method: 'POST',
            url: [this.baseURI, this.bucket, 'o'].join('/'),
            params: Object.assign({
                name: this.file,
                uploadType: 'resumable',
            }, this.params),
            data: metadata,
            headers: {
                'User-Agent': getUserAgentString(),
                'x-goog-api-client': googAPIClient,
                ...headers,
            },
        };
        if (metadata.contentLength) {
            reqOpts.headers['X-Upload-Content-Length'] =
                metadata.contentLength.toString();
        }
        if (metadata.contentType) {
            reqOpts.headers['X-Upload-Content-Type'] = metadata.contentType;
        }
        if (typeof this.generation !== 'undefined') {
            reqOpts.params.ifGenerationMatch = this.generation;
        }
        if (this.kmsKeyName) {
            reqOpts.params.kmsKeyName = this.kmsKeyName;
        }
        if (this.predefinedAcl) {
            reqOpts.params.predefinedAcl = this.predefinedAcl;
        }
        if (this.origin) {
            reqOpts.headers.Origin = this.origin;
        }
        const uri = await AsyncRetry(async (bail) => {
            var _a, _b, _c;
            try {
                const res = await this.makeRequest(reqOpts);
                // We have successfully got a URI we can now create a new invocation id
                this.currentInvocationId.uri = uuid.v4();
                return res.headers.location;
            }
            catch (err) {
                const e = err;
                const apiError = {
                    code: (_a = e.response) === null || _a === void 0 ? void 0 : _a.status,
                    name: (_b = e.response) === null || _b === void 0 ? void 0 : _b.statusText,
                    message: (_c = e.response) === null || _c === void 0 ? void 0 : _c.statusText,
                    errors: [
                        {
                            reason: e.code,
                        },
                    ],
                };
                if (this.retryOptions.maxRetries > 0 &&
                    this.retryOptions.retryableErrorFn(apiError)) {
                    throw e;
                }
                else {
                    return bail(e);
                }
            }
        }, {
            retries: this.retryOptions.maxRetries,
            factor: this.retryOptions.retryDelayMultiplier,
            maxTimeout: this.retryOptions.maxRetryDelay * 1000, //convert to milliseconds
            maxRetryTime: this.retryOptions.totalTimeout * 1000, //convert to milliseconds
        });
        this.uri = uri;
        this.offset = 0;
        // emit the newly generated URI for future reuse, if necessary.
        this.emit('uri', uri);
        return uri;
    }
    async continueUploading() {
        var _a;
        (_a = this.offset) !== null && _a !== void 0 ? _a : (await this.getAndSetOffset());
        return this.startUploading();
    }
    async startUploading() {
        const multiChunkMode = !!this.chunkSize;
        let responseReceived = false;
        this.numChunksReadInRequest = 0;
        if (!this.offset) {
            this.offset = 0;
        }
        // Check if the offset (server) is too far behind the current stream
        if (this.offset < this.numBytesWritten) {
            const delta = this.numBytesWritten - this.offset;
            const message = `The offset is lower than the number of bytes written. The server has ${this.offset} bytes and while ${this.numBytesWritten} bytes has been uploaded - thus ${delta} bytes are missing. Stopping as this could result in data loss. Initiate a new upload to continue.`;
            this.emit('error', new RangeError(message));
            return;
        }
        // Check if we should 'fast-forward' to the relevant data to upload
        if (this.numBytesWritten < this.offset) {
            // 'fast-forward' to the byte where we need to upload.
            // only push data from the byte after the one we left off on
            const fastForwardBytes = this.offset - this.numBytesWritten;
            for await (const _chunk of this.upstreamIterator(fastForwardBytes)) {
                _chunk; // discard the data up until the point we want
            }
            this.numBytesWritten = this.offset;
        }
        let expectedUploadSize = undefined;
        // Set `expectedUploadSize` to `contentLength - this.numBytesWritten`, if available
        if (typeof this.contentLength === 'number') {
            expectedUploadSize = this.contentLength - this.numBytesWritten;
        }
        // `expectedUploadSize` should be no more than the `chunkSize`.
        // It's possible this is the last chunk request for a multiple
        // chunk upload, thus smaller than the chunk size.
        if (this.chunkSize) {
            expectedUploadSize = expectedUploadSize
                ? Math.min(this.chunkSize, expectedUploadSize)
                : this.chunkSize;
        }
        // A queue for the upstream data
        const upstreamQueue = this.upstreamIterator(expectedUploadSize);
        // The primary read stream for this request. This stream retrieves no more
        // than the exact requested amount from upstream.
        const requestStream = new Readable({
            read: async () => {
                // Don't attempt to retrieve data upstream if we already have a response
                if (responseReceived)
                    requestStream.push(null);
                const result = await upstreamQueue.next();
                if (result.value) {
                    this.numChunksReadInRequest++;
                    if (multiChunkMode) {
                        // save ever buffer used in the request in multi-chunk mode
                        __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_addLocalBufferCache).call(this, result.value);
                    }
                    else {
                        __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_resetLocalBuffersCache).call(this);
                        __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_addLocalBufferCache).call(this, result.value);
                    }
                    this.numBytesWritten += result.value.byteLength;
                    this.emit('progress', {
                        bytesWritten: this.numBytesWritten,
                        contentLength: this.contentLength,
                    });
                    requestStream.push(result.value);
                }
                if (result.done) {
                    requestStream.push(null);
                }
            },
        });
        let googAPIClient = `${getRuntimeTrackingString()} gccl/${packageJson.version}-${getModuleFormat()} gccl-invocation-id/${this.currentInvocationId.chunk}`;
        if (__classPrivateFieldGet(this, _Upload_gcclGcsCmd, "f")) {
            googAPIClient += ` gccl-gcs-cmd/${__classPrivateFieldGet(this, _Upload_gcclGcsCmd, "f")}`;
        }
        const headers = {
            'User-Agent': getUserAgentString(),
            'x-goog-api-client': googAPIClient,
        };
        // If using multiple chunk upload, set appropriate header
        if (multiChunkMode) {
            // We need to know how much data is available upstream to set the `Content-Range` header.
            // https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload
            for await (const chunk of this.upstreamIterator(expectedUploadSize)) {
                // This will conveniently track and keep the size of the buffers.
                // We will reach either the expected upload size or the remainder of the stream.
                __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_addLocalBufferCache).call(this, chunk);
            }
            // This is the sum from the `#addLocalBufferCache` calls
            const bytesToUpload = this.localWriteCacheByteLength;
            // Important: we want to know if the upstream has ended and the queue is empty before
            // unshifting data back into the queue. This way we will know if this is the last request or not.
            const isLastChunkOfUpload = !(await this.waitForNextChunk());
            // Important: put the data back in the queue for the actual upload
            this.prependLocalBufferToUpstream();
            let totalObjectSize = this.contentLength;
            if (typeof this.contentLength !== 'number' &&
                isLastChunkOfUpload &&
                !this.isPartialUpload) {
                // Let's let the server know this is the last chunk of the object since we didn't set it before.
                totalObjectSize = bytesToUpload + this.numBytesWritten;
            }
            // `- 1` as the ending byte is inclusive in the request.
            const endingByte = bytesToUpload + this.numBytesWritten - 1;
            // `Content-Length` for multiple chunk uploads is the size of the chunk,
            // not the overall object
            headers['Content-Length'] = bytesToUpload;
            headers['Content-Range'] =
                `bytes ${this.offset}-${endingByte}/${totalObjectSize}`;
        }
        else {
            headers['Content-Range'] = `bytes ${this.offset}-*/${this.contentLength}`;
        }
        const reqOpts = {
            method: 'PUT',
            url: this.uri,
            headers,
            body: requestStream,
        };
        try {
            const resp = await this.makeRequestStream(reqOpts);
            if (resp) {
                responseReceived = true;
                await this.responseHandler(resp);
            }
        }
        catch (e) {
            const err = e;
            if (this.retryOptions.retryableErrorFn(err)) {
                this.attemptDelayedRetry({
                    status: NaN,
                    data: err,
                });
                return;
            }
            this.destroy(err);
        }
    }
    // Process the API response to look for errors that came in
    // the response body.
    async responseHandler(resp) {
        if (resp.data.error) {
            this.destroy(resp.data.error);
            return;
        }
        // At this point we can safely create a new id for the chunk
        this.currentInvocationId.chunk = uuid.v4();
        const moreDataToUpload = await this.waitForNextChunk();
        const shouldContinueWithNextMultiChunkRequest = this.chunkSize &&
            resp.status === RESUMABLE_INCOMPLETE_STATUS_CODE &&
            resp.headers.range &&
            moreDataToUpload;
        /**
         * This is true when we're expecting to upload more data in a future request,
         * yet the upstream for the upload session has been exhausted.
         */
        const shouldContinueUploadInAnotherRequest = this.isPartialUpload &&
            resp.status === RESUMABLE_INCOMPLETE_STATUS_CODE &&
            !moreDataToUpload;
        if (shouldContinueWithNextMultiChunkRequest) {
            // Use the upper value in this header to determine where to start the next chunk.
            // We should not assume that the server received all bytes sent in the request.
            // https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload
            const range = resp.headers.range;
            this.offset = Number(range.split('-')[1]) + 1;
            // We should not assume that the server received all bytes sent in the request.
            // - https://cloud.google.com/storage/docs/performing-resumable-uploads#chunked-upload
            const missingBytes = this.numBytesWritten - this.offset;
            if (missingBytes) {
                // As multi-chunk uploads send one chunk per request and pulls one
                // chunk into the pipeline, prepending the missing bytes back should
                // be fine for the next request.
                this.prependLocalBufferToUpstream(missingBytes);
                this.numBytesWritten -= missingBytes;
            }
            else {
                // No bytes missing - no need to keep the local cache
                __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_resetLocalBuffersCache).call(this);
            }
            // continue uploading next chunk
            this.continueUploading();
        }
        else if (!this.isSuccessfulResponse(resp.status) &&
            !shouldContinueUploadInAnotherRequest) {
            const err = new Error('Upload failed');
            err.code = resp.status;
            err.name = 'Upload failed';
            if (resp === null || resp === void 0 ? void 0 : resp.data) {
                err.errors = [resp === null || resp === void 0 ? void 0 : resp.data];
            }
            this.destroy(err);
        }
        else {
            // no need to keep the cache
            __classPrivateFieldGet(this, _Upload_instances, "m", _Upload_resetLocalBuffersCache).call(this);
            if (resp && resp.data) {
                resp.data.size = Number(resp.data.size);
            }
            this.emit('metadata', resp.data);
            // Allow the object (Upload) to continue naturally so the user's
            // "finish" event fires.
            this.emit('uploadFinished');
        }
    }
    /**
     * Check the status of an existing resumable upload.
     *
     * @param cfg A configuration to use. `uri` is required.
     * @returns the current upload status
     */
    async checkUploadStatus(config = {}) {
        let googAPIClient = `${getRuntimeTrackingString()} gccl/${packageJson.version}-${getModuleFormat()} gccl-invocation-id/${this.currentInvocationId.checkUploadStatus}`;
        if (__classPrivateFieldGet(this, _Upload_gcclGcsCmd, "f")) {
            googAPIClient += ` gccl-gcs-cmd/${__classPrivateFieldGet(this, _Upload_gcclGcsCmd, "f")}`;
        }
        const opts = {
            method: 'PUT',
            url: this.uri,
            headers: {
                'Content-Length': 0,
                'Content-Range': 'bytes */*',
                'User-Agent': getUserAgentString(),
                'x-goog-api-client': googAPIClient,
            },
        };
        try {
            const resp = await this.makeRequest(opts);
            // Successfully got the offset we can now create a new offset invocation id
            this.currentInvocationId.checkUploadStatus = uuid.v4();
            return resp;
        }
        catch (e) {
            if (config.retry === false ||
                !(e instanceof Error) ||
                !this.retryOptions.retryableErrorFn(e)) {
                throw e;
            }
            const retryDelay = this.getRetryDelay();
            if (retryDelay <= 0) {
                throw e;
            }
            await new Promise(res => setTimeout(res, retryDelay));
            return this.checkUploadStatus(config);
        }
    }
    async getAndSetOffset() {
        try {
            // we want to handle retries in this method.
            const resp = await this.checkUploadStatus({ retry: false });
            if (resp.status === RESUMABLE_INCOMPLETE_STATUS_CODE) {
                if (typeof resp.headers.range === 'string') {
                    this.offset = Number(resp.headers.range.split('-')[1]) + 1;
                    return;
                }
            }
            this.offset = 0;
        }
        catch (e) {
            const err = e;
            if (this.retryOptions.retryableErrorFn(err)) {
                this.attemptDelayedRetry({
                    status: NaN,
                    data: err,
                });
                return;
            }
            this.destroy(err);
        }
    }
    async makeRequest(reqOpts) {
        if (this.encryption) {
            reqOpts.headers = reqOpts.headers || {};
            reqOpts.headers['x-goog-encryption-algorithm'] = 'AES256';
            reqOpts.headers['x-goog-encryption-key'] = this.encryption.key.toString();
            reqOpts.headers['x-goog-encryption-key-sha256'] =
                this.encryption.hash.toString();
        }
        if (this.userProject) {
            reqOpts.params = reqOpts.params || {};
            reqOpts.params.userProject = this.userProject;
        }
        // Let gaxios know we will handle a 308 error code ourselves.
        reqOpts.validateStatus = (status) => {
            return (this.isSuccessfulResponse(status) ||
                status === RESUMABLE_INCOMPLETE_STATUS_CODE);
        };
        const combinedReqOpts = {
            ...this.customRequestOptions,
            ...reqOpts,
            headers: {
                ...this.customRequestOptions.headers,
                ...reqOpts.headers,
            },
        };
        const res = await this.authClient.request(combinedReqOpts);
        if (res.data && res.data.error) {
            throw res.data.error;
        }
        return res;
    }
    async makeRequestStream(reqOpts) {
        const controller = new AbortController();
        const errorCallback = () => controller.abort();
        this.once('error', errorCallback);
        if (this.userProject) {
            reqOpts.params = reqOpts.params || {};
            reqOpts.params.userProject = this.userProject;
        }
        reqOpts.signal = controller.signal;
        reqOpts.validateStatus = () => true;
        const combinedReqOpts = {
            ...this.customRequestOptions,
            ...reqOpts,
            headers: {
                ...this.customRequestOptions.headers,
                ...reqOpts.headers,
            },
        };
        const res = await this.authClient.request(combinedReqOpts);
        const successfulRequest = this.onResponse(res);
        this.removeListener('error', errorCallback);
        return successfulRequest ? res : null;
    }
    /**
     * @return {bool} is the request good?
     */
    onResponse(resp) {
        if (resp.status !== 200 &&
            this.retryOptions.retryableErrorFn({
                code: resp.status,
                message: resp.statusText,
                name: resp.statusText,
            })) {
            this.attemptDelayedRetry(resp);
            return false;
        }
        this.emit('response', resp);
        return true;
    }
    /**
     * @param resp GaxiosResponse object from previous attempt
     */
    attemptDelayedRetry(resp) {
        if (this.numRetries < this.retryOptions.maxRetries) {
            if (resp.status === NOT_FOUND_STATUS_CODE &&
                this.numChunksReadInRequest === 0) {
                this.startUploading();
            }
            else {
                const retryDelay = this.getRetryDelay();
                if (retryDelay <= 0) {
                    this.destroy(new Error(`Retry total time limit exceeded - ${JSON.stringify(resp.data)}`));
                    return;
                }
                // Unshift the local cache back in case it's needed for the next request.
                this.numBytesWritten -= this.localWriteCacheByteLength;
                this.prependLocalBufferToUpstream();
                // We don't know how much data has been received by the server.
                // `continueUploading` will recheck the offset via `getAndSetOffset`.
                // If `offset` < `numberBytesReceived` then we will raise a RangeError
                // as we've streamed too much data that has been missed - this should
                // not be the case for multi-chunk uploads as `lastChunkSent` is the
                // body of the entire request.
                this.offset = undefined;
                setTimeout(this.continueUploading.bind(this), retryDelay);
            }
            this.numRetries++;
        }
        else {
            this.destroy(new Error(`Retry limit exceeded - ${JSON.stringify(resp.data)}`));
        }
    }
    /**
     * The amount of time to wait before retrying the request, in milliseconds.
     * If negative, do not retry.
     *
     * @returns the amount of time to wait, in milliseconds.
     */
    getRetryDelay() {
        const randomMs = Math.round(Math.random() * 1000);
        const waitTime = Math.pow(this.retryOptions.retryDelayMultiplier, this.numRetries) *
            1000 +
            randomMs;
        const maxAllowableDelayMs = this.retryOptions.totalTimeout * 1000 -
            (Date.now() - this.timeOfFirstRequest);
        const maxRetryDelayMs = this.retryOptions.maxRetryDelay * 1000;
        return Math.min(waitTime, maxRetryDelayMs, maxAllowableDelayMs);
    }
    /*
     * Prepare user-defined API endpoint for compatibility with our API.
     */
    sanitizeEndpoint(url) {
        if (!PROTOCOL_REGEX.test(url)) {
            url = `https://${url}`;
        }
        return url.replace(/\/+$/, ''); // Remove trailing slashes
    }
    /**
     * Check if a given status code is 2xx
     *
     * @param status The status code to check
     * @returns if the status is 2xx
     */
    isSuccessfulResponse(status) {
        return status >= 200 && status < 300;
    }
}
_Upload_gcclGcsCmd = new WeakMap(), _Upload_instances = new WeakSet(), _Upload_resetLocalBuffersCache = function _Upload_resetLocalBuffersCache() {
    this.localWriteCache = [];
    this.localWriteCacheByteLength = 0;
}, _Upload_addLocalBufferCache = function _Upload_addLocalBufferCache(buf) {
    this.localWriteCache.push(buf);
    this.localWriteCacheByteLength += buf.byteLength;
};
export function upload(cfg) {
    return new Upload(cfg);
}
export function createURI(cfg, callback) {
    const up = new Upload(cfg);
    if (!callback) {
        return up.createURI();
    }
    up.createURI().then(r => callback(null, r), callback);
}
/**
 * Check the status of an existing resumable upload.
 *
 * @param cfg A configuration to use. `uri` is required.
 * @returns the current upload status
 */
export function checkUploadStatus(cfg) {
    const up = new Upload(cfg);
    return up.checkUploadStatus();
}
