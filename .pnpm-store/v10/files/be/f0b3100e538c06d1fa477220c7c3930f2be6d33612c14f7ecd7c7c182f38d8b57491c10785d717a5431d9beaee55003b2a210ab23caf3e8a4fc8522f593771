"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionNotStartedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when transaction is not started yet and user tries to run commit or rollback.
 */
class TransactionNotStartedError extends TypeORMError_1.TypeORMError {
    constructor() {
        super(`Transaction is not started yet, start transaction before committing or rolling it back.`);
    }
}
exports.TransactionNotStartedError = TransactionNotStartedError;

//# sourceMappingURL=TransactionNotStartedError.js.map
