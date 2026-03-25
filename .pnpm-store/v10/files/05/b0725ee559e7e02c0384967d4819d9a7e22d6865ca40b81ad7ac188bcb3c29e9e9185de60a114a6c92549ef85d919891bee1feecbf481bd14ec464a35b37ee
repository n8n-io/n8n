"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CannotDetermineEntityError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when user tries to save/remove/etc. constructor-less object (object literal) instead of entity.
 */
class CannotDetermineEntityError extends TypeORMError_1.TypeORMError {
    constructor(operation) {
        super(`Cannot ${operation}, given value must be instance of entity class, ` +
            `instead object literal is given. Or you must specify an entity target to method call.`);
    }
}
exports.CannotDetermineEntityError = CannotDetermineEntityError;

//# sourceMappingURL=CannotDetermineEntityError.js.map
