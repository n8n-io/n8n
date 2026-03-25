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
const pointer_js_1 = __importStar(require("./pointer.js"));
const errors_js_1 = require("./util/errors.js");
const url_js_1 = require("./util/url.js");
/**
 * This class represents a single JSON reference and its resolved value.
 *
 * @class
 */
class $Ref {
    constructor($refs) {
        /**
         * List of all errors. Undefined if no errors.
         */
        this.errors = [];
        this.$refs = $refs;
    }
    /**
     * Pushes an error to errors array.
     *
     * @param err - The error to be pushed
     * @returns
     */
    addError(err) {
        if (this.errors === undefined) {
            this.errors = [];
        }
        const existingErrors = this.errors.map(({ footprint }) => footprint);
        // the path has been almost certainly set at this point,
        // but just in case something went wrong, normalizeError injects path if necessary
        // moreover, certain errors might point at the same spot, so filter them out to reduce noise
        if ("errors" in err && Array.isArray(err.errors)) {
            this.errors.push(...err.errors.map(errors_js_1.normalizeError).filter(({ footprint }) => !existingErrors.includes(footprint)));
        }
        else if (!("footprint" in err) || !existingErrors.includes(err.footprint)) {
            this.errors.push((0, errors_js_1.normalizeError)(err));
        }
    }
    /**
     * Determines whether the given JSON reference exists within this {@link $Ref#value}.
     *
     * @param path - The full path being resolved, optionally with a JSON pointer in the hash
     * @param options
     * @returns
     */
    exists(path, options) {
        try {
            this.resolve(path, options);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Resolves the given JSON reference within this {@link $Ref#value} and returns the resolved value.
     *
     * @param path - The full path being resolved, optionally with a JSON pointer in the hash
     * @param options
     * @returns - Returns the resolved value
     */
    get(path, options) {
        return this.resolve(path, options)?.value;
    }
    /**
     * Resolves the given JSON reference within this {@link $Ref#value}.
     *
     * @param path - The full path being resolved, optionally with a JSON pointer in the hash
     * @param options
     * @param friendlyPath - The original user-specified path (used for error messages)
     * @param pathFromRoot - The path of `obj` from the schema root
     * @returns
     */
    resolve(path, options, friendlyPath, pathFromRoot) {
        const pointer = new pointer_js_1.default(this, path, friendlyPath);
        try {
            const resolved = pointer.resolve(this.value, options, pathFromRoot);
            if (resolved.value === pointer_js_1.nullSymbol) {
                resolved.value = null;
            }
            return resolved;
        }
        catch (err) {
            if (!options || !options.continueOnError || !(0, errors_js_1.isHandledError)(err)) {
                throw err;
            }
            if (err.path === null) {
                err.path = (0, url_js_1.safePointerToPath)((0, url_js_1.getHash)(pathFromRoot));
            }
            if (err instanceof errors_js_1.InvalidPointerError) {
                err.source = decodeURI((0, url_js_1.stripHash)(pathFromRoot));
            }
            this.addError(err);
            return null;
        }
    }
    /**
     * Sets the value of a nested property within this {@link $Ref#value}.
     * If the property, or any of its parents don't exist, they will be created.
     *
     * @param path - The full path of the property to set, optionally with a JSON pointer in the hash
     * @param value - The value to assign
     */
    set(path, value) {
        const pointer = new pointer_js_1.default(this, path);
        this.value = pointer.set(this.value, value);
        if (this.value === pointer_js_1.nullSymbol) {
            this.value = null;
        }
    }
    /**
     * Determines whether the given value is a JSON reference.
     *
     * @param value - The value to inspect
     * @returns
     */
    static is$Ref(value) {
        return (Boolean(value) &&
            typeof value === "object" &&
            value !== null &&
            "$ref" in value &&
            typeof value.$ref === "string" &&
            value.$ref.length > 0);
    }
    /**
     * Determines whether the given value is an external JSON reference.
     *
     * @param value - The value to inspect
     * @returns
     */
    static isExternal$Ref(value) {
        return $Ref.is$Ref(value) && value.$ref[0] !== "#";
    }
    /**
     * Determines whether the given value is a JSON reference, and whether it is allowed by the options.
     * For example, if it references an external file, then options.resolve.external must be true.
     *
     * @param value - The value to inspect
     * @param options
     * @returns
     */
    static isAllowed$Ref(value, options) {
        if (this.is$Ref(value)) {
            if (value.$ref.substring(0, 2) === "#/" || value.$ref === "#") {
                // It's a JSON Pointer reference, which is always allowed
                return true;
            }
            else if (value.$ref[0] !== "#" && (!options || options.resolve?.external)) {
                // It's an external reference, which is allowed by the options
                return true;
            }
        }
        return undefined;
    }
    /**
     * Determines whether the given value is a JSON reference that "extends" its resolved value.
     * That is, it has extra properties (in addition to "$ref"), so rather than simply pointing to
     * an existing value, this $ref actually creates a NEW value that is a shallow copy of the resolved
     * value, plus the extra properties.
     *
     * @example: {
       person: {
         properties: {
           firstName: { type: string }
           lastName: { type: string }
         }
       }
       employee: {
         properties: {
           $ref: #/person/properties
           salary: { type: number }
         }
       }
     }
     *  In this example, "employee" is an extended $ref, since it extends "person" with an additional
     *  property (salary).  The result is a NEW value that looks like this:
     *
     *  {
     *    properties: {
     *      firstName: { type: string }
     *      lastName: { type: string }
     *      salary: { type: number }
     *    }
     *  }
     *
     * @param value - The value to inspect
     * @returns
     */
    static isExtended$Ref(value) {
        return $Ref.is$Ref(value) && Object.keys(value).length > 1;
    }
    /**
     * Returns the resolved value of a JSON Reference.
     * If necessary, the resolved value is merged with the JSON Reference to create a new object
     *
     * @example: {
    person: {
      properties: {
        firstName: { type: string }
        lastName: { type: string }
      }
    }
    employee: {
      properties: {
        $ref: #/person/properties
        salary: { type: number }
      }
    }
    } When "person" and "employee" are merged, you end up with the following object:
     *
     *  {
     *    properties: {
     *      firstName: { type: string }
     *      lastName: { type: string }
     *      salary: { type: number }
     *    }
     *  }
     *
     * @param $ref - The JSON reference object (the one with the "$ref" property)
     * @param resolvedValue - The resolved value, which can be any type
     * @returns - Returns the dereferenced value
     */
    static dereference($ref, resolvedValue) {
        if (resolvedValue && typeof resolvedValue === "object" && $Ref.isExtended$Ref($ref)) {
            const merged = {};
            for (const key of Object.keys($ref)) {
                if (key !== "$ref") {
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    merged[key] = $ref[key];
                }
            }
            for (const key of Object.keys(resolvedValue)) {
                if (!(key in merged)) {
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    merged[key] = resolvedValue[key];
                }
            }
            return merged;
        }
        else {
            // Completely replace the original reference with the resolved value
            return resolvedValue;
        }
    }
}
exports.default = $Ref;
