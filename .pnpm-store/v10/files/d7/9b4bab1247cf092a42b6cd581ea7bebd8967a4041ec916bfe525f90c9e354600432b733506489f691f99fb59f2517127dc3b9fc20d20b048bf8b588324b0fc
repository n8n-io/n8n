/// <reference types="node" />
import * as util from "util";
import { OnoError } from "./types";
/**
 * Ono supports Node's `util.format()` formatting for error messages.
 *
 * @see https://nodejs.org/api/util.html#util_util_format_format_args
 */
export declare const format: typeof util.format;
/**
 * Adds an `inspect()` method to support Node's `util.inspect()` function.
 *
 * @see https://nodejs.org/api/util.html#util_util_inspect_custom
 */
export declare function addInspectMethod<T>(newError: OnoError<T>): void;
