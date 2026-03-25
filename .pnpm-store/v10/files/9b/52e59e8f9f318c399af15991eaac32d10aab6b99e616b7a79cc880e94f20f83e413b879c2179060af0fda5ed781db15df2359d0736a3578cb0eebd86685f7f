"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomRepositoryNotFoundError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown if custom repository was not found.
 */
class CustomRepositoryNotFoundError extends TypeORMError_1.TypeORMError {
    constructor(repository) {
        super(`Custom repository ${typeof repository === "function"
            ? repository.name
            : repository.constructor.name} was not found. ` +
            `Did you forgot to put @EntityRepository decorator on it?`);
    }
}
exports.CustomRepositoryNotFoundError = CustomRepositoryNotFoundError;

//# sourceMappingURL=CustomRepositoryNotFoundError.js.map
