import type { ParserOptions } from "./options.js";

import $Ref from "./ref.js";
import * as url from "./util/url.js";
import { JSONParserError, InvalidPointerError, MissingPointerError, isHandledError } from "./util/errors.js";
import type { JSONSchema } from "./types";

export const nullSymbol = Symbol("null");

const slashes = /\//g;
const tildes = /~/g;
const escapedSlash = /~1/g;
const escapedTilde = /~0/g;

const safeDecodeURIComponent = (encodedURIComponent: string): string => {
  try {
    return decodeURIComponent(encodedURIComponent);
  } catch {
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
class Pointer<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
  /**
   * The {@link $Ref} object that contains this {@link Pointer} object.
   */
  $ref: $Ref<S, O>;

  /**
   * The file path or URL, containing the JSON pointer in the hash.
   * This path is relative to the path of the main JSON schema file.
   */
  path: string;

  /**
   * The original path or URL, used for error messages.
   */
  originalPath: string;

  /**
   * The value of the JSON pointer.
   * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
   */

  value: any;
  /**
   * Indicates whether the pointer references itself.
   */
  circular: boolean;
  /**
   * The number of indirect references that were traversed to resolve the value.
   * Resolving a single pointer may require resolving multiple $Refs.
   */
  indirections: number;

  constructor($ref: $Ref<S, O>, path: string, friendlyPath?: string) {
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
  resolve(obj: S, options?: O, pathFromRoot?: string) {
    const tokens = Pointer.parse(this.path, this.originalPath);
    const found: any = [];

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
          this.value = nullSymbol;
          continue;
        }

        this.value = null;

        const path = this.$ref.path || "";

        const targetRef = this.path.replace(path, "");
        const targetFound = Pointer.join("", found);
        const parentPath = pathFromRoot?.replace(path, "");

        throw new MissingPointerError(token, decodeURI(this.originalPath), targetRef, targetFound, parentPath);
      } else {
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
  set(obj: S, value: any, options?: O) {
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
      } else {
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
  static parse(path: string, originalPath?: string): string[] {
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
      throw new InvalidPointerError(pointer, originalPath === undefined ? path : originalPath);
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
  static join(base: string, tokens: string | string[]) {
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
function resolveIf$Ref(pointer: any, options: any, pathFromRoot?: any) {
  // Is the value a JSON reference? (and allowed?)

  if ($Ref.isAllowed$Ref(pointer.value, options)) {
    const $refPath = url.resolve(pointer.path, pointer.value.$ref);

    if ($refPath === pointer.path && !isRootPath(pathFromRoot)) {
      // The value is a reference to itself, so there's nothing to do.
      pointer.circular = true;
    } else {
      const resolved = pointer.$ref.$refs._resolve($refPath, pointer.path, options);
      if (resolved === null) {
        return false;
      }

      pointer.indirections += resolved.indirections + 1;

      if ($Ref.isExtended$Ref(pointer.value)) {
        // This JSON reference "extends" the resolved value, rather than simply pointing to it.
        // So the resolved path does NOT change.  Just the value does.
        pointer.value = $Ref.dereference(pointer.value, resolved.value);
        return false;
      } else {
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
export default Pointer;

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
function setValue(pointer: any, token: any, value: any) {
  if (pointer.value && typeof pointer.value === "object") {
    if (token === "-" && Array.isArray(pointer.value)) {
      pointer.value.push(value);
    } else {
      pointer.value[token] = value;
    }
  } else {
    throw new JSONParserError(
      `Error assigning $ref pointer "${pointer.path}". \nCannot set "${token}" of a non-object.`,
    );
  }
  return value;
}

function unwrapOrThrow(value: any) {
  if (isHandledError(value)) {
    throw value;
  }

  return value;
}

function isRootPath(pathFromRoot: any): boolean {
  return typeof pathFromRoot == "string" && Pointer.parse(pathFromRoot).length == 0;
}
