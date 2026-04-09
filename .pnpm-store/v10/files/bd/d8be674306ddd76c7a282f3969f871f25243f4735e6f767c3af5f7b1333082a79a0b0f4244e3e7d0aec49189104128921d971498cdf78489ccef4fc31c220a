import { ResponseError } from "./errors.js";
import type * as proto from "./shared/proto.js";
import type { Value, IntMode } from "./value.js";
/** Result of executing a database statement. */
export interface StmtResult {
    /** Number of rows that were changed by the statement. This is meaningful only if the statement was an
     * INSERT, UPDATE or DELETE, and the value is otherwise undefined. */
    affectedRowCount: number;
    /** The ROWID of the last successful insert into a rowid table. This is a 64-big signed integer. For other
     * statements than INSERTs into a rowid table, the value is not specified. */
    lastInsertRowid: bigint | undefined;
    /** Names of columns in the result. */
    columnNames: Array<string | undefined>;
    /** Declared types of columns in the result. */
    columnDecltypes: Array<string | undefined>;
}
/** An array of rows returned by a database statement. */
export interface RowsResult extends StmtResult {
    /** The returned rows. */
    rows: Array<Row>;
}
/** A single row returned by a database statement. */
export interface RowResult extends StmtResult {
    /** The returned row. If the query produced zero rows, this is `undefined`. */
    row: Row | undefined;
}
/** A single value returned by a database statement. */
export interface ValueResult extends StmtResult {
    /** The returned value. If the query produced zero rows or zero columns, this is `undefined`. */
    value: Value | undefined;
}
/** Row returned from the database. This is an Array-like object (it has `length` and can be indexed with a
 * number), and in addition, it has enumerable properties from the named columns. */
export interface Row {
    length: number;
    [index: number]: Value;
    [name: string]: Value;
}
export declare function stmtResultFromProto(result: proto.StmtResult): StmtResult;
export declare function rowsResultFromProto(result: proto.StmtResult, intMode: IntMode): RowsResult;
export declare function rowResultFromProto(result: proto.StmtResult, intMode: IntMode): RowResult;
export declare function valueResultFromProto(result: proto.StmtResult, intMode: IntMode): ValueResult;
export declare function errorFromProto(error: proto.Error): ResponseError;
