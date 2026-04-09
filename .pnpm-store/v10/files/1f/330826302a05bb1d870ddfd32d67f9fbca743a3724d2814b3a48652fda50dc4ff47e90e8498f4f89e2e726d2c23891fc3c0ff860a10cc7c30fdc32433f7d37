import type * as proto from "./shared/proto.js";
import type { InSql, SqlOwner } from "./sql.js";
import type { InValue } from "./value.js";
/** A statement that you can send to the database. Statements are represented by the {@link Stmt} class, but
 * as a shorthand, you can specify an SQL text without arguments, or a tuple with the SQL text and positional
 * or named arguments.
 */
export type InStmt = Stmt | InSql | [InSql, InStmtArgs];
/** Arguments for a statement. Either an array that is bound to parameters by position, or an object with
* values that are bound to parameters by name. */
export type InStmtArgs = Array<InValue> | Record<string, InValue>;
/** A statement that can be evaluated by the database. Besides the SQL text, it also contains the positional
 * and named arguments. */
export declare class Stmt {
    /** The SQL statement text. */
    sql: InSql;
    /** @private */
    _args: Array<proto.Value>;
    /** @private */
    _namedArgs: Map<string, proto.Value>;
    /** Initialize the statement with given SQL text. */
    constructor(sql: InSql);
    /** Binds positional parameters from the given `values`. All previous positional bindings are cleared. */
    bindIndexes(values: Iterable<InValue>): this;
    /** Binds a parameter by a 1-based index. */
    bindIndex(index: number, value: InValue): this;
    /** Binds a parameter by name. */
    bindName(name: string, value: InValue): this;
    /** Clears all bindings. */
    unbindAll(): this;
}
export declare function stmtToProto(sqlOwner: SqlOwner, stmt: InStmt, wantRows: boolean): proto.Stmt;
