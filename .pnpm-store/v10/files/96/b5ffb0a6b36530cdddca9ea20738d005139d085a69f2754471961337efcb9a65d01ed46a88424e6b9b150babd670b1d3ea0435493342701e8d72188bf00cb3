'use strict';

/**
 * @typedef {Object} HttpRequest
 * @property {Record<string, string>} headers - Request headers
 * @property {string} [method] - HTTP method
 * @property {string} [url] - Request URL
 */

/**
 * @typedef {Object} HttpResponse
 * @property {Record<string, string>} headers - Response headers
 * @property {number} [status] - HTTP status code
 */

/**
 * Set of default cacheable status codes per RFC 7231 section 6.1.
 * @type {Set<number>}
 */
const statusCodeCacheableByDefault = new Set([
    200,
    203,
    204,
    206,
    300,
    301,
    308,
    404,
    405,
    410,
    414,
    501,
]);

/**
 * Set of HTTP status codes that the cache implementation understands.
 * Note: This implementation does not understand partial responses (206).
 * @type {Set<number>}
 */
const understoodStatuses = new Set([
    200,
    203,
    204,
    300,
    301,
    302,
    303,
    307,
    308,
    404,
    405,
    410,
    414,
    501,
]);

/**
 * Set of HTTP error status codes.
 * @type {Set<number>}
 */
const errorStatusCodes = new Set([
    500,
    502,
    503,
    504,
]);

/**
 * Object representing hop-by-hop headers that should be removed.
 * @type {Record<string, boolean>}
 */
const hopByHopHeaders = {
    date: true, // included, because we add Age update Date
    connection: true,
    'keep-alive': true,
    'proxy-authenticate': true,
    'proxy-authorization': true,
    te: true,
    trailer: true,
    'transfer-encoding': true,
    upgrade: true,
};

/**
 * Headers that are excluded from revalidation update.
 * @type {Record<string, boolean>}
 */
const excludedFromRevalidationUpdate = {
    // Since the old body is reused, it doesn't make sense to change properties of the body
    'content-length': true,
    'content-encoding': true,
    'transfer-encoding': true,
    'content-range': true,
};

/**
 * Converts a string to a number or returns zero if the conversion fails.
 * @param {string} s - The string to convert.
 * @returns {number} The parsed number or 0.
 */
function toNumberOrZero(s) {
    const n = parseInt(s, 10);
    return isFinite(n) ? n : 0;
}

/**
 * Determines if the given response is an error response.
 * Implements RFC 5861 behavior.
 * @param {HttpResponse|undefined} response - The HTTP response object.
 * @returns {boolean} true if the response is an error or undefined, false otherwise.
 */
function isErrorResponse(response) {
    // consider undefined response as faulty
    if (!response) {
        return true;
    }
    return errorStatusCodes.has(response.status);
}

/**
 * Parses a Cache-Control header string into an object.
 * @param {string} [header] - The Cache-Control header value.
 * @returns {Record<string, string|boolean>} An object representing Cache-Control directives.
 */
function parseCacheControl(header) {
    /** @type {Record<string, string|boolean>} */
    const cc = {};
    if (!header) return cc;

    // TODO: When there is more than one value present for a given directive (e.g., two Expires header fields, multiple Cache-Control: max-age directives),
    // the directive's value is considered invalid. Caches are encouraged to consider responses that have invalid freshness information to be stale
    const parts = header.trim().split(/,/);
    for (const part of parts) {
        const [k, v] = part.split(/=/, 2);
        cc[k.trim()] = v === undefined ? true : v.trim().replace(/^"|"$/g, '');
    }

    return cc;
}

/**
 * Formats a Cache-Control directives object into a header string.
 * @param {Record<string, string|boolean>} cc - The Cache-Control directives.
 * @returns {string|undefined} A formatted Cache-Control header string or undefined if empty.
 */
