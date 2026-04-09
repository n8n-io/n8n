"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibsqlBatchError = exports.LibsqlError = void 0;
/** Error thrown by the client. */
class LibsqlError extends Error {
    /** Machine-readable error code. */
    code;
    /** Extended error code with more specific information (e.g., SQLITE_CONSTRAINT_PRIMARYKEY). */
    extendedCode;
    /** Raw numeric error code */
    rawCode;
    constructor(message, code, extendedCode, rawCode, cause) {
        if (code !== undefined) {
            message = `${code}: ${message}`;
        }
        super(message, { cause });
        this.code = code;
        this.extendedCode = extendedCode;
        this.rawCode = rawCode;
        this.name = "LibsqlError";
    }
}
exports.LibsqlError = LibsqlError;
/** Error thrown by the client during batch operations. */
class LibsqlBatchError extends LibsqlError {
    /** The zero-based index of the statement that failed in the batch. */
    statementIndex;
    constructor(message, statementIndex, code, extendedCode, rawCode, cause) {
        super(message, code, extendedCode, rawCode, cause);
        this.statementIndex = statementIndex;
        this.name = "LibsqlBatchError";
    }
}
exports.LibsqlBatchError = LibsqlBatchError;
