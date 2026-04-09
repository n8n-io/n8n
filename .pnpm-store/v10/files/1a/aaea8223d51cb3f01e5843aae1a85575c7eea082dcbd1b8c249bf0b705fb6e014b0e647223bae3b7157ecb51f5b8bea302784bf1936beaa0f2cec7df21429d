"use strict";
/* istanbul ignore file */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withHar = void 0;
// Forked from:
// https://github.com/exogen/node-fetch-har
// Changes made:
// - Allow to pass body as FormData
// - removed nanoid and replaced with crypto.randomUUID
// - migrated to be used with undici
const url_1 = require("url");
const undici_1 = require("undici");
const crypto = __importStar(require("node:crypto"));
const add_headers_1 = require("./helpers/add-headers");
const get_duration_1 = require("./helpers/get-duration");
const build_request_cookies_1 = require("./helpers/build-request-cookies");
const build_headers_1 = require("./helpers/build-headers");
const build_response_cookies_1 = require("./helpers/build-response-cookies");
const HAR_HEADER_NAME = 'x-har-request-id';
const harEntryMap = new Map();
const withHar = function (baseFetch, defaults = {}) {
    exports.withHar.harEntryMap = harEntryMap;
    return async function fetch(input, options = {}) {
        const { har = defaults.har, harPageRef = defaults.harPageRef, onHarEntry = defaults.onHarEntry, } = options;
        if (har === false) {
            return baseFetch(input, options);
        }
        const requestId = crypto.randomUUID();
        const startTime = process.hrtime();
        const url = new url_1.URL(typeof input === 'string' ? input : input.url);
        const entry = {
            _compressed: false,
            _resourceType: 'fetch',
            _timestamps: {
                start: startTime,
                socket: startTime,
                lookup: startTime,
                connect: startTime,
                secureConnect: startTime,
                sent: startTime,
                firstByte: startTime,
                received: startTime,
            },
            timings: {
                blocked: -1,
                dns: -1,
                connect: -1,
                send: 0,
                wait: 0,
                receive: 0,
                ssl: -1,
            },
            time: 0,
            startedDateTime: new Date().toISOString(),
            cache: {
                beforeRequest: null,
                afterRequest: null,
            },
            request: {
                method: options.method || 'GET',
                url: url.href,
                cookies: (0, build_request_cookies_1.buildRequestCookies)(options.headers || {}),
                headers: (0, build_headers_1.buildHeaders)(options.headers || {}),
                queryString: [...url.searchParams].map(([name, value]) => ({
                    name,
                    value,
                })),
                headersSize: -1,
                bodySize: -1,
                postData: {},
                httpVersion: 'HTTP/1.1',
            },
            response: {},
            pageref: '',
        };
        // Replace the Dispatcher initialization with Client
        const client = options.dispatcher || new undici_1.Client(url.origin);
        // Listen to Undici dispatcher events
        client.on('connect', () => (entry._timestamps.connect = process.hrtime()));
        // Pass the dispatcher in options
        options = Object.assign({}, options, {
            headers: (0, add_headers_1.addHeaders)(options.headers, { [HAR_HEADER_NAME]: requestId }),
            dispatcher: client, // Use client as dispatcher
        });
        harEntryMap.set(requestId, entry);
        // Update sent time just before the request
        entry._timestamps.sent = process.hrtime();
        // Make the request
        const response = await baseFetch(input, options);
        // Need to clone response to get both text and arrayBuffer
        const responseClone = response.clone();
        // Update firstByte time when we get the response
        entry._timestamps.firstByte = process.hrtime();
        // Get the response body and update received time
        const text = await response.text();
        entry._timestamps.received = process.hrtime();
        const harEntry = harEntryMap.get(requestId);
        harEntryMap.delete(requestId);
        if (!harEntry) {
            return response;
        }
        // Add response info
        if (!harEntry.response) {
            harEntry.response = {};
        }
        // Calculate total bytes of headers including the double CRLF before body
        const headerLines = [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`);
        const statusLine = `HTTP/1.1 ${response.status} ${response.statusText}`;
        const headerBytes = Buffer.byteLength(statusLine + '\r\n' + headerLines.join('\r\n') + '\r\n\r\n');
        harEntry._compressed = /^(gzip|compress|deflate|br)$/.test(response.headers.get('content-encoding') || '');
        if (!harEntry.response.content) {
            harEntry.response.content = {
                size: -1,
            };
        }
        if (harEntry._compressed) {
            const rawBody = await responseClone.arrayBuffer();
            harEntry.response.content.size = rawBody.byteLength;
        }
        else {
            harEntry.response.content.size = text ? Buffer.byteLength(text) : -1;
        }
        const bodySize = text ? Buffer.byteLength(text) : -1;
        harEntry.response = {
            headers: (0, build_headers_1.buildHeaders)(response.headers),
            cookies: (0, build_response_cookies_1.buildResponseCookies)(response.headers),
            status: response.status,
            statusText: response.statusText || '',
            httpVersion: response.httpVersion ? `HTTP/${response.httpVersion}` : 'HTTP/1.1',
            redirectURL: response.headers.location || '',
            content: {
                size: harEntry._compressed && harEntry.response.content.size !== -1
                    ? harEntry.response.content.size
                    : Buffer.byteLength(text),
                mimeType: response.headers.get('content-type') || '',
                text,
                compression: harEntry._compressed && harEntry.response.content.size !== -1
                    ? harEntry.response.content.size - bodySize
                    : 0,
            },
            bodySize,
            headersSize: headerBytes,
        };
        // Calculate timings
        const { _timestamps: time } = harEntry;
        harEntry.timings = {
            blocked: Math.max((0, get_duration_1.getDuration)(time.start, time.socket), 0.01),
            dns: -1,
            connect: Math.max((0, get_duration_1.getDuration)(time.lookup, time.connect), -1),
            ssl: time.secureConnect ? Math.max((0, get_duration_1.getDuration)(time.connect, time.secureConnect), -1) : -1,
            send: (0, get_duration_1.getDuration)(time.secureConnect || time.connect, time.sent),
            wait: Math.max((0, get_duration_1.getDuration)(time.sent, time.firstByte), 0),
            receive: (0, get_duration_1.getDuration)(time.firstByte, time.received),
        };
        // Calculate total time
        harEntry.time = (0, get_duration_1.getDuration)(time.start, time.received);
        const parents = [];
        let child = harEntry;
        do {
            const parent = child._parent;
            delete child._parent;
            if (parent) {
                parents.unshift(parent);
            }
            child = parent;
        } while (child);
        // Allow grouping by pages.
        entry.pageref = harPageRef || 'page_1';
        parents.forEach((parent) => {
            parent.pageref = entry.pageref;
        });
        const Response = defaults.Response || baseFetch.Response || global.Response || response.constructor;
        const responseCopy = new Response(text, {
            status: response.statusCode,
            statusText: response.statusText || '',
            headers: response.headers,
            url: response.url,
        });
        responseCopy.harEntry = entry;
        if (har && typeof har === 'object') {
            har.log.entries.push(...parents, entry);
        }
        if (onHarEntry) {
            parents.forEach((parent) => {
                onHarEntry(parent);
            });
            onHarEntry(entry);
        }
        return responseCopy;
    };
};
exports.withHar = withHar;
//# sourceMappingURL=with-har.js.map