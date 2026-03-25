"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturningStatementNotSupportedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when user tries to build a query with RETURNING / OUTPUT statement,
 * but used database does not support it.
 */
class ReturningStatementNotSupportedError extends TypeORMError_1.TypeORMError {
    constructor() {
        super(`OUTPUT or RETURNING clause only supported by Microsoft SQL Server or PostgreSQL or MariaDB databases.`);
    }
}
exports.ReturningStatementNotSupportedError = ReturningStatementNotSupportedError;

//# sourceMappingURL=ReturningStatementNotSupportedError.js.map
