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
exports.nullSymbol = void 0;
const ref_js_1 = __importDefault(require("./ref.js"));
const url = __importStar(require("./util/url.js"));
const errors_js_1 = require("./util/errors.js");
exports.nullSymbol = Symbol("null");
const slashes = /\//g;
const tildes = /~/g;
const escapedSlash = /~1/g;
const escapedTilde = /~0/g;
const safeDecodeURIComponent = (encodedURIComponent) => {
    try {
        return decodeURIComponent(encodedURIComponent);
    }
    catch {
        return encodedURIComponent;
    }
};
/**
 * This class represents a single JSON pointer and its resolved value.
 *
 * @param $ref
 * @param path
 * @param [friendlyPath] - The original user-specified path (used for error messages)
 * @class
 */
class Pointer {
    constructor($ref, path, friendlyPath) {
        this.$ref = $ref;
        this.path = path;
        this.originalPath = friendlyPath || path;
        this.value = undefined;
        this.circular = false;
        this.indirections = 0;
    }
    /**
     * Resolves the value of a nested property within the given object.
     *
     * @param obj - The object that will be crawled
     * @param options
     * @param pathFromRoot - the path of place that initiated resolving
     *
     * @returns
     * Returns a JSON pointer whose {@link Pointer#value} is the resolved value.
     * If resolving this value required resolving other JSON references, then
     * the {@link Pointer#$ref} and {@link Pointer#path} will reflect the resolution path
     * of the resolved value.
     */
    resolve(obj, options, pathFromRoot) {
        const tokens = Pointer.parse(this.path, this.originalPath);
        const found = [];
        // Crawl the object, one token at a time
        this.value = unwrapOrThrow(obj);
        for (let i = 0; i < tokens.length; i++) {
            if (resolveIf$Ref(this, options, pathFromRoot)) {
                // The $ref path has changed, so append the remaining tokens to the path
                this.path = Pointer.join(this.path, tokens.slice(i));
            }
            const token = tokens[i];
            if (this.value[token] === undefined || (this.value[token] === null && i === tokens.length - 1)) {
                // one final case is if the entry itself includes slashes, and was parsed out as a token - we can join the remaining tokens and try again
                let didFindSubstringSlashMatch = false;
                for (let j = tokens.length - 1; j > i; j--) {
                    const joinedToken = tokens.slice(i, j + 1).join("/");
                    if (this.value[joinedToken] !== undefined) {
                        this.value = this.value[joinedToken];
                        i = j;
                        didFindSubstringSlashMatch = true;
                        break;
                    }
                }
                if (didFindSubstringSlashMatch) {
                    continue;
                }
                // If the token we're looking for ended up not containing any slashes but is
                // actually instead pointing to an existing `null` value then we should use that
                // `null` value.
                if (token in this.value && this.value[token] === null) {
                    // We use a `null` symbol for internal tracking to differntiate between a general `null`
                    // value and our expected `null` value.
                    this.value = exports.nullSymbol;
                    continue;
                }
                this.value = null;
                const path = this.$ref.path || "";
                const targetRef = this.path.replace(path, "");
                const targetFound = Pointer.join("", found);
                const parentPath = pathFromRoot?.replace(path, "");
                throw new errors_js_1.MissingPointerError(token, decodeURI(this.originalPath), targetRef, targetFound, parentPath);
            }
            else {
                this.value = this.value[token];
            }
            found.push(token);
        }
        // Resolve the final value
        if (!this.value || (this.value.$ref && url.resolve(this.path, this.value.$ref) !== pathFromRoot)) {
            resolveIf$Ref(this, options, pathFromRoot);
        }
        return this;
    }
    /**
     * Sets the value of a nested property within the given object.
     *
     * @param obj - The object that will be crawled
     * @param value - the value to assign
     * @param options
     *
     * @returns
     * Returns the modified object, or an entirely new object if the entire object is overwritten.
     */
    set(obj, value, options) {
        const tokens = Pointer.parse(this.path);
        let token;
        if (tokens.length === 0) {
            // There are no tokens, replace the entire object with the new value
            this.value = value;
            return value;
        }
        // Crawl the object, one token at a time
        this.value = unwrapOrThrow(obj);
        for (let i = 0; i < tokens.length - 1; i++) {
            resolveIf$Ref(this, options);
            token = tokens[i];
            if (this.value && this.value[token] !== undefined) {
                // The token exists
                this.value = this.value[token];
            }
            else {
                // The token doesn't exist, so create it
                this.value = setValue(this, token, {});
            }
        }
        // Set the value of the final token
        resolveIf$Ref(this, options);
        token = tokens[tokens.length - 1];
        setValue(this, token, value);
        // Return the updated object
        return obj;
    }
    /**
     * Parses a JSON pointer (or a path containing a JSON pointer in the hash)
     * and returns an array of the pointer's tokens.
     * (e.g. "schema.json#/definitions/person/name" => ["definitions", "person", "name"])
     *
     * The pointer is parsed according to RFC 6901
     * {@link https://tools.ietf.org/html/rfc6901#section-3}
     *
     * @param path
     * @param [originalPath]
     * @returns
     */
    static parse(path, originalPath) {
        // Get the JSON pointer from the path's hash
        const pointer = url.getHash(path).substring(1);
        // If there's no pointer, then there are no tokens,
        // so return an empty array
        if (!pointer) {
            return [];
        }
        // Split into an array
        const split = pointer.split("/");
        // Decode each part, according to RFC 6901
        for (let i = 0; i < split.length; i++) {
            split[i] = safeDecodeURIComponent(split[i].replace(escapedSlash, "/").replace(escapedTilde, "~"));
        }
        if (split[0] !== "") {
            throw new errors_js_1.InvalidPointerError(pointer, originalPath === undefined ? path : originalPath);
        }
        return split.slice(1);
    }
    /**
     * Creates a JSON pointer path, by joining one or more tokens to a base path.
     *
     * @param base - The base path (e.g. "schema.json#/definitions/person")
     * @param tokens - The token(s) to append (e.g. ["name", "first"])
     * @returns
     */
    static join(base, tokens) {
        // Ensure that the base path contains a hash
        if (base.indexOf("#") === -1) {
            base += "#";
        }
        // Append each token to the base path
        tokens = Array.isArray(tokens) ? tokens : [tokens];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // Encode the token, according to RFC 6901
            base += "/" + encodeURIComponent(token.replace(tildes, "~0").replace(slashes, "~1"));
        }
        return base;
    }
}
/**
 * If the given pointer's {@link Pointer#value} is a JSON reference,
 * then the reference is resolved and {@link Pointer#value} is replaced with the resolved value.
 * In addition, {@link Pointer#path} and {@link Pointer#$ref} are updated to reflect the
 * resolution path of the new value.
 *
 * @param pointer
 * @param options
 * @param [pathFromRoot] - the path of place that initiated resolving
 * @returns - Returns `true` if the resolution path changed
 */
