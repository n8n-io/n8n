"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionAlreadyStartedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when transaction is already started and user tries to run it again.
 */
class TransactionAlreadyStartedError extends TypeORMError_1.TypeORMError {
    constructor() {
        super(`Transaction already started for the given connection, commit current transaction before starting a new one.`);
    }
}
exports.TransactionAlreadyStartedError = TransactionAlreadyStartedError;

//# sourceMappingURL=TransactionAlreadyStartedError.js.map