function formatCacheControl(cc) {
    let parts = [];
    for (const k in cc) {
        const v = cc[k];
        parts.push(v === true ? k : k + '=' + v);
    }
    if (!parts.length) {
        return undefined;
    }
    return parts.join(', ');
}

module.exports = class CachePolicy {
    /**
     * Creates a new CachePolicy instance.
     * @param {HttpRequest} req - Incoming client request.
     * @param {HttpResponse} res - Received server response.
     * @param {Object} [options={}] - Configuration options.
     * @param {boolean} [options.shared=true] - Is the cache shared (a public proxy)? `false` for personal browser caches.
     * @param {number} [options.cacheHeuristic=0.1] - Fallback heuristic (age fraction) for cache duration.
     * @param {number} [options.immutableMinTimeToLive=86400000] - Minimum TTL for immutable responses in milliseconds.
     * @param {boolean} [options.ignoreCargoCult=false] - Detect nonsense cache headers, and override them.
     * @param {any} [options._fromObject] - Internal parameter for deserialization. Do not use.
     */
    constructor(
        req,
        res,
        {
            shared,
            cacheHeuristic,
            immutableMinTimeToLive,
            ignoreCargoCult,
            _fromObject,
        } = {}
    ) {
        if (_fromObject) {
            this._fromObject(_fromObject);
            return;
        }

        if (!res || !res.headers) {
            throw Error('Response headers missing');
        }
        this._assertRequestHasHeaders(req);

        /** @type {number} Timestamp when the response was received */
        this._responseTime = this.now();
        /** @type {boolean} Indicates if the cache is shared */
        this._isShared = shared !== false;
        /** @type {boolean} Indicates if legacy cargo cult directives should be ignored */
        this._ignoreCargoCult = !!ignoreCargoCult;
        /** @type {number} Heuristic cache fraction */
        this._cacheHeuristic =
            undefined !== cacheHeuristic ? cacheHeuristic : 0.1; // 10% matches IE
        /** @type {number} Minimum TTL for immutable responses in ms */
        this._immutableMinTtl =
            undefined !== immutableMinTimeToLive
                ? immutableMinTimeToLive
                : 24 * 3600 * 1000;

        /** @type {number} HTTP status code */
        this._status = 'status' in res ? res.status : 200;
        /** @type {Record<string, string>} Response headers */
        this._resHeaders = res.headers;
        /** @type {Record<string, string|boolean>} Parsed Cache-Control directives from response */
        this._rescc = parseCacheControl(res.headers['cache-control']);
        /** @type {string} HTTP method (e.g., GET, POST) */
        this._method = 'method' in req ? req.method : 'GET';
        /** @type {string} Request URL */
        this._url = req.url;
        /** @type {string} Host header from the request */
        this._host = req.headers.host;
        /** @type {boolean} Whether the request does not include an Authorization header */
        this._noAuthorization = !req.headers.authorization;
        /** @type {Record<string, string>|null} Request headers used for Vary matching */
        this._reqHeaders = res.headers.vary ? req.headers : null; // Don't keep all request headers if they won't be used
        /** @type {Record<string, string|boolean>} Parsed Cache-Control directives from request */
        this._reqcc = parseCacheControl(req.headers['cache-control']);

        // Assume that if someone uses legacy, non-standard uncecessary options they don't understand caching,
        // so there's no point stricly adhering to the blindly copy&pasted directives.
        if (
            this._ignoreCargoCult &&
            'pre-check' in this._rescc &&
            'post-check' in this._rescc
        ) {
            delete this._rescc['pre-check'];
            delete this._rescc['post-check'];
            delete this._rescc['no-cache'];
            delete this._rescc['no-store'];
            delete this._rescc['must-revalidate'];
            this._resHeaders = Object.assign({}, this._resHeaders, {
                'cache-control': formatCacheControl(this._rescc),
            });
            delete this._resHeaders.expires;
            delete this._resHeaders.pragma;
        }

        // When the Cache-Control header field is not present in a request, caches MUST consider the no-cache request pragma-directive
        // as having the same effect as if "Cache-Control: no-cache" were present (see Section 5.2.1).
        if (
            res.headers['cache-control'] == null &&
            /no-cache/.test(res.headers.pragma)
        ) {
            this._rescc['no-cache'] = true;
        }
    }

    /**
     * You can monkey-patch it for testing.
     * @returns {number} Current time in milliseconds.
     */
    now() {
        return Date.now();
    }

    /**
     * Determines if the response is storable in a cache.
     * @returns {boolean} `false` if can never be cached.
     */
    storable() {
        // The "no-store" request directive indicates that a cache MUST NOT store any part of either this request or any response to it.
        return !!(
            !this._reqcc['no-store'] &&
            // A cache MUST NOT store a response to any request, unless:
            // The request method is understood by the cache and defined as being cacheable, and
            ('GET' === this._method ||
                'HEAD' === this._method ||
                ('POST' === this._method && this._hasExplicitExpiration())) &&
            // the response status code is understood by the cache, and
            understoodStatuses.has(this._status) &&
            // the "no-store" cache directive does not appear in request or response header fields, and
            !this._rescc['no-store'] &&
            // the "private" response directive does not appear in the response, if the cache is shared, and
            (!this._isShared || !this._rescc.private) &&
            // the Authorization header field does not appear in the request, if the cache is shared,
            (!this._isShared ||
                this._noAuthorization ||
                this._allowsStoringAuthenticated()) &&
            // the response either:
            // contains an Expires header field, or
            (this._resHeaders.expires ||
                // contains a max-age response directive, or
                // contains a s-maxage response directive and the cache is shared, or
                // contains a public response directive.
                this._rescc['max-age'] ||
                (this._isShared && this._rescc['s-maxage']) ||
                this._rescc.public ||
                // has a status code that is defined as cacheable by default
                statusCodeCacheableByDefault.has(this._status))
        );
    }

    /**
     * @returns {boolean} true if expiration is explicitly defined.
     */
    _hasExplicitExpiration() {
        // 4.2.1 Calculating Freshness Lifetime
        return !!(
            (this._isShared && this._rescc['s-maxage']) ||
            this._rescc['max-age'] ||
            this._resHeaders.expires
        );
    }

    /**
     * @param {HttpRequest} req - a request
     * @throws {Error} if the headers are missing.
     */
    _assertRequestHasHeaders(req) {
        if (!req || !req.headers) {
            throw Error('Request headers missing');
        }
    }

    /**
     * Checks if the request matches the cache and can be satisfied from the cache immediately,
     * without having to make a request to the server.
     *
     * This doesn't support `stale-while-revalidate`. See `evaluateRequest()` for a more complete solution.
     *
     * @param {HttpRequest} req - The new incoming HTTP request.
     * @returns {boolean} `true`` if the cached response used to construct this cache policy satisfies the request without revalidation.
     */
    satisfiesWithoutRevalidation(req) {
        const result = this.evaluateRequest(req);
        return !result.revalidation;
    }

    /**
     * @param {{headers: Record<string, string>, synchronous: boolean}|undefined} revalidation - Revalidation information, if any.
     * @returns {{response: {headers: Record<string, string>}, revalidation: {headers: Record<string, string>, synchronous: boolean}|undefined}} An object with a cached response headers and revalidation info.
     */
    _evaluateRequestHitResult(revalidation) {
        return {
            response: {
                headers: this.responseHeaders(),
            },
            revalidation,
        };
    }

    /**
     * @param {HttpRequest} request - new incoming
     * @param {boolean} synchronous - whether revalidation must be synchronous (not s-w-r).
     * @returns {{headers: Record<string, string>, synchronous: boolean}} An object with revalidation headers and a synchronous flag.
     */
    _evaluateRequestRevalidation(request, synchronous) {
        return {
            synchronous,
            headers: this.revalidationHeaders(request),
        };
    }

    /**
     * @param {HttpRequest} request - new incoming
     * @returns {{response: undefined, revalidation: {headers: Record<string, string>, synchronous: boolean}}} An object indicating no cached response and revalidation details.
     */
    _evaluateRequestMissResult(request) {
        return {
            response: undefined,
            revalidation: this._evaluateRequestRevalidation(request, true),
        };
    }

    /**
     * Checks if the given request matches this cache entry, and how the cache can be used to satisfy it. Returns an object with:
     *
     * ```
     * {
     *     // If defined, you must send a request to the server.
     *     revalidation: {
     *         headers: {}, // HTTP headers to use when sending the revalidation response
     *         // If true, you MUST wait for a response from the server before using the cache
     *         // If false, this is stale-while-revalidate. The cache is stale, but you can use it while you update it asynchronously.
     *         synchronous: bool,
     *     },
     *     // If defined, you can use this cached response.
     *     response: {
     *         headers: {}, // Updated cached HTTP headers you must use when responding to the client
     *     },
     * }
     * ```
     * @param {HttpRequest} req - new incoming HTTP request
     * @returns {{response: {headers: Record<string, string>}|undefined, revalidation: {headers: Record<string, string>, synchronous: boolean}|undefined}} An object containing keys:
     *   - revalidation: { headers: Record<string, string>, synchronous: boolean } Set if you should send this to the origin server
     *   - response: { headers: Record<string, string> } Set if you can respond to the client with these cached headers
     */
    evaluateRequest(req) {
        this._assertRequestHasHeaders(req);

        // In all circumstances, a cache MUST NOT ignore the must-revalidate directive
        if (this._rescc['must-revalidate']) {
            return this._evaluateRequestMissResult(req);
        }

        if (!this._requestMatches(req, false)) {
            return this._evaluateRequestMissResult(req);
        }

        // When presented with a request, a cache MUST NOT reuse a stored response, unless:
        // the presented request does not contain the no-cache pragma (Section 5.4), nor the no-cache cache directive,
        // unless the stored response is successfully validated (Section 4.3), and
        const requestCC = parseCacheControl(req.headers['cache-control']);

        if (requestCC['no-cache'] || /no-cache/.test(req.headers.pragma)) {
            return this._evaluateRequestMissResult(req);
        }

        if (requestCC['max-age'] && this.age() > toNumberOrZero(requestCC['max-age'])) {
            return this._evaluateRequestMissResult(req);
        }

        if (requestCC['min-fresh'] && this.maxAge() - this.age() < toNumberOrZero(requestCC['min-fresh'])) {
            return this._evaluateRequestMissResult(req);
        }

        // the stored response is either:
        // fresh, or allowed to be served stale
        if (this.stale()) {
            // If a value is present, then the client is willing to accept a response that has
            // exceeded its freshness lifetime by no more than the specified number of seconds
            const allowsStaleWithoutRevalidation = 'max-stale' in requestCC &&
                (true === requestCC['max-stale'] || requestCC['max-stale'] > this.age() - this.maxAge());

            if (allowsStaleWithoutRevalidation) {
                return this._evaluateRequestHitResult(undefined);
            }

            if (this.useStaleWhileRevalidate()) {
                return this._evaluateRequestHitResult(this._evaluateRequestRevalidation(req, false));
            }

            return this._evaluateRequestMissResult(req);
        }

        return this._evaluateRequestHitResult(undefined);
    }

    /**
     * @param {HttpRequest} req - check if this is for the same cache entry
     * @param {boolean} allowHeadMethod - allow a HEAD method to match.
     * @returns {boolean} `true` if the request matches.
     */
    _requestMatches(req, allowHeadMethod) {
        // The presented effective request URI and that of the stored response match, and
        return !!(
            (!this._url || this._url === req.url) &&
            this._host === req.headers.host &&
            // the request method associated with the stored response allows it to be used for the presented request, and
            (!req.method ||
                this._method === req.method ||
                (allowHeadMethod && 'HEAD' === req.method)) &&
            // selecting header fields nominated by the stored response (if any) match those presented, and
            this._varyMatches(req)
        );
    }

    /**
     * Determines whether storing authenticated responses is allowed.
     * @returns {boolean} `true` if allowed.
     */
    _allowsStoringAuthenticated() {
        // following Cache-Control response directives (Section 5.2.2) have such an effect: must-revalidate, public, and s-maxage.
        return !!(
            this._rescc['must-revalidate'] ||
            this._rescc.public ||
            this._rescc['s-maxage']
        );
    }

    /**
     * Checks whether the Vary header in the response matches the new request.
     * @param {HttpRequest} req - incoming HTTP request
     * @returns {boolean} `true` if the vary headers match.
     */
    _varyMatches(req) {
        if (!this._resHeaders.vary) {
            return true;
        }

        // A Vary header field-value of "*" always fails to match
        if (this._resHeaders.vary === '*') {
            return false;
        }

        const fields = this._resHeaders.vary
            .trim()
            .toLowerCase()
            .split(/\s*,\s*/);
        for (const name of fields) {
            if (req.headers[name] !== this._reqHeaders[name]) return false;
        }
        return true;
    }

    /**
     * Creates a copy of the given headers without any hop-by-hop headers.
     * @param {Record<string, string>} inHeaders - old headers from the cached response
     * @returns {Record<string, string>} A new headers object without hop-by-hop headers.
     */
    _copyWithoutHopByHopHeaders(inHeaders) {
        /** @type {Record<string, string>} */
        const headers = {};
        for (const name in inHeaders) {
            if (hopByHopHeaders[name]) continue;
            headers[name] = inHeaders[name];
        }
        // 9.1.  Connection
        if (inHeaders.connection) {
            const tokens = inHeaders.connection.trim().split(/\s*,\s*/);
            for (const name of tokens) {
                delete headers[name];
            }
        }
        if (headers.warning) {
            const warnings = headers.warning.split(/,/).filter(warning => {
                return !/^\s*1[0-9][0-9]/.test(warning);
            });
            if (!warnings.length) {
                delete headers.warning;
            } else {
                headers.warning = warnings.join(',').trim();
            }
        }
        return headers;
    }

    /**
     * Returns the response headers adjusted for serving the cached response.
     * Removes hop-by-hop headers and updates the Age and Date headers.
     * @returns {Record<string, string>} The adjusted response headers.
     */
    responseHeaders() {
        const headers = this._copyWithoutHopByHopHeaders(this._resHeaders);
        const age = this.age();

        // A cache SHOULD generate 113 warning if it heuristically chose a freshness
        // lifetime greater than 24 hours and the response's age is greater than 24 hours.
        if (
            age > 3600 * 24 &&
            !this._hasExplicitExpiration() &&
            this.maxAge() > 3600 * 24
        ) {
            headers.warning =
                (headers.warning ? `${headers.warning}, ` : '') +
                '113 - "rfc7234 5.5.4"';
        }
        headers.age = `${Math.round(age)}`;
        headers.date = new Date(this.now()).toUTCString();
        return headers;
    }

    /**
     * Returns the Date header value from the response or the current time if invalid.
     * @returns {number} Timestamp (in milliseconds) representing the Date header or response time.
     */
    date() {
        const serverDate = Date.parse(this._resHeaders.date);
        if (isFinite(serverDate)) {
            return serverDate;
        }
        return this._responseTime;
    }

    /**
     * Value of the Age header, in seconds, updated for the current time.
     * May be fractional.
     * @returns {number} The age in seconds.
     */
    age() {
        let age = this._ageValue();

        const residentTime = (this.now() - this._responseTime) / 1000;
        return age + residentTime;
    }

    /**
     * @returns {number} The Age header value as a number.
     */
    _ageValue() {
        return toNumberOrZero(this._resHeaders.age);
    }

    /**
     * Possibly outdated value of applicable max-age (or heuristic equivalent) in seconds.
     * This counts since response's `Date`.
     *
     * For an up-to-date value, see `timeToLive()`.
     *
     * Returns the maximum age (freshness lifetime) of the response in seconds.
     * @returns {number} The max-age value in seconds.
     */
    maxAge() {
        if (!this.storable() || this._rescc['no-cache']) {
            return 0;
        }

        // Shared responses with cookies are cacheable according to the RFC, but IMHO it'd be unwise to do so by default
        // so this implementation requires explicit opt-in via public header
        if (
            this._isShared &&
            (this._resHeaders['set-cookie'] &&
                !this._rescc.public &&
                !this._rescc.immutable)
        ) {
            return 0;
        }

        if (this._resHeaders.vary === '*') {
            return 0;
        }

        if (this._isShared) {
            if (this._rescc['proxy-revalidate']) {
                return 0;
            }
            // if a response includes the s-maxage directive, a shared cache recipient MUST ignore the Expires field.
            if (this._rescc['s-maxage']) {
                return toNumberOrZero(this._rescc['s-maxage']);
            }
        }

        // If a response includes a Cache-Control field with the max-age directive, a recipient MUST ignore the Expires field.
        if (this._rescc['max-age']) {
            return toNumberOrZero(this._rescc['max-age']);
        }

        const defaultMinTtl = this._rescc.immutable ? this._immutableMinTtl : 0;

        const serverDate = this.date();
        if (this._resHeaders.expires) {
            const expires = Date.parse(this._resHeaders.expires);
            // A cache recipient MUST interpret invalid date formats, especially the value "0", as representing a time in the past (i.e., "already expired").
            if (Number.isNaN(expires) || expires < serverDate) {
                return 0;
            }
            return Math.max(defaultMinTtl, (expires - serverDate) / 1000);
        }

        if (this._resHeaders['last-modified']) {
            const lastModified = Date.parse(this._resHeaders['last-modified']);
            if (isFinite(lastModified) && serverDate > lastModified) {
                return Math.max(
                    defaultMinTtl,
                    ((serverDate - lastModified) / 1000) * this._cacheHeuristic
                );
            }
        }

        return defaultMinTtl;
    }

    /**
     * Remaining time this cache entry may be useful for, in *milliseconds*.
     * You can use this as an expiration time for your cache storage.
     *
     * Prefer this method over `maxAge()`, because it includes other factors like `age` and `stale-while-revalidate`.
     * @returns {number} Time-to-live in milliseconds.
     */
    timeToLive() {
        const age = this.maxAge() - this.age();
        const staleIfErrorAge = age + toNumberOrZero(this._rescc['stale-if-error']);
        const staleWhileRevalidateAge = age + toNumberOrZero(this._rescc['stale-while-revalidate']);
        return Math.round(Math.max(0, age, staleIfErrorAge, staleWhileRevalidateAge) * 1000);
    }

    /**
     * If true, this cache entry is past its expiration date.
     * Note that stale cache may be useful sometimes, see `evaluateRequest()`.
     * @returns {boolean} `false` doesn't mean it's fresh nor usable
     */
    stale() {
        return this.maxAge() <= this.age();
    }

    /**
     * @returns {boolean} `true` if `stale-if-error` condition allows use of a stale response.
     */
    _useStaleIfError() {
        return this.maxAge() + toNumberOrZero(this._rescc['stale-if-error']) > this.age();
    }

    /** See `evaluateRequest()` for a more complete solution
     * @returns {boolean} `true` if `stale-while-revalidate` is currently allowed.
     */
    useStaleWhileRevalidate() {
        const swr = toNumberOrZero(this._rescc['stale-while-revalidate']);
        return swr > 0 && this.maxAge() + swr > this.age();
    }

    /**
     * Creates a `CachePolicy` instance from a serialized object.
     * @param {Object} obj - The serialized object.
     * @returns {CachePolicy} A new CachePolicy instance.
     */
    static fromObject(obj) {
        return new this(undefined, undefined, { _fromObject: obj });
    }

    /**
     * @param {any} obj - The serialized object.
     * @throws {Error} If already initialized or if the object is invalid.
     */
    _fromObject(obj) {
        if (this._responseTime) throw Error('Reinitialized');
        if (!obj || obj.v !== 1) throw Error('Invalid serialization');

        this._responseTime = obj.t;
        this._isShared = obj.sh;
        this._cacheHeuristic = obj.ch;
        this._immutableMinTtl =
            obj.imm !== undefined ? obj.imm : 24 * 3600 * 1000;
        this._ignoreCargoCult = !!obj.icc;
        this._status = obj.st;
        this._resHeaders = obj.resh;
        this._rescc = obj.rescc;
        this._method = obj.m;
        this._url = obj.u;
        this._host = obj.h;
        this._noAuthorization = obj.a;
        this._reqHeaders = obj.reqh;
        this._reqcc = obj.reqcc;
    }

    /**
     * Serializes the `CachePolicy` instance into a JSON-serializable object.
     * @returns {Object} The serialized object.
     */
    toObject() {
        return {
            v: 1,
            t: this._responseTime,
            sh: this._isShared,
            ch: this._cacheHeuristic,
            imm: this._immutableMinTtl,
            icc: this._ignoreCargoCult,
            st: this._status,
            resh: this._resHeaders,
            rescc: this._rescc,
            m: this._method,
            u: this._url,
            h: this._host,
            a: this._noAuthorization,
            reqh: this._reqHeaders,
            reqcc: this._reqcc,
        };
    }

    /**
     * Headers for sending to the origin server to revalidate stale response.
     * Allows server to return 304 to allow reuse of the previous response.
     *
     * Hop by hop headers are always stripped.
     * Revalidation headers may be added or removed, depending on request.
     * @param {HttpRequest} incomingReq - The incoming HTTP request.
     * @returns {Record<string, string>} The headers for the revalidation request.
     */
    revalidationHeaders(incomingReq) {
        this._assertRequestHasHeaders(incomingReq);
        const headers = this._copyWithoutHopByHopHeaders(incomingReq.headers);

        // This implementation does not understand range requests
        delete headers['if-range'];

        if (!this._requestMatches(incomingReq, true) || !this.storable()) {
            // revalidation allowed via HEAD
            // not for the same resource, or wasn't allowed to be cached anyway
            delete headers['if-none-match'];
            delete headers['if-modified-since'];
            return headers;
        }

        /* MUST send that entity-tag in any cache validation request (using If-Match or If-None-Match) if an entity-tag has been provided by the origin server. */
        if (this._resHeaders.etag) {
            headers['if-none-match'] = headers['if-none-match']
                ? `${headers['if-none-match']}, ${this._resHeaders.etag}`
                : this._resHeaders.etag;
        }

        // Clients MAY issue simple (non-subrange) GET requests with either weak validators or strong validators. Clients MUST NOT use weak validators in other forms of request.
        const forbidsWeakValidators =
            headers['accept-ranges'] ||
            headers['if-match'] ||
            headers['if-unmodified-since'] ||
            (this._method && this._method != 'GET');

        /* SHOULD send the Last-Modified value in non-subrange cache validation requests (using If-Modified-Since) if only a Last-Modified value has been provided by the origin server.
        Note: This implementation does not understand partial responses (206) */
        if (forbidsWeakValidators) {
            delete headers['if-modified-since'];

            if (headers['if-none-match']) {
                const etags = headers['if-none-match']
                    .split(/,/)
                    .filter(etag => {
                        return !/^\s*W\//.test(etag);
                    });
                if (!etags.length) {
                    delete headers['if-none-match'];
                } else {
                    headers['if-none-match'] = etags.join(',').trim();
                }
            }
        } else if (
            this._resHeaders['last-modified'] &&
            !headers['if-modified-since']
        ) {
            headers['if-modified-since'] = this._resHeaders['last-modified'];
        }

        return headers;
    }

    /**
     * Creates new CachePolicy with information combined from the previews response,
     * and the new revalidation response.
     *
     * Returns {policy, modified} where modified is a boolean indicating
     * whether the response body has been modified, and old cached body can't be used.
     *
     * @param {HttpRequest} request - The latest HTTP request asking for the cached entry.
     * @param {HttpResponse} response - The latest revalidation HTTP response from the origin server.
     * @returns {{policy: CachePolicy, modified: boolean, matches: boolean}} The updated policy and modification status.
     * @throws {Error} If the response headers are missing.
     */
    revalidatedPolicy(request, response) {
        this._assertRequestHasHeaders(request);

        if (this._useStaleIfError() && isErrorResponse(response)) {
          return {
              policy: this,
              modified: false,
              matches: true,
          };
        }

        if (!response || !response.headers) {
            throw Error('Response headers missing');
        }

        // These aren't going to be supported exactly, since one CachePolicy object
        // doesn't know about all the other cached objects.
        let matches = false;
        if (response.status !== undefined && response.status != 304) {
            matches = false;
        } else if (
            response.headers.etag &&
            !/^\s*W\//.test(response.headers.etag)
        ) {
            // "All of the stored responses with the same strong validator are selected.
            // If none of the stored responses contain the same strong validator,
            // then the cache MUST NOT use the new response to update any stored responses."
            matches =
                this._resHeaders.etag &&
                this._resHeaders.etag.replace(/^\s*W\//, '') ===
                    response.headers.etag;
        } else if (this._resHeaders.etag && response.headers.etag) {
            // "If the new response contains a weak validator and that validator corresponds
            // to one of the cache's stored responses,
            // then the most recent of those matching stored responses is selected for update."
            matches =
                this._resHeaders.etag.replace(/^\s*W\//, '') ===
                response.headers.etag.replace(/^\s*W\//, '');
        } else if (this._resHeaders['last-modified']) {
            matches =
                this._resHeaders['last-modified'] ===
                response.headers['last-modified'];
        } else {
            // If the new response does not include any form of validator (such as in the case where
            // a client generates an If-Modified-Since request from a source other than the Last-Modified
            // response header field), and there is only one stored response, and that stored response also
            // lacks a validator, then that stored response is selected for update.
            if (
                !this._resHeaders.etag &&
                !this._resHeaders['last-modified'] &&
                !response.headers.etag &&
                !response.headers['last-modified']
            ) {
                matches = true;
            }
        }

        const optionsCopy = {
            shared: this._isShared,
            cacheHeuristic: this._cacheHeuristic,
            immutableMinTimeToLive: this._immutableMinTtl,
            ignoreCargoCult: this._ignoreCargoCult,
        };

        if (!matches) {
            return {
                policy: new this.constructor(request, response, optionsCopy),
                // Client receiving 304 without body, even if it's invalid/mismatched has no option
                // but to reuse a cached body. We don't have a good way to tell clients to do
                // error recovery in such case.
                modified: response.status != 304,
                matches: false,
            };
        }

        // use other header fields provided in the 304 (Not Modified) response to replace all instances
        // of the corresponding header fields in the stored response.
        const headers = {};
        for (const k in this._resHeaders) {
            headers[k] =
                k in response.headers && !excludedFromRevalidationUpdate[k]
                    ? response.headers[k]
                    : this._resHeaders[k];
        }

        const newResponse = Object.assign({}, response, {
            status: this._status,
            method: this._method,
            headers,
        });
        return {
            policy: new this.constructor(request, newResponse, optionsCopy),
            modified: false,
            matches: true,
        };
    }
};
