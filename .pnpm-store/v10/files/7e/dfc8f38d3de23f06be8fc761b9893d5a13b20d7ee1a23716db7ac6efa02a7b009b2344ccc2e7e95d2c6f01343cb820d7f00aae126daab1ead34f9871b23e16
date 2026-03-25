"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../util/errors.js");
const TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;
exports.default = {
    /**
     * The order that this parser will run, in relation to other parsers.
     */
    order: 300,
    /**
     * Whether to allow "empty" files (zero bytes).
     */
    allowEmpty: true,
    /**
     * The encoding that the text is expected to be in.
     */
    encoding: "utf8",
    /**
     * Determines whether this parser can parse a given file reference.
     * Parsers that return true will be tried, in order, until one successfully parses the file.
     * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
     * every parser will be tried.
     */
    canParse(file) {
        // Use this parser if the file is a string or Buffer, and has a known text-based extension
        return (typeof file.data === "string" || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
    },
    /**
     * Parses the given file as text
     */
    parse(file) {
        if (typeof file.data === "string") {
            return file.data;
        }
        else if (Buffer.isBuffer(file.data)) {
            return file.data.toString(this.encoding);
        }
        else {
            throw new errors_js_1.ParserError("data is not text", file.url);
        }
    },
};
