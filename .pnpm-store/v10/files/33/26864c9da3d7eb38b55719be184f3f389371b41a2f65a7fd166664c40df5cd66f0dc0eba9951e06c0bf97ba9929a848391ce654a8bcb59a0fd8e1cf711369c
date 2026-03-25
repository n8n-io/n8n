"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../util/errors.js");
exports.default = {
    /**
     * The order that this parser will run, in relation to other parsers.
     */
    order: 100,
    /**
     * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
     */
    allowEmpty: true,
    /**
     * Determines whether this parser can parse a given file reference.
     * Parsers that match will be tried, in order, until one successfully parses the file.
     * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
     * every parser will be tried.
     */
    canParse: ".json",
    /**
     * Allow JSON files with byte order marks (BOM)
     */
    allowBOM: true,
    /**
     * Parses the given file as JSON
     */
    async parse(file) {
        let data = file.data;
        if (Buffer.isBuffer(data)) {
            data = data.toString();
        }
        if (typeof data === "string") {
            if (data.trim().length === 0) {
                return; // This mirrors the YAML behavior
            }
            else {
                try {
                    return JSON.parse(data);
                }
                catch (e) {
                    if (this.allowBOM) {
                        try {
                            // find the first curly brace
                            const firstCurlyBrace = data.indexOf("{");
                            // remove any characters before the first curly brace
                            data = data.slice(firstCurlyBrace);
                            return JSON.parse(data);
                        }
                        catch (e) {
                            throw new errors_js_1.ParserError(e.message, file.url);
                        }
                    }
                    throw new errors_js_1.ParserError(e.message, file.url);
                }
            }
        }
        else {
            // data is already a JavaScript value (object, array, number, null, NaN, etc.)
            return data;
        }
    },
};
