"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapHranaError = exports.resultSetFromHrana = exports.stmtToHrana = exports.executeHranaBatch = exports.HranaTransaction = void 0;
const hrana = __importStar(require("@libsql/hrana-client"));
const api_1 = require("@libsql/core/api");
const util_1 = require("@libsql/core/util");
class HranaTransaction {
    #mode;
    #version;
    // Promise that is resolved when the BEGIN statement completes, or `undefined` if we haven't executed the
    // BEGIN statement yet.
    #started;
    /** @private */
    constructor(mode, version) {
        this.#mode = mode;
        this.#version = version;
        this.#started = undefined;
    }
    execute(stmt) {
        return this.batch([stmt]).then((results) => results[0]);
    }
    async batch(stmts) {
        const stream = this._getStream();
        if (stream.closed) {
            throw new api_1.LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
        }
        try {
            const hranaStmts = stmts.map(stmtToHrana);
            let rowsPromises;
            if (this.#started === undefined) {
                // The transaction hasn't started yet, so we need to send the BEGIN statement in a batch with
                // `hranaStmts`.
                this._getSqlCache().apply(hranaStmts);
                const batch = stream.batch(this.#version >= 3);
                const beginStep = batch.step();
                const beginPromise = beginStep.run((0, util_1.transactionModeToBegin)(this.#mode));
                // Execute the `hranaStmts` only if the BEGIN succeeded, to make sure that we don't execute it
                // outside of a transaction.
                let lastStep = beginStep;
                rowsPromises = hranaStmts.map((hranaStmt) => {
                    const stmtStep = batch
                        .step()
                        .condition(hrana.BatchCond.ok(lastStep));
                    if (this.#version >= 3) {
                        // If the Hrana version supports it, make sure that we are still in a transaction
                        stmtStep.condition(hrana.BatchCond.not(hrana.BatchCond.isAutocommit(batch)));
                    }
                    const rowsPromise = stmtStep.query(hranaStmt);
                    rowsPromise.catch(() => undefined); // silence Node warning
                    lastStep = stmtStep;
                    return rowsPromise;
                });
                // `this.#started` is resolved successfully only if the batch and the BEGIN statement inside
                // of the batch are both successful.
                this.#started = batch
                    .execute()
                    .then(() => beginPromise)
                    .then(() => undefined);
                try {
                    await this.#started;
                }
                catch (e) {
                    // If the BEGIN failed, the transaction is unusable and we must close it. However, if the
                    // BEGIN suceeds and `hranaStmts` fail, the transaction is _not_ closed.
                    this.close();
                    throw e;
                }
            }
            else {
                if (this.#version < 3) {
                    // The transaction has started, so we must wait until the BEGIN statement completed to make
                    // sure that we don't execute `hranaStmts` outside of a transaction.
                    await this.#started;
                }
                else {
                    // The transaction has started, but we will use `hrana.BatchCond.isAutocommit()` to make
                    // sure that we don't execute `hranaStmts` outside of a transaction, so we don't have to
                    // wait for `this.#started`
                }
                this._getSqlCache().apply(hranaStmts);
                const batch = stream.batch(this.#version >= 3);
                let lastStep = undefined;
                rowsPromises = hranaStmts.map((hranaStmt) => {
                    const stmtStep = batch.step();
                    if (lastStep !== undefined) {
                        stmtStep.condition(hrana.BatchCond.ok(lastStep));
                    }
                    if (this.#version >= 3) {
                        stmtStep.condition(hrana.BatchCond.not(hrana.BatchCond.isAutocommit(batch)));
                    }
                    const rowsPromise = stmtStep.query(hranaStmt);
                    rowsPromise.catch(() => undefined); // silence Node warning
                    lastStep = stmtStep;
                    return rowsPromise;
                });
                await batch.execute();
            }
            const resultSets = [];
            for (let i = 0; i < rowsPromises.length; i++) {
                try {
                    const rows = await rowsPromises[i];
                    if (rows === undefined) {
                        throw new api_1.LibsqlBatchError("Statement in a transaction was not executed, " +
                            "probably because the transaction has been rolled back", i, "TRANSACTION_CLOSED");
                    }
                    resultSets.push(resultSetFromHrana(rows));
                }
                catch (e) {
                    if (e instanceof api_1.LibsqlBatchError) {
                        throw e;
                    }
                    // Map hrana errors to LibsqlError first, then wrap in LibsqlBatchError
                    const mappedError = mapHranaError(e);
                    if (mappedError instanceof api_1.LibsqlError) {
                        throw new api_1.LibsqlBatchError(mappedError.message, i, mappedError.code, mappedError.extendedCode, mappedError.rawCode, mappedError.cause instanceof Error
                            ? mappedError.cause
                            : undefined);
                    }
                    throw mappedError;
                }
            }
            return resultSets;
        }
        catch (e) {
            throw mapHranaError(e);
        }
    }
    async executeMultiple(sql) {
        const stream = this._getStream();
        if (stream.closed) {
            throw new api_1.LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
        }
        try {
            if (this.#started === undefined) {
                // If the transaction hasn't started yet, start it now
                this.#started = stream
                    .run((0, util_1.transactionModeToBegin)(this.#mode))
                    .then(() => undefined);
                try {
                    await this.#started;
                }
                catch (e) {
                    this.close();
                    throw e;
                }
            }
            else {
                // Wait until the transaction has started
                await this.#started;
            }
            await stream.sequence(sql);
        }
        catch (e) {
            throw mapHranaError(e);
        }
    }
    async rollback() {
        try {
            const stream = this._getStream();
            if (stream.closed) {
                return;
            }
            if (this.#started !== undefined) {
                // We don't have to wait for the BEGIN statement to complete. If the BEGIN fails, we will
                // execute a ROLLBACK outside of an active transaction, which should be harmless.
            }
            else {
                // We did nothing in the transaction, so there is nothing to rollback.
                return;
            }
            // Pipeline the ROLLBACK statement and the stream close.
            const promise = stream.run("ROLLBACK").catch((e) => {
                throw mapHranaError(e);
            });
            stream.closeGracefully();
            await promise;
        }
        catch (e) {
            throw mapHranaError(e);
        }
        finally {
            // `this.close()` may close the `hrana.Client`, which aborts all pending stream requests, so we
            // must call it _after_ we receive the ROLLBACK response.
            // Also note that the current stream should already be closed, but we need to call `this.close()`
            // anyway, because it may need to do more cleanup.
            this.close();
        }
    }
    async commit() {
        // (this method is analogous to `rollback()`)
        try {
            const stream = this._getStream();
            if (stream.closed) {
                throw new api_1.LibsqlError("Cannot commit the transaction because it is already closed", "TRANSACTION_CLOSED");
            }
            if (this.#started !== undefined) {
                // Make sure to execute the COMMIT only if the BEGIN was successful.
                await this.#started;
            }
            else {
                return;
            }
            const promise = stream.run("COMMIT").catch((e) => {
                throw mapHranaError(e);
            });
            stream.closeGracefully();
            await promise;
        }
        catch (e) {
            throw mapHranaError(e);
        }
        finally {
            this.close();
        }
    }
}
exports.HranaTransaction = HranaTransaction;
async function executeHranaBatch(mode, version, batch, hranaStmts, disableForeignKeys = false) {
    if (disableForeignKeys) {
        batch.step().run("PRAGMA foreign_keys=off");
    }
    const beginStep = batch.step();
    const beginPromise = beginStep.run((0, util_1.transactionModeToBegin)(mode));
    let lastStep = beginStep;
    const stmtPromises = hranaStmts.map((hranaStmt) => {
        const stmtStep = batch.step().condition(hrana.BatchCond.ok(lastStep));
        if (version >= 3) {
            stmtStep.condition(hrana.BatchCond.not(hrana.BatchCond.isAutocommit(batch)));
        }
        const stmtPromise = stmtStep.query(hranaStmt);
        lastStep = stmtStep;
        return stmtPromise;
    });
    const commitStep = batch.step().condition(hrana.BatchCond.ok(lastStep));
    if (version >= 3) {
        commitStep.condition(hrana.BatchCond.not(hrana.BatchCond.isAutocommit(batch)));
    }
    const commitPromise = commitStep.run("COMMIT");
    const rollbackStep = batch
        .step()
        .condition(hrana.BatchCond.not(hrana.BatchCond.ok(commitStep)));
    rollbackStep.run("ROLLBACK").catch((_) => undefined);
    if (disableForeignKeys) {
        batch.step().run("PRAGMA foreign_keys=on");
    }
    await batch.execute();
    const resultSets = [];
    await beginPromise;
    for (let i = 0; i < stmtPromises.length; i++) {
        try {
            const hranaRows = await stmtPromises[i];
            if (hranaRows === undefined) {
                throw new api_1.LibsqlBatchError("Statement in a batch was not executed, probably because the transaction has been rolled back", i, "TRANSACTION_CLOSED");
            }
            resultSets.push(resultSetFromHrana(hranaRows));
        }
        catch (e) {
            if (e instanceof api_1.LibsqlBatchError) {
                throw e;
            }
            // Map hrana errors to LibsqlError first, then wrap in LibsqlBatchError
            const mappedError = mapHranaError(e);
            if (mappedError instanceof api_1.LibsqlError) {
                throw new api_1.LibsqlBatchError(mappedError.message, i, mappedError.code, mappedError.extendedCode, mappedError.rawCode, mappedError.cause instanceof Error
                    ? mappedError.cause
                    : undefined);
            }
            throw mappedError;
        }
    }
    await commitPromise;
    return resultSets;
}
exports.executeHranaBatch = executeHranaBatch;
function stmtToHrana(stmt) {
    let sql;
    let args;
    if (Array.isArray(stmt)) {
        [sql, args] = stmt;
    }
    else if (typeof stmt === "string") {
        sql = stmt;
    }
    else {
        sql = stmt.sql;
        args = stmt.args;
    }
    const hranaStmt = new hrana.Stmt(sql);
    if (args) {
        if (Array.isArray(args)) {
            hranaStmt.bindIndexes(args);
        }
        else {
            for (const [key, value] of Object.entries(args)) {
                hranaStmt.bindName(key, value);
            }
        }
    }
    return hranaStmt;
}
exports.stmtToHrana = stmtToHrana;
function resultSetFromHrana(hranaRows) {
    const columns = hranaRows.columnNames.map((c) => c ?? "");
    const columnTypes = hranaRows.columnDecltypes.map((c) => c ?? "");
    const rows = hranaRows.rows;
    const rowsAffected = hranaRows.affectedRowCount;
    const lastInsertRowid = hranaRows.lastInsertRowid !== undefined
        ? hranaRows.lastInsertRowid
        : undefined;
    return new util_1.ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
}
exports.resultSetFromHrana = resultSetFromHrana;
function mapHranaError(e) {
    if (e instanceof hrana.ClientError) {
        const code = mapHranaErrorCode(e);
        // TODO: Parse extendedCode once the SQL over HTTP protocol supports it
        return new api_1.LibsqlError(e.message, code, undefined, undefined, e);
    }
    return e;
}
exports.mapHranaError = mapHranaError;
function mapHranaErrorCode(e) {
    if (e instanceof hrana.ResponseError && e.code !== undefined) {
        return e.code;
    }
    else if (e instanceof hrana.ProtoError) {
        return "HRANA_PROTO_ERROR";
    }
    else if (e instanceof hrana.ClosedError) {
        return e.cause instanceof hrana.ClientError
            ? mapHranaErrorCode(e.cause)
            : "HRANA_CLOSED_ERROR";
    }
    else if (e instanceof hrana.WebSocketError) {
        return "HRANA_WEBSOCKET_ERROR";
    }
    else if (e instanceof hrana.HttpServerError) {
        return "SERVER_ERROR";
    }
    else if (e instanceof hrana.ProtocolVersionError) {
        return "PROTOCOL_VERSION_ERROR";
    }
    else if (e instanceof hrana.InternalError) {
        return "INTERNAL_ERROR";
    }
    else {
        return "UNKNOWN";
    }
}
