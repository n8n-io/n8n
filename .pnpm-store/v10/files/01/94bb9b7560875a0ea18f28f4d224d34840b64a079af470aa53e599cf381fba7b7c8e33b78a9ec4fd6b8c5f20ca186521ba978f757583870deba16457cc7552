"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CannotExecuteNotConnectedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when consumer tries to execute operation allowed only if connection is opened.
 */
class CannotExecuteNotConnectedError extends TypeORMError_1.TypeORMError {
    constructor(connectionName) {
        super(`Cannot execute operation on "${connectionName}" connection because connection is not yet established.`);
    }
}
exports.CannotExecuteNotConnectedError = CannotExecuteNotConnectedError;

//# sourceMappingURL=CannotExecuteNotConnectedError.js.map
