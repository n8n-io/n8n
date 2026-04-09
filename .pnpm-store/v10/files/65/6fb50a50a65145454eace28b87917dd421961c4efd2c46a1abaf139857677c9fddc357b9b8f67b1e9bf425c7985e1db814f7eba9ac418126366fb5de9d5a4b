import type * as proto from "./shared/proto.js";
/** JavaScript values that you can receive from the database in a statement result. */
export type Value = null | string | number | bigint | ArrayBuffer;
/** JavaScript values that you can send to the database as an argument. */
export type InValue = Value | boolean | Uint8Array | Date | RegExp | object;
/** Possible representations of SQLite integers in JavaScript:
 *
 * - `"number"` (default): returns SQLite integers as JavaScript `number`-s (double precision floats).
 * `number` cannot precisely represent integers larger than 2^53-1 in absolute value, so attempting to read
 * larger integers will throw a `RangeError`.
 * - `"bigint"`: returns SQLite integers as JavaScript `bigint`-s (arbitrary precision integers). Bigints can
 * precisely represent all SQLite integers.
 * - `"string"`: returns SQLite integers as strings.
 */
export type IntMode = "number" | "bigint" | "string";
export declare function valueToProto(value: InValue): proto.Value;
export declare function valueFromProto(value: proto.Value, intMode: IntMode): Value;
