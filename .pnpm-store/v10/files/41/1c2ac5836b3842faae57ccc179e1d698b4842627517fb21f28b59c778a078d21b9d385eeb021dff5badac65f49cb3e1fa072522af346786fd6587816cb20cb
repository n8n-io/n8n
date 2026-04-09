"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stmtToProto = exports.Stmt = void 0;
const sql_js_1 = require("./sql.js");
const value_js_1 = require("./value.js");
/** A statement that can be evaluated by the database. Besides the SQL text, it also contains the positional
 * and named arguments. */
class Stmt {
    /** The SQL statement text. */
    sql;
    /** @private */
    _args;
    /** @private */
    _namedArgs;
    /** Initialize the statement with given SQL text. */
    constructor(sql) {
        this.sql = sql;
        this._args = [];
        this._namedArgs = new Map();
    }
    /** Binds positional parameters from the given `values`. All previous positional bindings are cleared. */
    bindIndexes(values) {
        this._args.length = 0;
        for (const value of values) {
            this._args.push((0, value_js_1.valueToProto)(value));
        }
        return this;
    }
    /** Binds a parameter by a 1-based index. */
    bindIndex(index, value) {
        if (index !== (index | 0) || index <= 0) {
            throw new RangeError("Index of a positional argument must be positive integer");
        }
        while (this._args.length < index) {
            this._args.push(null);
        }
        this._args[index - 1] = (0, value_js_1.valueToProto)(value);
        return this;
    }
    /** Binds a parameter by name. */
    bindName(name, value) {
        this._namedArgs.set(name, (0, value_js_1.valueToProto)(value));
        return this;
    }
    /** Clears all bindings. */
    unbindAll() {
        this._args.length = 0;
        this._namedArgs.clear();
        return this;
    }
}
exports.Stmt = Stmt;
function stmtToProto(sqlOwner, stmt, wantRows) {
    let inSql;
    let args = [];
    let namedArgs = [];
    if (stmt instanceof Stmt) {
        inSql = stmt.sql;
        args = stmt._args;
        for (const [name, value] of stmt._namedArgs.entries()) {
            namedArgs.push({ name, value });
        }
    }
    else if (Array.isArray(stmt)) {
        inSql = stmt[0];
        if (Array.isArray(stmt[1])) {
            args = stmt[1].map((arg) => (0, value_js_1.valueToProto)(arg));
        }
        else {
            namedArgs = Object.entries(stmt[1]).map(([name, value]) => {
                return { name, value: (0, value_js_1.valueToProto)(value) };
            });
        }
    }
    else {
        inSql = stmt;
    }
    const { sql, sqlId } = (0, sql_js_1.sqlToProto)(sqlOwner, inSql);
    return { sql, sqlId, args, namedArgs, wantRows };
}
exports.stmtToProto = stmtToProto;