function resolveIf$Ref(pointer, options, pathFromRoot) {
    // Is the value a JSON reference? (and allowed?)
    if (ref_js_1.default.isAllowed$Ref(pointer.value, options)) {
        const $refPath = url.resolve(pointer.path, pointer.value.$ref);
        if ($refPath === pointer.path && !isRootPath(pathFromRoot)) {
            // The value is a reference to itself, so there's nothing to do.
            pointer.circular = true;
        }
        else {
            const resolved = pointer.$ref.$refs._resolve($refPath, pointer.path, options);
            if (resolved === null) {
                return false;
            }
            pointer.indirections += resolved.indirections + 1;
            if (ref_js_1.default.isExtended$Ref(pointer.value)) {
                // This JSON reference "extends" the resolved value, rather than simply pointing to it.
                // So the resolved path does NOT change.  Just the value does.
                pointer.value = ref_js_1.default.dereference(pointer.value, resolved.value);
                return false;
            }
            else {
                // Resolve the reference
                pointer.$ref = resolved.$ref;
                pointer.path = resolved.path;
                pointer.value = resolved.value;
            }
            return true;
        }
    }
    return undefined;
}
exports.default = Pointer;
/**
 * Sets the specified token value of the {@link Pointer#value}.
 *
 * The token is evaluated according to RFC 6901.
 * {@link https://tools.ietf.org/html/rfc6901#section-4}
 *
 * @param pointer - The JSON Pointer whose value will be modified
 * @param token - A JSON Pointer token that indicates how to modify `obj`
 * @param value - The value to assign
 * @returns - Returns the assigned value
 */
function setValue(pointer, token, value) {
    if (pointer.value && typeof pointer.value === "object") {
        if (token === "-" && Array.isArray(pointer.value)) {
            pointer.value.push(value);
        }
        else {
            pointer.value[token] = value;
        }
    }
    else {
        throw new errors_js_1.JSONParserError(`Error assigning $ref pointer "${pointer.path}". \nCannot set "${token}" of a non-object.`);
    }
    return value;
}
function unwrapOrThrow(value) {
    if ((0, errors_js_1.isHandledError)(value)) {
        throw value;
    }
    return value;
}
function isRootPath(pathFromRoot) {
    return typeof pathFromRoot == "string" && Pointer.parse(pathFromRoot).length == 0;
}
