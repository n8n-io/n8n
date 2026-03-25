"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoNeedToReleaseEntityManagerError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when consumer tries to release entity manager that does not use single database connection.
 */
class NoNeedToReleaseEntityManagerError extends TypeORMError_1.TypeORMError {
    constructor() {
        super(`Entity manager is not using single database connection and cannot be released. ` +
            `Only entity managers created by connection#createEntityManagerWithSingleDatabaseConnection ` +
            `methods have a single database connection and they should be released.`);
    }
}
exports.NoNeedToReleaseEntityManagerError = NoNeedToReleaseEntityManagerError;

//# sourceMappingURL=NoNeedToReleaseEntityManagerError.js.map
