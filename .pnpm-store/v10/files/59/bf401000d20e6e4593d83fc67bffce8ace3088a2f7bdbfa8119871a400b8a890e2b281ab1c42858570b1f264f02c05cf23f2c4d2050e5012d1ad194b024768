"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionIsNotSetError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when user tries to execute operation that requires connection to be established.
 */
class ConnectionIsNotSetError extends TypeORMError_1.TypeORMError {
    constructor(dbType) {
        super(`Connection with ${dbType} database is not established. Check connection configuration.`);
    }
}
exports.ConnectionIsNotSetError = ConnectionIsNotSetError;

//# sourceMappingURL=ConnectionIsNotSetError.js.map
