/**
 * k6 JavaScript API.
 * https://grafana.com/docs/k6/latest/
 *
 * @privateRemarks
 * Uses a branding pattern throughout to reflect the custom classes exposed by
 * the k6 runtime. These classes have internal state not visible in JavaScript.
 * The object passed back to k6 must be an actual instance created on the
 * golang side. Duck typed objects are not safe.
 *
 * Each class includes a protected property __brand: never. The brand breaks
 * duck typing for noninstances with an identical public shape.
 *
 * This follows the pattern used in the TypeScript compiler:
 * https://github.com/Microsoft/TypeScript/blob/7b48a182c05ea4dea81bab73ecbbe9e013a79e99/src/compiler/types.ts#L693-L698
 *
 * @packageDocumentation
 */

import "./global"; // Type global environment

// Expose everything to autoimport
import "./browser";
import "./crypto";
import "./data";
import "./encoding";
import "./execution";
import "./html";
import "./http";
import "./metrics";
import "./options";
import "./experimental/browser";
import "./experimental/fs";
import "./experimental/redis";
import "./experimental/timers";
import "./experimental/tracing";
import "./experimental/webcrypto";
import "./experimental/websockets";
import "./timers";
import "./ws";
import "./net/grpc";

// === Main ===
// ------------

/**
 * Run checks on a value.
 * https://grafana.com/docs/k6/latest/javascript-api/k6/check/
 * @template VT - Value type.
 * @param val - Value to test.
 * @param sets - Tests (checks) to run on the value.
 * @param tags - Extra tags to attach to metrics emitted.
 * @returns `true` if all checks have succeeded, otherwise `false`.
 * @example
 * check(res, {
 *  "response code was 200": (res) => res.status == 200,
 *  "body size was 1234 bytes": (res) => res.body.length == 1234,
 * });
 */
export function check<VT>(val: VT, sets: Checkers<VT>, tags?: object): boolean;

/**
 * Immediately throw an error, aborting the current script iteration.
 * https://grafana.com/docs/k6/latest/javascript-api/k6/fail/
 * @param err - Error message that gets printed to stderr.
 * @example
 * fail("abort current iteration");
 */
export function fail(err?: string): never;

/**
 * Run code inside a group.
 * https://grafana.com/docs/k6/latest/javascript-api/k6/group/
 * @template RT - Return type.
 * @param name - Name of the group.
 * @param fn - Group body. Code to be executed in the group context.
 * @returns The return value of `fn`.
 * @example
 * group("group name", function() {
 *  ..
 * });
 */
export function group<RT>(name: string, fn: () => RT): RT;

/**
 * Set seed to get a reproducible pseudo-random number using Math.random.
 * https://grafana.com/docs/k6/latest/javascript-api/k6/randomseed/
 * @param int - The seed value.
 * @example
 * randomSeed(123456789);
 */
export function randomSeed(int: number): void;

/**
 * Suspend VU execution for the specified duration.
 * https://grafana.com/docs/k6/latest/javascript-api/k6/sleep/
 * @param t - Duration, in seconds.
 * @example
 * sleep(3);
 */
export function sleep(t: number): void;

/**
 * Check procedure.
 * @template VT - Value type.
 */
export interface Checker<VT> {
    /**
     * Check procedure.
     * @param val - Value to check.
     * @returns Whether check passed.
     */
    (val: VT): boolean;
}

/**
 * Named check procedures.
 * @template VT - Value type.
 */
export interface Checkers<VT> {
    [description: string]: Checker<VT>;
}

// === Common types ===
// --------------------

/**
 * Array of numbers. The number range is from 0 to 255.
 */
export type bytes = number[];

// === JSON ===
// ------------

/**
 * JavaScript value representable with JSON.
 */
export type JSONValue = null | boolean | number | string | JSONArray | JSONObject;

/**
 * Array representable with JSON.
 */
export interface JSONArray extends Array<JSONValue> {}

/**
 * Object representable with JSON.
 */
export interface JSONObject {
    [key: string]: JSONValue;
}
