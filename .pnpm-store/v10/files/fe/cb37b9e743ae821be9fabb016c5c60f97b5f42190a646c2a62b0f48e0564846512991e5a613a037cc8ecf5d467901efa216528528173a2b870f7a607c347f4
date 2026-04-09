import { Batch } from "./batch.js";
import { describeResultFromProto } from "./describe.js";
import { stmtResultFromProto, rowsResultFromProto, rowResultFromProto, valueResultFromProto, } from "./result.js";
import { sqlToProto } from "./sql.js";
import { stmtToProto } from "./stmt.js";
/** A stream for executing SQL statements (a "database connection"). */
export class Stream {
    /** @private */
    constructor(intMode) {
        this.intMode = intMode;
    }
    /** Execute a statement and return rows. */
    query(stmt) {
        return this.#execute(stmt, true, rowsResultFromProto);
    }
    /** Execute a statement and return at most a single row. */
    queryRow(stmt) {
        return this.#execute(stmt, true, rowResultFromProto);
    }
    /** Execute a statement and return at most a single value. */
    queryValue(stmt) {
        return this.#execute(stmt, true, valueResultFromProto);
    }
    /** Execute a statement without returning rows. */
    run(stmt) {
        return this.#execute(stmt, false, stmtResultFromProto);
    }
    #execute(inStmt, wantRows, fromProto) {
        const stmt = stmtToProto(this._sqlOwner(), inStmt, wantRows);
        return this._execute(stmt).then((r) => fromProto(r, this.intMode));
    }
    /** Return a builder for creating and executing a batch.
     *
     * If `useCursor` is true, the batch will be executed using a Hrana cursor, which will stream results from
     * the server to the client, which consumes less memory on the server. This requires protocol version 3 or
     * higher.
     */
    batch(useCursor = false) {
        return new Batch(this, useCursor);
    }
    /** Parse and analyze a statement. This requires protocol version 2 or higher. */
    describe(inSql) {
        const protoSql = sqlToProto(this._sqlOwner(), inSql);
        return this._describe(protoSql).then(describeResultFromProto);
    }
    /** Execute a sequence of statements separated by semicolons. This requires protocol version 2 or higher.
     * */
    sequence(inSql) {
        const protoSql = sqlToProto(this._sqlOwner(), inSql);
        return this._sequence(protoSql);
    }
    /** Representation of integers returned from the database. See {@link IntMode}.
     *
     * This value affects the results of all operations on this stream.
     */
    intMode;
}
