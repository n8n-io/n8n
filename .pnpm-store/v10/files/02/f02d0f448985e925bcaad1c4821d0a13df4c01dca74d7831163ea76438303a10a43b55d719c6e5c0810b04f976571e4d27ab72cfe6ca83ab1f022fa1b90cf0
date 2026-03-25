"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MustBeEntityError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when method expects entity but instead something else is given.
 */
class MustBeEntityError extends TypeORMError_1.TypeORMError {
    constructor(operation, wrongValue) {
        super(`Cannot ${operation}, given value must be an entity, instead "${wrongValue}" is given.`);
    }
}
exports.MustBeEntityError = MustBeEntityError;

//# sourceMappingURL=MustBeEntityError.js.map
