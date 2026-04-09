"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stream = void 0;
const batch_js_1 = require("./batch.js");
const describe_js_1 = require("./describe.js");
const result_js_1 = require("./result.js");
const sql_js_1 = require("./sql.js");
const stmt_js_1 = require("./stmt.js");
/** A stream for executing SQL statements (a "database connection"). */
class Stream {
    /** @private */
    constructor(intMode) {
        this.intMode = intMode;
    }
    /** Execute a statement and return rows. */
    query(stmt) {
        return this.#execute(stmt, true, result_js_1.rowsResultFromProto);
    }
    /** Execute a statement and return at most a single row. */
    queryRow(stmt) {
        return this.#execute(stmt, true, result_js_1.rowResultFromProto);
    }
    /** Execute a statement and return at most a single value. */
    queryValue(stmt) {
        return this.#execute(stmt, true, result_js_1.valueResultFromProto);
    }
    /** Execute a statement without returning rows. */
    run(stmt) {
        return this.#execute(stmt, false, result_js_1.stmtResultFromProto);
    }
    #execute(inStmt, wantRows, fromProto) {
        const stmt = (0, stmt_js_1.stmtToProto)(this._sqlOwner(), inStmt, wantRows);
        return this._execute(stmt).then((r) => fromProto(r, this.intMode));
    }
    /** Return a builder for creating and executing a batch.
     *
     * If `useCursor` is true, the batch will be executed using a Hrana cursor, which will stream results from
     * the server to the client, which consumes less memory on the server. This requires protocol version 3 or
     * higher.
     */
    batch(useCursor = false) {
        return new batch_js_1.Batch(this, useCursor);
    }
    /** Parse and analyze a statement. This requires protocol version 2 or higher. */
    describe(inSql) {
        const protoSql = (0, sql_js_1.sqlToProto)(this._sqlOwner(), inSql);
        return this._describe(protoSql).then(describe_js_1.describeResultFromProto);
    }
    /** Execute a sequence of statements separated by semicolons. This requires protocol version 2 or higher.
     * */
    sequence(inSql) {
        const protoSql = (0, sql_js_1.sqlToProto)(this._sqlOwner(), inSql);
        return this._sequence(protoSql);
    }
    /** Representation of integers returned from the database. See {@link IntMode}.
     *
     * This value affects the results of all operations on this stream.
     */
    intMode;
}
exports.Stream = Stream;
