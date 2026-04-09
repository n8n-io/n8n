"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlToProto = exports.Sql = void 0;
const errors_js_1 = require("./errors.js");
/** Text of an SQL statement cached on the server. */
class Sql {
    #owner;
    #sqlId;
    #closed;
    /** @private */
    constructor(owner, sqlId) {
        this.#owner = owner;
        this.#sqlId = sqlId;
        this.#closed = undefined;
    }
    /** @private */
    _getSqlId(owner) {
        if (this.#owner !== owner) {
            throw new errors_js_1.MisuseError("Attempted to use SQL text opened with other object");
        }
        else if (this.#closed !== undefined) {
            throw new errors_js_1.ClosedError("SQL text is closed", this.#closed);
        }
        return this.#sqlId;
    }
    /** Remove the SQL text from the server, releasing resouces. */
    close() {
        this._setClosed(new errors_js_1.ClientError("SQL text was manually closed"));
    }
    /** @private */
    _setClosed(error) {
        if (this.#closed === undefined) {
            this.#closed = error;
            this.#owner._closeSql(this.#sqlId);
        }
    }
    /** True if the SQL text is closed (removed from the server). */
    get closed() {
        return this.#closed !== undefined;
    }
}
exports.Sql = Sql;
function sqlToProto(owner, sql) {
    if (sql instanceof Sql) {
        return { sqlId: sql._getSqlId(owner) };
    }
    else {
        return { sql: "" + sql };
    }
}
exports.sqlToProto = sqlToProto;
