"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserStream = void 0;
const node_stream_1 = require("node:stream");
const parse5_1 = require("parse5");
/* eslint-disable unicorn/consistent-function-scoping -- The rule seems to be broken here. */
/**
 * Streaming HTML parser with scripting support.
 * A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).
 *
 * @example
 *
 * ```js
 * const ParserStream = require('parse5-parser-stream');
 * const http = require('http');
 * const { finished } = require('node:stream');
 *
 * // Fetch the page content and obtain it's <head> node
 * http.get('http://inikulin.github.io/parse5/', res => {
 *     const parser = new ParserStream();
 *
 *     finished(parser, () => {
 *         console.log(parser.document.childNodes[1].childNodes[0].tagName); //> 'head'
 *     });
 *
 *     res.pipe(parser);
 * });
 * ```
 *
 */
class ParserStream extends node_stream_1.Writable {
    static getFragmentStream(fragmentContext, options) {
        const parser = parse5_1.Parser.getFragmentParser(fragmentContext, options);
        const stream = new ParserStream(options, parser);
        return stream;
    }
    /** The resulting document node. */
    get document() {
        return this.parser.document;
    }
    getFragment() {
        return this.parser.getFragment();
    }
    /**
     * @param options Parsing options.
     */
    constructor(options, parser = new parse5_1.Parser(options)) {
        super({ decodeStrings: false });
        this.parser = parser;
        this.lastChunkWritten = false;
        this.writeCallback = undefined;
        this.pendingHtmlInsertions = [];
        const resume = () => {
            for (let i = this.pendingHtmlInsertions.length - 1; i >= 0; i--) {
                this.parser.tokenizer.insertHtmlAtCurrentPos(this.pendingHtmlInsertions[i]);
            }
            this.pendingHtmlInsertions.length = 0;
            //NOTE: keep parsing if we don't wait for the next input chunk
            this.parser.tokenizer.resume(this.writeCallback);
        };
        const documentWrite = (html) => {
            if (!this.parser.stopped) {
                this.pendingHtmlInsertions.push(html);
            }
        };
        const scriptHandler = (scriptElement) => {
            if (this.listenerCount('script') > 0) {
                this.parser.tokenizer.pause();
                this.emit('script', scriptElement, documentWrite, resume);
            }
        };
        this.parser.scriptHandler = scriptHandler;
    }
    //WritableStream implementation
    _write(chunk, _encoding, callback) {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }
        this.writeCallback = callback;
        this.parser.tokenizer.write(chunk, this.lastChunkWritten, this.writeCallback);
    }
    // TODO [engine:node@>=16]: Due to issues with Node < 16, we are overriding `end` instead of `_final`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    end(chunk, encoding, callback) {
        this.lastChunkWritten = true;
        super.end(chunk || '', encoding, callback);
    }
}
exports.ParserStream = ParserStream;
//# sourceMappingURL=index.js.map