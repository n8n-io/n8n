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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJsonSchemaRefParserDefaultOptions = exports.jsonSchemaParserNormalizeArgs = exports.dereferenceInternal = exports.JSONParserErrorGroup = exports.isHandledError = exports.UnmatchedParserError = exports.ParserError = exports.ResolverError = exports.MissingPointerError = exports.InvalidPointerError = exports.JSONParserError = exports.UnmatchedResolverError = exports.dereference = exports.bundle = exports.resolve = exports.parse = exports.$RefParser = void 0;
const refs_js_1 = __importDefault(require("./refs.js"));
const parse_js_1 = __importDefault(require("./parse.js"));
const normalize_args_js_1 = __importDefault(require("./normalize-args.js"));
exports.jsonSchemaParserNormalizeArgs = normalize_args_js_1.default;
const resolve_external_js_1 = __importDefault(require("./resolve-external.js"));
const bundle_js_1 = __importDefault(require("./bundle.js"));
const dereference_js_1 = __importDefault(require("./dereference.js"));
exports.dereferenceInternal = dereference_js_1.default;
const url = __importStar(require("./util/url.js"));
const errors_js_1 = require("./util/errors.js");
Object.defineProperty(exports, "JSONParserError", { enumerable: true, get: function () { return errors_js_1.JSONParserError; } });
Object.defineProperty(exports, "InvalidPointerError", { enumerable: true, get: function () { return errors_js_1.InvalidPointerError; } });
Object.defineProperty(exports, "MissingPointerError", { enumerable: true, get: function () { return errors_js_1.MissingPointerError; } });
Object.defineProperty(exports, "ResolverError", { enumerable: true, get: function () { return errors_js_1.ResolverError; } });
Object.defineProperty(exports, "ParserError", { enumerable: true, get: function () { return errors_js_1.ParserError; } });
Object.defineProperty(exports, "UnmatchedParserError", { enumerable: true, get: function () { return errors_js_1.UnmatchedParserError; } });
Object.defineProperty(exports, "UnmatchedResolverError", { enumerable: true, get: function () { return errors_js_1.UnmatchedResolverError; } });
Object.defineProperty(exports, "isHandledError", { enumerable: true, get: function () { return errors_js_1.isHandledError; } });
Object.defineProperty(exports, "JSONParserErrorGroup", { enumerable: true, get: function () { return errors_js_1.JSONParserErrorGroup; } });
const ono_1 = require("@jsdevtools/ono");
const maybe_js_1 = __importDefault(require("./util/maybe.js"));
const options_js_1 = require("./options.js");
Object.defineProperty(exports, "getJsonSchemaRefParserDefaultOptions", { enumerable: true, get: function () { return options_js_1.getJsonSchemaRefParserDefaultOptions; } });
/**
 * This class parses a JSON schema, builds a map of its JSON references and their resolved values,
 * and provides methods for traversing, manipulating, and dereferencing those references.
 *
 * @class
 */
class $RefParser {
    constructor() {
        /**
         * The parsed (and possibly dereferenced) JSON schema object
         *
         * @type {object}
         * @readonly
         */
        this.schema = null;
        /**
         * The resolved JSON references
         *
         * @type {$Refs}
         * @readonly
         */
        this.$refs = new refs_js_1.default();
    }
    async parse() {
        const args = (0, normalize_args_js_1.default)(arguments);
        let promise;
        if (!args.path && !args.schema) {
            const err = (0, ono_1.ono)(`Expected a file path, URL, or object. Got ${args.path || args.schema}`);
            return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
        // Reset everything
        this.schema = null;
        this.$refs = new refs_js_1.default();
        // If the path is a filesystem path, then convert it to a URL.
        // NOTE: According to the JSON Reference spec, these should already be URLs,
        // but, in practice, many people use local filesystem paths instead.
        // So we're being generous here and doing the conversion automatically.
        // This is not intended to be a 100% bulletproof solution.
        // If it doesn't work for your use-case, then use a URL instead.
        let pathType = "http";
        if (url.isFileSystemPath(args.path)) {
            args.path = url.fromFileSystemPath(args.path);
            pathType = "file";
        }
        else if (!args.path && args.schema && "$id" in args.schema && args.schema.$id) {
            // when schema id has defined an URL should use that hostname to request the references,
            // instead of using the current page URL
            const params = url.parse(args.schema.$id);
            const port = params.protocol === "https:" ? 443 : 80;
            args.path = `${params.protocol}//${params.hostname}:${port}`;
        }
        // Resolve the absolute path of the schema
        args.path = url.resolve(url.cwd(), args.path);
        if (args.schema && typeof args.schema === "object") {
            // A schema object was passed-in.
            // So immediately add a new $Ref with the schema object as its value
            const $ref = this.$refs._add(args.path);
            $ref.value = args.schema;
            $ref.pathType = pathType;
            promise = Promise.resolve(args.schema);
        }
        else {
            // Parse the schema file/url
            promise = (0, parse_js_1.default)(args.path, this.$refs, args.options);
        }
        try {
            const result = await promise;
            if (result !== null && typeof result === "object" && !Buffer.isBuffer(result)) {
                this.schema = result;
                return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
            }
            else if (args.options.continueOnError) {
                this.schema = null; // it's already set to null at line 79, but let's set it again for the sake of readability
                return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
            }
            else {
                throw ono_1.ono.syntax(`"${this.$refs._root$Ref.path || result}" is not a valid JSON Schema`);
            }
        }
        catch (err) {
            if (!args.options.continueOnError || !(0, errors_js_1.isHandledError)(err)) {
                return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
            }
            if (this.$refs._$refs[url.stripHash(args.path)]) {
                this.$refs._$refs[url.stripHash(args.path)].addError(err);
            }
            return (0, maybe_js_1.default)(args.callback, Promise.resolve(null));
        }
    }
    static parse() {
        const parser = new $RefParser();
        return parser.parse.apply(parser, arguments);
    }
    async resolve() {
        const args = (0, normalize_args_js_1.default)(arguments);
        try {
            await this.parse(args.path, args.schema, args.options);
            await (0, resolve_external_js_1.default)(this, args.options);
            finalize(this);
            return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.$refs));
        }
        catch (err) {
            return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
    }
    static resolve() {
        const instance = new $RefParser();
        return instance.resolve.apply(instance, arguments);
    }
    static bundle() {
        const instance = new $RefParser();
        return instance.bundle.apply(instance, arguments);
    }
    async bundle() {
        const args = (0, normalize_args_js_1.default)(arguments);
        try {
            await this.resolve(args.path, args.schema, args.options);
            (0, bundle_js_1.default)(this, args.options);
            finalize(this);
            return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
        }
        catch (err) {
            return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
    }
    static dereference() {
        const instance = new $RefParser();
        return instance.dereference.apply(instance, arguments);
    }
    async dereference() {
        const args = (0, normalize_args_js_1.default)(arguments);
        try {
            await this.resolve(args.path, args.schema, args.options);
            (0, dereference_js_1.default)(this, args.options);
            finalize(this);
            return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
        }
        catch (err) {
            return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
    }
}
exports.$RefParser = $RefParser;
exports.default = $RefParser;
function finalize(parser) {
    const errors = errors_js_1.JSONParserErrorGroup.getParserErrors(parser);
    if (errors.length > 0) {
        throw new errors_js_1.JSONParserErrorGroup(parser);
    }
}
exports.parse = $RefParser.parse;
exports.resolve = $RefParser.resolve;
exports.bundle = $RefParser.bundle;
exports.dereference = $RefParser.dereference;
