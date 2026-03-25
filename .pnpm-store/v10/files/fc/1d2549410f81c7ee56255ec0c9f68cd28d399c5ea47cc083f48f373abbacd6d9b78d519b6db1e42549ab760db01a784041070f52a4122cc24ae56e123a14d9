"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidPointerError = exports.TimeoutError = exports.MissingPointerError = exports.UnmatchedResolverError = exports.ResolverError = exports.UnmatchedParserError = exports.ParserError = exports.JSONParserErrorGroup = exports.JSONParserError = void 0;
exports.isHandledError = isHandledError;
exports.normalizeError = normalizeError;
const ono_1 = require("@jsdevtools/ono");
const url_js_1 = require("./url.js");
class JSONParserError extends Error {
    constructor(message, source) {
        super();
        this.code = "EUNKNOWN";
        this.name = "JSONParserError";
        this.message = message;
        this.source = source;
        this.path = null;
        ono_1.Ono.extend(this);
    }
    get footprint() {
        return `${this.path}+${this.source}+${this.code}+${this.message}`;
    }
}
exports.JSONParserError = JSONParserError;
class JSONParserErrorGroup extends Error {
    constructor(parser) {
        super();
        this.files = parser;
        this.name = "JSONParserErrorGroup";
        this.message = `${this.errors.length} error${this.errors.length > 1 ? "s" : ""} occurred while reading '${(0, url_js_1.toFileSystemPath)(parser.$refs._root$Ref.path)}'`;
        ono_1.Ono.extend(this);
    }
    static getParserErrors(parser) {
        const errors = [];
        for (const $ref of Object.values(parser.$refs._$refs)) {
            if ($ref.errors) {
                errors.push(...$ref.errors);
            }
        }
        return errors;
    }
    get errors() {
        return JSONParserErrorGroup.getParserErrors(this.files);
    }
}
exports.JSONParserErrorGroup = JSONParserErrorGroup;
class ParserError extends JSONParserError {
    constructor(message, source) {
        super(`Error parsing ${source}: ${message}`, source);
        this.code = "EPARSER";
        this.name = "ParserError";
    }
}
exports.ParserError = ParserError;
class UnmatchedParserError extends JSONParserError {
    constructor(source) {
        super(`Could not find parser for "${source}"`, source);
        this.code = "EUNMATCHEDPARSER";
        this.name = "UnmatchedParserError";
    }
}
exports.UnmatchedParserError = UnmatchedParserError;
class ResolverError extends JSONParserError {
    constructor(ex, source) {
        super(ex.message || `Error reading file "${source}"`, source);
        this.code = "ERESOLVER";
        this.name = "ResolverError";
        if ("code" in ex) {
            this.ioErrorCode = String(ex.code);
        }
    }
}
exports.ResolverError = ResolverError;
class UnmatchedResolverError extends JSONParserError {
    constructor(source) {
        super(`Could not find resolver for "${source}"`, source);
        this.code = "EUNMATCHEDRESOLVER";
        this.name = "UnmatchedResolverError";
    }
}
exports.UnmatchedResolverError = UnmatchedResolverError;
class MissingPointerError extends JSONParserError {
    constructor(token, path, targetRef, targetFound, parentPath) {
        super(`Missing $ref pointer "${(0, url_js_1.getHash)(path)}". Token "${token}" does not exist.`, (0, url_js_1.stripHash)(path));
        this.code = "EMISSINGPOINTER";
        this.name = "MissingPointerError";
        this.targetToken = token;
        this.targetRef = targetRef;
        this.targetFound = targetFound;
        this.parentPath = parentPath;
    }
}
exports.MissingPointerError = MissingPointerError;
class TimeoutError extends JSONParserError {
    constructor(timeout) {
        super(`Dereferencing timeout reached: ${timeout}ms`);
        this.code = "ETIMEOUT";
        this.name = "TimeoutError";
    }
}
exports.TimeoutError = TimeoutError;
class InvalidPointerError extends JSONParserError {
    constructor(pointer, path) {
        super(`Invalid $ref pointer "${pointer}". Pointers must begin with "#/"`, (0, url_js_1.stripHash)(path));
        this.code = "EUNMATCHEDRESOLVER";
        this.name = "InvalidPointerError";
    }
}
exports.InvalidPointerError = InvalidPointerError;
function isHandledError(err) {
    return err instanceof JSONParserError || err instanceof JSONParserErrorGroup;
}
function normalizeError(err) {
    if (err.path === null) {
        err.path = [];
    }
    return err;
}
