"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimisticLockVersionMismatchError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when a version check on an object that uses optimistic locking through a version field fails.
 */
class OptimisticLockVersionMismatchError extends TypeORMError_1.TypeORMError {
    constructor(entity, expectedVersion, actualVersion) {
        super(`The optimistic lock on entity ${entity} failed, version ${expectedVersion} was expected, but is actually ${actualVersion}.`);
    }
}
exports.OptimisticLockVersionMismatchError = OptimisticLockVersionMismatchError;

//# sourceMappingURL=OptimisticLockVersionMismatchError.js.map
