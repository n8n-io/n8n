"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoConnectionForRepositoryError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when consumer tries to access repository before connection is established.
 */
class NoConnectionForRepositoryError extends TypeORMError_1.TypeORMError {
    constructor(connectionName) {
        super(`Cannot get a Repository for "${connectionName} connection, because connection with the database ` +
            `is not established yet. Call connection#connect method to establish connection.`);
    }
}
exports.NoConnectionForRepositoryError = NoConnectionForRepositoryError;

//# sourceMappingURL=NoConnectionForRepositoryError.js.map
