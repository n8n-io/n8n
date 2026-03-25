"use strict";
/**
 * @file Batteries-included version of Cheerio. This module includes several
 *   convenience methods for loading documents from various sources.
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merge = exports.contains = void 0;
exports.loadBuffer = loadBuffer;
exports.stringStream = stringStream;
exports.decodeStream = decodeStream;
exports.fromURL = fromURL;
__exportStar(require("./load-parse.js"), exports);
var static_js_1 = require("./static.js");
Object.defineProperty(exports, "contains", { enumerable: true, get: function () { return static_js_1.contains; } });
Object.defineProperty(exports, "merge", { enumerable: true, get: function () { return static_js_1.merge; } });
const parse5_htmlparser2_tree_adapter_1 = require("parse5-htmlparser2-tree-adapter");
const htmlparser2 = __importStar(require("htmlparser2"));
const parse5_parser_stream_1 = require("parse5-parser-stream");
const encoding_sniffer_1 = require("encoding-sniffer");
const undici = __importStar(require("undici"));
const whatwg_mimetype_1 = __importDefault(require("whatwg-mimetype"));
const node_stream_1 = require("node:stream");
const options_js_1 = require("./options.js");
const load_parse_js_1 = require("./load-parse.js");
/**
 * Sniffs the encoding of a buffer, then creates a querying function bound to a
 * document created from the buffer.
 *
 * @category Loading
 * @example
 *
 * ```js
 * import * as cheerio from 'cheerio';
 *
 * const buffer = fs.readFileSync('index.html');
 * const $ = cheerio.fromBuffer(buffer);
 * ```
 *
 * @param buffer - The buffer to sniff the encoding of.
 * @param options - The options to pass to Cheerio.
 * @returns The loaded document.
 */
function loadBuffer(buffer, options = {}) {
    const opts = (0, options_js_1.flattenOptions)(options);
    const str = (0, encoding_sniffer_1.decodeBuffer)(buffer, {
        defaultEncoding: (opts === null || opts === void 0 ? void 0 : opts.xmlMode) ? 'utf8' : 'windows-1252',
        ...options.encoding,
    });
    return (0, load_parse_js_1.load)(str, opts);
}
function _stringStream(options, cb) {
    var _a;
    if (options === null || options === void 0 ? void 0 : options._useHtmlParser2) {
        const parser = htmlparser2.createDocumentStream((err, document) => cb(err, (0, load_parse_js_1.load)(document)), options);
        return new node_stream_1.Writable({
            decodeStrings: false,
            write(chunk, _encoding, callback) {
                if (typeof chunk !== 'string') {
                    throw new TypeError('Expected a string');
                }
                parser.write(chunk);
                callback();
            },
            final(callback) {
                parser.end();
                callback();
            },
        });
    }
    options !== null && options !== void 0 ? options : (options = {});
    (_a = options.treeAdapter) !== null && _a !== void 0 ? _a : (options.treeAdapter = parse5_htmlparser2_tree_adapter_1.adapter);
    if (options.scriptingEnabled !== false) {
        options.scriptingEnabled = true;
    }
    const stream = new parse5_parser_stream_1.ParserStream(options);
    (0, node_stream_1.finished)(stream, (err) => cb(err, (0, load_parse_js_1.load)(stream.document)));
    return stream;
}
/**
 * Creates a stream that parses a sequence of strings into a document.
 *
 * The stream is a `Writable` stream that accepts strings. When the stream is
 * finished, the callback is called with the loaded document.
 *
 * @category Loading
 * @example
 *
 * ```js
 * import * as cheerio from 'cheerio';
 * import * as fs from 'fs';
 *
 * const writeStream = cheerio.stringStream({}, (err, $) => {
 *   if (err) {
 *     // Handle error
 *   }
 *
 *   console.log($('h1').text());
 *   // Output: Hello, world!
 * });
 *
 * fs.createReadStream('my-document.html', { encoding: 'utf8' }).pipe(
 *   writeStream,
 * );
 * ```
 *
 * @param options - The options to pass to Cheerio.
 * @param cb - The callback to call when the stream is finished.
 * @returns The writable stream.
 */
function stringStream(options, cb) {
    return _stringStream((0, options_js_1.flattenOptions)(options), cb);
}
/**
 * Parses a stream of buffers into a document.
 *
 * The stream is a `Writable` stream that accepts buffers. When the stream is
 * finished, the callback is called with the loaded document.
 *
 * @category Loading
 * @param options - The options to pass to Cheerio.
 * @param cb - The callback to call when the stream is finished.
 * @returns The writable stream.
 */
function decodeStream(options, cb) {
    var _a;
    const { encoding = {}, ...cheerioOptions } = options;
    const opts = (0, options_js_1.flattenOptions)(cheerioOptions);
    // Set the default encoding to UTF-8 for XML mode
    (_a = encoding.defaultEncoding) !== null && _a !== void 0 ? _a : (encoding.defaultEncoding = (opts === null || opts === void 0 ? void 0 : opts.xmlMode) ? 'utf8' : 'windows-1252');
    const decodeStream = new encoding_sniffer_1.DecodeStream(encoding);
    const loadStream = _stringStream(opts, cb);
    decodeStream.pipe(loadStream);
    return decodeStream;
}
const defaultRequestOptions = {
    method: 'GET',
    // Allow redirects by default
    maxRedirections: 5,
    // NOTE: `throwOnError` currently doesn't work https://github.com/nodejs/undici/issues/1753
    throwOnError: true,
    // Set an Accept header
    headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
};
/**
 * `fromURL` loads a document from a URL.
 *
 * By default, redirects are allowed and non-2xx responses are rejected.
 *
 * @category Loading
 * @example
 *
 * ```js
 * import * as cheerio from 'cheerio';
 *
 * const $ = await cheerio.fromURL('https://example.com');
 * ```
 *
 * @param url - The URL to load the document from.
 * @param options - The options to pass to Cheerio.
 * @returns The loaded document.
 */
async function fromURL(url, options = {}) {
    var _a;
    const { requestOptions = defaultRequestOptions, encoding = {}, ...cheerioOptions } = options;
    let undiciStream;
    // Add headers if none were supplied.
    (_a = requestOptions.headers) !== null && _a !== void 0 ? _a : (requestOptions.headers = defaultRequestOptions.headers);
    const promise = new Promise((resolve, reject) => {
        undiciStream = undici.stream(url, requestOptions, (res) => {
            var _a, _b;
            const contentType = (_a = res.headers['content-type']) !== null && _a !== void 0 ? _a : 'text/html';
            const mimeType = new whatwg_mimetype_1.default(Array.isArray(contentType) ? contentType[0] : contentType);
            if (!mimeType.isHTML() && !mimeType.isXML()) {
                throw new RangeError(`The content-type "${contentType}" is neither HTML nor XML.`);
            }
            // Forward the charset from the header to the decodeStream.
            encoding.transportLayerEncodingLabel = mimeType.parameters.get('charset');
            /*
             * If we allow redirects, we will have entries in the history.
             * The last entry will be the final URL.
             */
            const history = (_b = res.context) === null || _b === void 0 ? void 0 : _b.history;
            const opts = {
                encoding,
                // Set XML mode based on the MIME type.
                xmlMode: mimeType.isXML(),
                // Set the `baseURL` to the final URL.
                baseURL: history ? history[history.length - 1] : url,
                ...cheerioOptions,
            };
            return decodeStream(opts, (err, $) => (err ? reject(err) : resolve($)));
        });
    });
    // Let's make sure the request is completed before returning the promise.
    await undiciStream;
    return promise;
}
//# sourceMappingURL=index.js.map