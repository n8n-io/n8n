import Pointer from "./pointer.js";
import type { JSONParserError, MissingPointerError, ParserError, ResolverError } from "./util/errors.js";
import type $Refs from "./refs.js";
import type { ParserOptions } from "./options.js";
import type { JSONSchema } from "./types";
export type $RefError = JSONParserError | ResolverError | ParserError | MissingPointerError;
/**
 * This class represents a single JSON reference and its resolved value.
 *
 * @class
 */
declare class $Ref<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
    /**
     * The file path or URL of the referenced file.
     * This path is relative to the path of the main JSON schema file.
     *
     * This path does NOT contain document fragments (JSON pointers). It always references an ENTIRE file.
     * Use methods such as {@link $Ref#get}, {@link $Ref#resolve}, and {@link $Ref#exists} to get
     * specific JSON pointers within the file.
     *
     * @type {string}
     */
    path: undefined | string;
    /**
     * The resolved value of the JSON reference.
     * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
     *
     * @type {?*}
     */
    value: any;
    /**
     * The {@link $Refs} object that contains this {@link $Ref} object.
     *
     * @type {$Refs}
     */
    $refs: $Refs<S, O>;
    /**
     * Indicates the type of {@link $Ref#path} (e.g. "file", "http", etc.)
     */
    pathType: string | unknown;
    /**
     * List of all errors. Undefined if no errors.
     */
    errors: Array<$RefError>;
    constructor($refs: $Refs<S, O>);
    /**
     * Pushes an error to errors array.
     *
     * @param err - The error to be pushed
     * @returns
     */
    addError(err: $RefError): void;
    /**
     * Determines whether the given JSON reference exists within this {@link $Ref#value}.
     *
     * @param path - The full path being resolved, optionally with a JSON pointer in the hash
     * @param options
     * @returns
     */
    exists(path: string, options?: O): boolean;
    /**
     * Resolves the given JSON reference within this {@link $Ref#value} and returns the resolved value.
     *
     * @param path - The full path being resolved, optionally with a JSON pointer in the hash
     * @param options
     * @returns - Returns the resolved value
     */
    get(path: string, options?: O): any;
    /**
     * Resolves the given JSON reference within this {@link $Ref#value}.
     *
     * @param path - The full path being resolved, optionally with a JSON pointer in the hash
     * @param options
     * @param friendlyPath - The original user-specified path (used for error messages)
     * @param pathFromRoot - The path of `obj` from the schema root
     * @returns
     */
    resolve(path: string, options?: O, friendlyPath?: string, pathFromRoot?: string): Pointer<S, O> | null;
    /**
     * Sets the value of a nested property within this {@link $Ref#value}.
     * If the property, or any of its parents don't exist, they will be created.
     *
     * @param path - The full path of the property to set, optionally with a JSON pointer in the hash
     * @param value - The value to assign
     */
    set(path: string, value: any): void;
    /**
     * Determines whether the given value is a JSON reference.
     *
     * @param value - The value to inspect
     * @returns
     */
    static is$Ref(value: unknown): value is {
        $ref: string;
        length?: number;
    };
    /**
     * Determines whether the given value is an external JSON reference.
     *
     * @param value - The value to inspect
     * @returns
     */
    static isExternal$Ref(value: unknown): boolean;
    /**
     * Determines whether the given value is a JSON reference, and whether it is allowed by the options.
     * For example, if it references an external file, then options.resolve.external must be true.
     *
     * @param value - The value to inspect
     * @param options
     * @returns
     */
    static isAllowed$Ref<S extends object = JSONSchema>(value: unknown, options?: ParserOptions<S>): true | undefined;
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
    static isExtended$Ref(value: unknown): boolean;
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
    static dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>($ref: $Ref<S, O>, resolvedValue: S): S;
}
export default $Ref;
