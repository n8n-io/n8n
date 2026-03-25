// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var _a;
import extend from 'extend';
import { Agent as HTTPSAgent } from 'https';
import { GaxiosError, defaultErrorRedactor, } from './common.js';
import { getRetryConfig } from './retry.js';
import { Readable } from 'stream';
import { GaxiosInterceptorManager } from './interceptor.js';
const randomUUID = async () => globalThis.crypto?.randomUUID() || (await import('crypto')).randomUUID();
const HTTP_STATUS_NO_CONTENT = 204;
export class Gaxios {
    agentCache = new Map();
    /**
     * Default HTTP options that will be used for every HTTP request.
     */
    defaults;
    /**
     * Interceptors
     */
    interceptors;
    /**
     * The Gaxios class is responsible for making HTTP requests.
     * @param defaults The default set of options to be used for this instance.
     */
    constructor(defaults) {
        this.defaults = defaults || {};
        this.interceptors = {
            request: new GaxiosInterceptorManager(),
            response: new GaxiosInterceptorManager(),
        };
    }
    /**
     * A {@link fetch `fetch`} compliant API for {@link Gaxios}.
     *
     * @remarks
     *
     * This is useful as a drop-in replacement for `fetch` API usage.
     *
     * @example
     *
     * ```ts
     * const gaxios = new Gaxios();
     * const myFetch: typeof fetch = (...args) => gaxios.fetch(...args);
     * await myFetch('https://example.com');
     * ```
     *
     * @param args `fetch` API or `Gaxios#request` parameters
     * @returns the {@link Response} with Gaxios-added properties
     */
    fetch(...args) {
        // Up to 2 parameters in either overload
        const input = args[0];
        const init = args[1];
        let url = undefined;
        const headers = new Headers();
        // prepare URL
        if (typeof input === 'string') {
            url = new URL(input);
        }
        else if (input instanceof URL) {
            url = input;
        }
        else if (input && input.url) {
            url = new URL(input.url);
        }
        // prepare headers
        if (input && typeof input === 'object' && 'headers' in input) {
            _a.mergeHeaders(headers, input.headers);
        }
        if (init) {
            _a.mergeHeaders(headers, new Headers(init.headers));
        }
        // prepare request
        if (typeof input === 'object' && !(input instanceof URL)) {
            // input must have been a non-URL object
            return this.request({ ...init, ...input, headers, url });
        }
        else {
            // input must have been a string or URL
            return this.request({ ...init, headers, url });
        }
    }
    /**
     * Perform an HTTP request with the given options.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    async request(opts = {}) {
        let prepared = await this.#prepareRequest(opts);
        prepared = await this.#applyRequestInterceptors(prepared);
        return this.#applyResponseInterceptors(this._request(prepared));
    }
    async _defaultAdapter(config) {
        const fetchImpl = config.fetchImplementation ||
            this.defaults.fetchImplementation ||
            (await _a.#getFetch());
        // node-fetch v3 warns when `data` is present
        // https://github.com/node-fetch/node-fetch/issues/1000
        const preparedOpts = { ...config };
        delete preparedOpts.data;
        const res = (await fetchImpl(config.url, preparedOpts));
        const data = await this.getResponseData(config, res);
        if (!Object.getOwnPropertyDescriptor(res, 'data')?.configurable) {
            // Work-around for `node-fetch` v3 as accessing `data` would otherwise throw
            Object.defineProperties(res, {
                data: {
                    configurable: true,
                    writable: true,
                    enumerable: true,
                    value: data,
                },
            });
        }
        // Keep object as an instance of `Response`
        return Object.assign(res, { config, data });
    }
    /**
     * Internal, retryable version of the `request` method.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    async _request(opts) {
        try {
            let translatedResponse;
            if (opts.adapter) {
                translatedResponse = await opts.adapter(opts, this._defaultAdapter.bind(this));
            }
            else {
                translatedResponse = await this._defaultAdapter(opts);
            }
            if (!opts.validateStatus(translatedResponse.status)) {
                if (opts.responseType === 'stream') {
                    const response = [];
                    for await (const chunk of translatedResponse.data) {
                        response.push(chunk);
                    }
                    translatedResponse.data = response.toString();
                }
                const errorInfo = GaxiosError.extractAPIErrorFromResponse(translatedResponse, `Request failed with status code ${translatedResponse.status}`);
                throw new GaxiosError(errorInfo?.message, opts, translatedResponse, errorInfo);
            }
            return translatedResponse;
        }
        catch (e) {
            let err;
            if (e instanceof GaxiosError) {
                err = e;
            }
            else if (e instanceof Error) {
                err = new GaxiosError(e.message, opts, undefined, e);
            }
            else {
                err = new GaxiosError('Unexpected Gaxios Error', opts, undefined, e);
            }
            const { shouldRetry, config } = await getRetryConfig(err);
            if (shouldRetry && config) {
                err.config.retryConfig.currentRetryAttempt =
                    config.retryConfig.currentRetryAttempt;
                // The error's config could be redacted - therefore we only want to
                // copy the retry state over to the existing config
                opts.retryConfig = err.config?.retryConfig;
                // re-prepare timeout for the next request
                this.#appendTimeoutToSignal(opts);
                return this._request(opts);
            }
            if (opts.errorRedactor) {
                opts.errorRedactor(err);
            }
            throw err;
        }
    }
    async getResponseData(opts, res) {
        if (res.status === HTTP_STATUS_NO_CONTENT) {
            return '';
        }
        if (opts.maxContentLength &&
            res.headers.has('content-length') &&
            opts.maxContentLength <
                Number.parseInt(res.headers?.get('content-length') || '')) {
            throw new GaxiosError("Response's `Content-Length` is over the limit.", opts, Object.assign(res, { config: opts }));
        }
        switch (opts.responseType) {
            case 'stream':
                return res.body;
            case 'json': {
                const data = await res.text();
                try {
                    return JSON.parse(data);
                }
                catch {
                    return data;
                }
            }
            case 'arraybuffer':
                return res.arrayBuffer();
            case 'blob':
                return res.blob();
            case 'text':
                return res.text();
            default:
                return this.getResponseDataFromContentType(res);
        }
    }
    #urlMayUseProxy(url, noProxy = []) {
        const candidate = new URL(url);
        const noProxyList = [...noProxy];
        const noProxyEnvList = (process.env.NO_PROXY ?? process.env.no_proxy)?.split(',') || [];
        for (const rule of noProxyEnvList) {
            noProxyList.push(rule.trim());
        }
        for (const rule of noProxyList) {
            // Match regex
            if (rule instanceof RegExp) {
                if (rule.test(candidate.toString())) {
                    return false;
                }
            }
            // Match URL
            else if (rule instanceof URL) {
                if (rule.origin === candidate.origin) {
                    return false;
                }
            }
            // Match string regex
            else if (rule.startsWith('*.') || rule.startsWith('.')) {
                const cleanedRule = rule.replace(/^\*\./, '.');
                if (candidate.hostname.endsWith(cleanedRule)) {
                    return false;
                }
            }
            // Basic string match
            else if (rule === candidate.origin ||
                rule === candidate.hostname ||
                rule === candidate.href) {
                return false;
            }
        }
        return true;
    }
    /**
     * Applies the request interceptors. The request interceptors are applied after the
     * call to prepareRequest is completed.
     *
     * @param {GaxiosOptionsPrepared} options The current set of options.
     *
     * @returns {Promise<GaxiosOptionsPrepared>} Promise that resolves to the set of options or response after interceptors are applied.
     */
    async #applyRequestInterceptors(options) {
        let promiseChain = Promise.resolve(options);
        for (const interceptor of this.interceptors.request.values()) {
            if (interceptor) {
                promiseChain = promiseChain.then(interceptor.resolved, interceptor.rejected);
            }
        }
        return promiseChain;
    }
    /**
     * Applies the response interceptors. The response interceptors are applied after the
     * call to request is made.
     *
     * @param {GaxiosOptionsPrepared} options The current set of options.
     *
     * @returns {Promise<GaxiosOptionsPrepared>} Promise that resolves to the set of options or response after interceptors are applied.
     */
    async #applyResponseInterceptors(response) {
        let promiseChain = Promise.resolve(response);
        for (const interceptor of this.interceptors.response.values()) {
            if (interceptor) {
                promiseChain = promiseChain.then(interceptor.resolved, interceptor.rejected);
            }
        }
        return promiseChain;
    }
    /**
     * Validates the options, merges them with defaults, and prepare request.
     *
     * @param options The original options passed from the client.
     * @returns Prepared options, ready to make a request
     */
    async #prepareRequest(options) {
        // Prepare Headers - copy in order to not mutate the original objects
        const preparedHeaders = new Headers(this.defaults.headers);
        _a.mergeHeaders(preparedHeaders, options.headers);
        // Merge options
        const opts = extend(true, {}, this.defaults, options);
        if (!opts.url) {
            throw new Error('URL is required.');
        }
        if (opts.baseURL) {
            opts.url = new URL(opts.url, opts.baseURL);
        }
        // don't modify the properties of a default or provided URL
        opts.url = new URL(opts.url);
        if (opts.params) {
            if (opts.paramsSerializer) {
                let additionalQueryParams = opts.paramsSerializer(opts.params);
                if (additionalQueryParams.startsWith('?')) {
                    additionalQueryParams = additionalQueryParams.slice(1);
                }
                const prefix = opts.url.toString().includes('?') ? '&' : '?';
                opts.url = opts.url + prefix + additionalQueryParams;
            }
            else {
                const url = opts.url instanceof URL ? opts.url : new URL(opts.url);
                for (const [key, value] of new URLSearchParams(opts.params)) {
                    url.searchParams.append(key, value);
                }
                opts.url = url;
            }
        }
        if (typeof options.maxContentLength === 'number') {
            opts.size = options.maxContentLength;
        }
        if (typeof options.maxRedirects === 'number') {
            opts.follow = options.maxRedirects;
        }
        const shouldDirectlyPassData = typeof opts.data === 'string' ||
            opts.data instanceof ArrayBuffer ||
            opts.data instanceof Blob ||
            // Node 18 does not have a global `File` object
            (globalThis.File && opts.data instanceof File) ||
            opts.data instanceof FormData ||
            opts.data instanceof Readable ||
            opts.data instanceof ReadableStream ||
            opts.data instanceof String ||
            opts.data instanceof URLSearchParams ||
            ArrayBuffer.isView(opts.data) || // `Buffer` (Node.js), `DataView`, `TypedArray`
            /**
             * @deprecated `node-fetch` or another third-party's request types
             */
            ['Blob', 'File', 'FormData'].includes(opts.data?.constructor?.name || '');
        if (opts.multipart?.length) {
            const boundary = await randomUUID();
            preparedHeaders.set('content-type', `multipart/related; boundary=${boundary}`);
            opts.body = Readable.from(this.getMultipartRequest(opts.multipart, boundary));
        }
        else if (shouldDirectlyPassData) {
            opts.body = opts.data;
        }
        else if (typeof opts.data === 'object') {
            if (preparedHeaders.get('Content-Type') ===
                'application/x-www-form-urlencoded') {
                // If www-form-urlencoded content type has been set, but data is
                // provided as an object, serialize the content
                opts.body = opts.paramsSerializer
                    ? opts.paramsSerializer(opts.data)
                    : new URLSearchParams(opts.data);
            }
            else {
                if (!preparedHeaders.has('content-type')) {
                    preparedHeaders.set('content-type', 'application/json');
                }
                opts.body = JSON.stringify(opts.data);
            }
        }
        else if (opts.data) {
            opts.body = opts.data;
        }
        opts.validateStatus = opts.validateStatus || this.validateStatus;
        opts.responseType = opts.responseType || 'unknown';
        if (!preparedHeaders.has('accept') && opts.responseType === 'json') {
            preparedHeaders.set('accept', 'application/json');
        }
        const proxy = opts.proxy ||
            process?.env?.HTTPS_PROXY ||
            process?.env?.https_proxy ||
            process?.env?.HTTP_PROXY ||
            process?.env?.http_proxy;
        if (opts.agent) {
            // don't do any of the following options - use the user-provided agent.
        }
        else if (proxy && this.#urlMayUseProxy(opts.url, opts.noProxy)) {
            const HttpsProxyAgent = await _a.#getProxyAgent();
            if (this.agentCache.has(proxy)) {
                opts.agent = this.agentCache.get(proxy);
            }
            else {
                opts.agent = new HttpsProxyAgent(proxy, {
                    cert: opts.cert,
                    key: opts.key,
                });
                this.agentCache.set(proxy, opts.agent);
            }
        }
        else if (opts.cert && opts.key) {
            // Configure client for mTLS
            if (this.agentCache.has(opts.key)) {
                opts.agent = this.agentCache.get(opts.key);
            }
            else {
                opts.agent = new HTTPSAgent({
                    cert: opts.cert,
                    key: opts.key,
                });
                this.agentCache.set(opts.key, opts.agent);
            }
        }
        if (typeof opts.errorRedactor !== 'function' &&
            opts.errorRedactor !== false) {
            opts.errorRedactor = defaultErrorRedactor;
        }
        if (opts.body && !('duplex' in opts)) {
            /**
             * required for Node.js and the type isn't available today
             * @link https://github.com/nodejs/node/issues/46221
             * @link https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1483
             */
            opts.duplex = 'half';
        }
        this.#appendTimeoutToSignal(opts);
        return Object.assign(opts, {
            headers: preparedHeaders,
            url: opts.url instanceof URL ? opts.url : new URL(opts.url),
        });
    }
    #appendTimeoutToSignal(opts) {
        if (opts.timeout) {
            const timeoutSignal = AbortSignal.timeout(opts.timeout);
            if (opts.signal && !opts.signal.aborted) {
                opts.signal = AbortSignal.any([opts.signal, timeoutSignal]);
            }
            else {
                opts.signal = timeoutSignal;
            }
        }
    }
    /**
     * By default, throw for any non-2xx status code
     * @param status status code from the HTTP response
     */
    validateStatus(status) {
        return status >= 200 && status < 300;
    }
    /**
     * Attempts to parse a response by looking at the Content-Type header.
     * @param {Response} response the HTTP response.
     * @returns a promise that resolves to the response data.
     */
    async getResponseDataFromContentType(response) {
        let contentType = response.headers.get('Content-Type');
        if (contentType === null) {
            // Maintain existing functionality by calling text()
            return response.text();
        }
        contentType = contentType.toLowerCase();
        if (contentType.includes('application/json')) {
            let data = await response.text();
            try {
                data = JSON.parse(data);
            }
            catch {
                // continue
            }
            return data;
        }
        else if (contentType.match(/^text\//)) {
            return response.text();
        }
        else {
            // If the content type is something not easily handled, just return the raw data (blob)
            return response.blob();
        }
    }
    /**
     * Creates an async generator that yields the pieces of a multipart/related request body.
     * This implementation follows the spec: https://www.ietf.org/rfc/rfc2387.txt. However, recursive
     * multipart/related requests are not currently supported.
     *
     * @param {GaxiosMultipartOptions[]} multipartOptions the pieces to turn into a multipart/related body.
     * @param {string} boundary the boundary string to be placed between each part.
     */
    async *getMultipartRequest(multipartOptions, boundary) {
        const finale = `--${boundary}--`;
        for (const currentPart of multipartOptions) {
            const partContentType = currentPart.headers.get('Content-Type') || 'application/octet-stream';
            const preamble = `--${boundary}\r\nContent-Type: ${partContentType}\r\n\r\n`;
            yield preamble;
            if (typeof currentPart.content === 'string') {
                yield currentPart.content;
            }
            else {
                yield* currentPart.content;
            }
            yield '\r\n';
        }
        yield finale;
    }
    /**
     * A cache for the lazily-loaded proxy agent.
     *
     * Should use {@link Gaxios[#getProxyAgent]} to retrieve.
     */
    // using `import` to dynamically import the types here
    static #proxyAgent;
    /**
     * A cache for the lazily-loaded fetch library.
     *
     * Should use {@link Gaxios[#getFetch]} to retrieve.
     */
    //
    static #fetch;
    /**
     * Imports, caches, and returns a proxy agent - if not already imported
     *
     * @returns A proxy agent
     */
    static async #getProxyAgent() {
        this.#proxyAgent ||= (await import('https-proxy-agent')).HttpsProxyAgent;
        return this.#proxyAgent;
    }
    static async #getFetch() {
        const hasWindow = typeof window !== 'undefined' && !!window;
        this.#fetch ||= hasWindow
            ? window.fetch
            : (await import('node-fetch')).default;
        return this.#fetch;
    }
    /**
     * Merges headers.
     * If the base headers do not exist a new `Headers` object will be returned.
     *
     * @remarks
     *
     * Using this utility can be helpful when the headers are not known to exist:
     * - if they exist as `Headers`, that instance will be used
     *   - it improves performance and allows users to use their existing references to their `Headers`
     * - if they exist in another form (`HeadersInit`), they will be used to create a new `Headers` object
     * - if the base headers do not exist a new `Headers` object will be created
     *
     * @param base headers to append/overwrite to
     * @param append headers to append/overwrite with
     * @returns the base headers instance with merged `Headers`
     */
    static mergeHeaders(base, ...append) {
        base = base instanceof Headers ? base : new Headers(base);
        for (const headers of append) {
            const add = headers instanceof Headers ? headers : new Headers(headers);
            add.forEach((value, key) => {
                // set-cookie is the only header that would repeat.
                // A bit of background: https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
                key === 'set-cookie' ? base.append(key, value) : base.set(key, value);
            });
        }
        return base;
    }
}
_a = Gaxios;
//# sourceMappingURL=gaxios.js.map