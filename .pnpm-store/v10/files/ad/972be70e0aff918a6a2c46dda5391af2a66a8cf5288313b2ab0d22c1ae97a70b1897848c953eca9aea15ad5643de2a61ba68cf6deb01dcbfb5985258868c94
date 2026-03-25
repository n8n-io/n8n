"use strict";
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ono_1 = require("@jsdevtools/ono");
const url = __importStar(require("./util/url.js"));
const plugins = __importStar(require("./util/plugins.js"));
const errors_js_1 = require("./util/errors.js");
/**
 * Reads and parses the specified file path or URL.
 */
async function parse(path, $refs, options) {
    // Remove the URL fragment, if any
    const hashIndex = path.indexOf("#");
    let hash = "";
    if (hashIndex >= 0) {
        hash = path.substring(hashIndex);
        // Remove the URL fragment, if any
        path = path.substring(0, hashIndex);
    }
    // Add a new $Ref for this file, even though we don't have the value yet.
    // This ensures that we don't simultaneously read & parse the same file multiple times
    const $ref = $refs._add(path);
    // This "file object" will be passed to all resolvers and parsers.
    const file = {
        url: path,
        hash,
        extension: url.getExtension(path),
    };
    // Read the file and then parse the data
    try {
        const resolver = await readFile(file, options, $refs);
        $ref.pathType = resolver.plugin.name;
        file.data = resolver.result;
        const parser = await parseFile(file, options, $refs);
        $ref.value = parser.result;
        return parser.result;
    }
    catch (err) {
        if ((0, errors_js_1.isHandledError)(err)) {
            $ref.value = err;
        }
        throw err;
    }
}
/**
 * Reads the given file, using the configured resolver plugins
 *
 * @param file           - An object containing information about the referenced file
 * @param file.url       - The full URL of the referenced file
 * @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param options
 * @param $refs
 * @returns
 * The promise resolves with the raw file contents and the resolver that was used.
 */
async function readFile(file, options, $refs) {
    // console.log('Reading %s', file.url);
    // Find the resolvers that can read this file
    let resolvers = plugins.all(options.resolve);
    resolvers = plugins.filter(resolvers, "canRead", file);
    // Run the resolvers, in order, until one of them succeeds
    plugins.sort(resolvers);
    try {
        const data = await plugins.run(resolvers, "read", file, $refs);
        return data;
    }
    catch (err) {
        if (!err && options.continueOnError) {
            // No resolver could be matched
            throw new errors_js_1.UnmatchedResolverError(file.url);
        }
        else if (!err || !("error" in err)) {
            // Throw a generic, friendly error.
            throw ono_1.ono.syntax(`Unable to resolve $ref pointer "${file.url}"`);
        }
        // Throw the original error, if it's one of our own (user-friendly) errors.
        else if (err.error instanceof errors_js_1.ResolverError) {
            throw err.error;
        }
        else {
            throw new errors_js_1.ResolverError(err, file.url);
        }
    }
}
/**
 * Parses the given file's contents, using the configured parser plugins.
 *
 * @param file           - An object containing information about the referenced file
 * @param file.url       - The full URL of the referenced file
 * @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @param options
 * @param $refs
 *
 * @returns
 * The promise resolves with the parsed file contents and the parser that was used.
 */
async function parseFile(file, options, $refs) {
    // Find the parsers that can read this file type.
    // If none of the parsers are an exact match for this file, then we'll try ALL of them.
    // This handles situations where the file IS a supported type, just with an unknown extension.
    const allParsers = plugins.all(options.parse);
    const filteredParsers = plugins.filter(allParsers, "canParse", file);
    const parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;
    // Run the parsers, in order, until one of them succeeds
    plugins.sort(parsers);
    try {
        const parser = await plugins.run(parsers, "parse", file, $refs);
        if (!parser.plugin.allowEmpty && isEmpty(parser.result)) {
            throw ono_1.ono.syntax(`Error parsing "${file.url}" as ${parser.plugin.name}. \nParsed value is empty`);
        }
        else {
            return parser;
        }
    }
    catch (err) {
        if (!err && options.continueOnError) {
            // No resolver could be matched
            throw new errors_js_1.UnmatchedParserError(file.url);
        }
        else if (err && err.message && err.message.startsWith("Error parsing")) {
            throw err;
        }
        else if (!err || !("error" in err)) {
            throw ono_1.ono.syntax(`Unable to parse ${file.url}`);
        }
        else if (err.error instanceof errors_js_1.ParserError) {
            throw err.error;
        }
        else {
            throw new errors_js_1.ParserError(err.error.message, file.url);
        }
    }
}
/**
 * Determines whether the parsed value is "empty".
 *
 * @param value
 * @returns
 */
function isEmpty(value) {
    return (value === undefined ||
        (typeof value === "object" && Object.keys(value).length === 0) ||
        (typeof value === "string" && value.trim().length === 0) ||
        (Buffer.isBuffer(value) && value.length === 0));
}
exports.default = parse;
